"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    getDocs,
    query,
} from "firebase/firestore";

export type UserRole = "dean" | "king" | "user";

export interface UserProfile {
    name: string;
    role: UserRole;
    registered: boolean;
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
                if (storedName) {
                    const userDoc = await getDoc(doc(db, "users", storedName));
                    if (userDoc.exists()) {
                        setUser(userDoc.data() as UserProfile);
                    }
                }

                // Count registered users
                const usersSnap = await getDocs(collection(db, "users"));
                setRegisteredNamesCount(usersSnap.size);
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
        if (userData.password !== password) {
            throw new Error("كلمة المرور خاطئة");
        }

        // Omit password from state
        const profile: UserProfile = {
            name: userData.name,
            role: userData.role,
            registered: userData.registered
        };

        setUser(profile);
        localStorage.setItem("king_user_name", name);
    };

    const register = async (name: string, password: string) => {
        if (!VALID_NAMES.includes(name)) throw new Error("اسم غير مصرح به");

        const userRef = doc(db, "users", name);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            throw new Error("المستخدم مسجل مسبقاً");
        }

        // "شوكا" is the Dean
        const role: UserRole = name === "شوكا" ? "dean" : "user";

        const newUser = {
            name,
            password, // Note: In a real app we'd hash this, but we'll use plaintext here for simplicity as requested by the user's specific secret code model.
            role,
            registered: true
        };

        await setDoc(userRef, newUser);

        // Omit password from state
        const profile: UserProfile = {
            name: newUser.name,
            role: newUser.role,
            registered: newUser.registered
        };

        setUser(profile);
        localStorage.setItem("king_user_name", name);
        setRegisteredNamesCount(prev => prev + 1);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("king_user_name");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, registeredNamesCount }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
