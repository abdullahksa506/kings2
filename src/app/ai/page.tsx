"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const KingAIBrain = dynamic(() => import("@/components/KingAIBrain"), { ssr: false });

export default function AIPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Redirect to home if not logged in
    useEffect(() => {
        if (!loading && !user) router.replace("/");
    }, [loading, user, router]);

    const getAuthHeaders = (): Record<string, string> => {
        const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
        const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
        return {
            "Content-Type": "application/json",
            "x-user-name": encodeURIComponent(name),
            "x-user-token": token,
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <main className="min-h-screen bg-slate-950" dir="rtl">
            {/* Sticky page header with back button */}
            <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 pt-safe">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.push("/")}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 active:scale-90 transition-all"
                        aria-label="رجوع"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <h1 className="text-base font-bold text-white">King AI Brain</h1>
                </div>
            </header>

            <div className="px-4 pt-5">
                <KingAIBrain userName={user.name} getAuthHeaders={getAuthHeaders} />
            </div>
        </main>
    );
}
