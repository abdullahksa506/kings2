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
    nickName?: string;
    profileImage?: string | null;
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (name: string, password: string, skipDeviceCheck?: boolean) => Promise<void>;
    register: (name: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUserProfile: () => Promise<void>;
    registeredNamesCount: number;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const VALID_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [registeredNamesCount, setRegisteredNamesCount] = useState(0);

    const refreshUserProfile = async () => {
        const storedName = localStorage.getItem("king_user_name");
        if (!storedName) return;
        const userDoc = await getDoc(doc(db, "users", storedName));
        if (!userDoc.exists()) return;
        const data = userDoc.data() as Record<string, unknown>;
        setUser({
            name: typeof data.name === "string" ? data.name : storedName,
            role: (data.role as UserRole) || "user",
            registered: Boolean(data.registered),
            phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : undefined,
            nickName: typeof data.nickName === "string" ? data.nickName : undefined,
            profileImage: typeof data.profileImage === "string" ? data.profileImage : null,
        });
    };

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
                        const dbPass = typeof data.password === "string" ? data.password : "";
                        const tokenMatch =
                            dbPass === storedToken ||
                            (isHashed(dbPass) &&
                                isHashed(storedToken) &&
                                dbPass.toLowerCase() === storedToken.toLowerCase());
                        if (tokenMatch) {
                            // RPC يقارن التوكن مع كلمة المرور في DB حرفياً — نوحّد التخزين إن اختلف الحرف الكبير/الصغير في الهاش
                            if (isHashed(dbPass) && isHashed(storedToken) && dbPass !== storedToken) {
                                localStorage.setItem("king_user_token", dbPass);
                            }
                            const profile: UserProfile = {
                                name: data.name,
                                role: data.role,
                                registered: data.registered,
                                phoneNumber: data.phoneNumber,
                                nickName: data.nickName,
                                profileImage: data.profileImage || null,
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

    const login = async (name: string, password: string, skipDeviceCheck = false) => {
        if (!VALID_NAMES.includes(name)) throw new Error("اسم غير مصرح به");

        const userRef = doc(db, "users", name);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error("المستخدم غير مسجل بعد");
        }

        const raw = userDoc.data() as Record<string, unknown>;
        const storedPassword = typeof raw.password === "string" ? raw.password : "";
        const userData = { ...raw, password: storedPassword } as {
            name: string;
            role: UserRole;
            registered: boolean;
            phoneNumber?: string;
            password: string;
        };

        let valid = false;

        if (!storedPassword) {
            throw new Error("بيانات الحساب ناقصة. تواصل مع العميد.");
        }

        if (isHashed(storedPassword)) {
            const hashedInput = await hashPassword(password);
            if (storedPassword.toLowerCase() === hashedInput.toLowerCase()) {
                valid = true;
            }
        } else {
            if (storedPassword === password) {
                valid = true;
                const newHash = await invokeRpc("login_upgrade", { userName: name, password });
                userData.password = typeof newHash === "string" ? newHash : await hashPassword(password);
            }
        }

        if (!valid) {
            throw new Error("كلمة المرور غير صحيحة");
        }

        // Omit password from state
        const profile: UserProfile = {
            name: userData.name,
            role: userData.role,
            registered: userData.registered,
            phoneNumber: userData.phoneNumber,
            nickName: typeof raw.nickName === "string" ? raw.nickName : undefined,
            profileImage: typeof raw.profileImage === "string" ? raw.profileImage : null,
        };

        const tokenToStore = isHashed(userData.password)
            ? userData.password
            : await hashPassword(password);

        setUser(profile);
        localStorage.setItem("king_user_name", name);
        localStorage.setItem("king_user_token", tokenToStore);
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
            nickName: result.nickName,
            profileImage: result.profileImage || null,
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

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUserProfile, registeredNamesCount }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
