"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    getCountFromServer,
} from "firebase/firestore";
import { hashPassword, isHashed } from "@/lib/hash";
import { invokeRpc } from "@/lib/services";

export type UserRole = "dean" | "king" | "user";

export interface UserProfile {
    name: string;
    role: UserRole;
    registered: boolean;
    phoneNumber?: string;
    resetCode?: string;
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (name: string, password: string) => Promise<void>;
    register: (name: string, password: string) => Promise<void>;
    logout: () => void;
    registeredNamesCount: number;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const VALID_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [registeredNamesCount, setRegisteredNamesCount] = useState(0);

    // Check Local Storage and Fetch Count
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedName = localStorage.getItem("king_user_name");
                const storedToken = localStorage.getItem("king_user_token");
                if (storedName && storedToken) {
                    const userDoc = await getDoc(doc(db, "users", storedName));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        // Dean Device Check
                        if (storedName === "شوكا") {
                            const deviceId = localStorage.getItem("dean_device_id");
                            const trustedDevices = data.trustedDevices || [];
                            const isTrusted = trustedDevices.some((d: any) => d.id === deviceId);
                            if (!isTrusted) {
                                localStorage.removeItem("king_user_name");
                                localStorage.removeItem("king_user_token");
                                setLoading(false);
                                return;
                            }
                        }

                        if (data.password === storedToken) {
                            const profile: UserProfile = {
                                name: data.name,
                                role: data.role,
                                registered: data.registered,
                                phoneNumber: data.phoneNumber
                            };
                            setUser(profile);
                        } else {
                            // Invalid token, clear storage
                            localStorage.removeItem("king_user_name");
                            localStorage.removeItem("king_user_token");
                        }
                    }
                }

                // Count registered users securely without fetching all documents
                const snapshot = await getCountFromServer(collection(db, "users"));
                setRegisteredNamesCount(snapshot.data().count);
            } catch (error) {
                console.error("Auth init error:", error);
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (name: string, password: string) => {
        if (!VALID_NAMES.includes(name)) throw new Error("اسم غير مصرح به");

        const userRef = doc(db, "users", name);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error("المستخدم غير مسجل بعد");
        }

        const userData = userDoc.data();
        let valid = false;

        if (isHashed(userData.password)) {
            // Check hash
            const hashedInput = await hashPassword(password);
            if (userData.password === hashedInput) {
                valid = true;
            }
        } else {
            // Auto-upgrade plain-text passwords
            if (userData.password === password) {
                valid = true;
                // Background upgrade to hash
                const newHash = await invokeRpc("login_upgrade", { userName: name, password });
                userData.password = newHash;
            }
        }

        if (!valid) {
            throw new Error("كلمة المرور خاطئة");
        }

        if (name === "شوكا") {
            let deviceId = localStorage.getItem("dean_device_id");
            if (!deviceId) {
                deviceId = "dev_" + Math.random().toString(36).substring(2, 15);
                localStorage.setItem("dean_device_id", deviceId);
            }
            const trustedDevices = userData.trustedDevices || [];
            const isTrusted = trustedDevices.some((d: any) => d.id === deviceId);
            if (!isTrusted) {
                throw new Error("not_trusted_device");
            }
        }

        // Omit password from state
        const profile: UserProfile = {
            name: userData.name,
            role: userData.role,
            registered: userData.registered,
            phoneNumber: userData.phoneNumber
        };

        setUser(profile);
        localStorage.setItem("king_user_name", name);
        localStorage.setItem("king_user_token", isHashed(userData.password) ? userData.password : await hashPassword(password));
    };

    const register = async (name: string, password: string) => {
        if (!VALID_NAMES.includes(name)) throw new Error("اسم غير مصرح به");

        const result = await invokeRpc("register", { name, password });
        if (!result) throw new Error("فشل التسجيل");

        // Omit password from state
        const profile: UserProfile = {
            name: result.name,
            role: result.role,
            registered: result.registered,
        };

        setUser(profile);
        localStorage.setItem("king_user_name", name);
        localStorage.setItem("king_user_token", result.token);
        setRegisteredNamesCount(prev => prev + 1);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("king_user_name");
        localStorage.removeItem("king_user_token");
    };

    // 5-second periodic check for Dean's device
    useEffect(() => {
        if (user?.role === "dean") {
            const interval = setInterval(async () => {
                try {
                    const deviceId = localStorage.getItem("dean_device_id");
                    if (!deviceId) return;
                    
                    const userDoc = await getDoc(doc(db, "users", "شوكا"));
                    if (userDoc.exists()) {
                        const trustedDevices = userDoc.data().trustedDevices || [];
                        const isTrusted = trustedDevices.some((d: any) => d.id === deviceId);
                        if (!isTrusted) {
                            logout();
                            alert("تم سحب صلاحية جهازك وإيقاف الدخول من قبل النظام.");
                        }
                    }
                } catch (e) {
                    console.error("Device check error", e);
                }
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, registeredNamesCount }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
