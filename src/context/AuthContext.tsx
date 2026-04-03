"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
    showProfileImage?: boolean;
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
        try {
            const data = await invokeRpc("getMyProfile");
            if (!data) return;
            setUser({
                name: typeof data.name === "string" ? data.name : storedName,
                role: (data.role as UserRole) || "user",
                registered: Boolean(data.registered),
                phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : undefined,
                nickName: typeof data.nickName === "string" ? data.nickName : undefined,
                profileImage: typeof data.profileImage === "string" ? data.profileImage : null,
                showProfileImage: typeof data.showProfileImage === "boolean" ? data.showProfileImage : true,
            });
        } catch {
            localStorage.removeItem("king_user_name");
            localStorage.removeItem("king_user_token");
            setUser(null);
        }
    };

    // Check Local Storage and Fetch Count
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedName = localStorage.getItem("king_user_name");
                const storedToken = localStorage.getItem("king_user_token");
                if (storedName && storedToken) {
                    try {
                        const result = await invokeRpc("validateSession");
                        const profile = result?.profile;
                        const normalizedToken = result?.token;
                        if (profile) {
                            setUser(profile);
                            if (typeof normalizedToken === "string" && normalizedToken) {
                                localStorage.setItem("king_user_token", normalizedToken);
                            }
                        } else {
                            localStorage.removeItem("king_user_name");
                            localStorage.removeItem("king_user_token");
                        }
                    } catch {
                        localStorage.removeItem("king_user_name");
                        localStorage.removeItem("king_user_token");
                    }
                }

                const count = await invokeRpc("getRegisteredNamesCount");
                setRegisteredNamesCount(typeof count === "number" ? count : 0);
            } catch (error) {
                console.error("Auth init error:", error);
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (name: string, password: string, _skipDeviceCheck = false) => {
        if (!VALID_NAMES.includes(name)) throw new Error("اسم غير مصرح به");

        const result = await invokeRpc("login", { name, password });
        const profile = result?.profile as UserProfile | undefined;
        const tokenToStore = typeof result?.token === "string" ? result.token : "";
        if (!profile || !tokenToStore) throw new Error("فشل تسجيل الدخول");

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
            showProfileImage: typeof result.showProfileImage === "boolean" ? result.showProfileImage : true,
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
