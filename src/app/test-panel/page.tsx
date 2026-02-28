"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Shield, Bell, Send, CheckCircle, Bug, Gamepad2, ArrowLeft, RefreshCw } from "lucide-react";
import { services, VALID_NAMES } from "@/lib/services";
import HungryKingsArena from "@/components/HungryKingsArena";
import Link from "next/link";

export default function TestPanel() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isGameOpen, setIsGameOpen] = useState(false);
    const [output, setOutput] = useState<string[]>([]);

    // Auth guard
    useEffect(() => {
        if (!authLoading && (!user || user.role !== "dean")) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    const log = (msg: string) => {
        setOutput(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    if (authLoading || !user || user.role !== "dean") {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    const testPushNotification = async (endpoint: string, label: string) => {
        setLoading(true);
        log(`Testing: ${label}...`);
        try {
            const res = await fetch(endpoint, { method: "POST" });
            const data = await res.json();
            log(`Success (${label}): ${data.message || 'Sent'}`);
        } catch (e: any) {
            log(`Error (${label}): ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-300">
            <header className="mb-8 flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-amber-500">لوحة تحكم العميد - بيئة الاختبار</h1>
                        <p className="text-sm text-slate-500">منطقة مخصصة لاختبار وظائف النظام</p>
                    </div>
                </div>
                <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-slate-300 py-2 px-4 rounded-xl flex items-center gap-2 transition-colors border border-slate-700">
                    <ArrowLeft className="w-4 h-4" />
                    العودة للرئيسية
                </Link>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Test Controls */}
                <div className="space-y-6">
                    {/* Notifications Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-sky-400 mb-4 flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            اختبار الإشعارات (Push Notifications)
                        </h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => testPushNotification("/api/reminders/test-push", "إشعار تجريبي")}
                                disabled={loading}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-3 px-4 rounded-xl flex items-center justify-between transition-colors disabled:opacity-50"
                            >
                                <span>إرسال إشعار تجريبي للجميع</span>
                                <Send className="w-4 h-4 text-sky-400" />
                            </button>
                            {/* Note: In a real test we might want to pass a mock weekId, but these hit actual endpoints. We'll just call the basic push for now to avoid crashing endpoints expecting bodies. */}
                            <p className="text-xs text-slate-500 mt-2">
                                ملاحظة: إشعارات التذكير المحددة (للملك، للتقييم) تتطلب (weekId) للعمل، لذلك الأفضل اختبارها من لوحة العميد في الصفحة الرئيسية.
                            </p>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                            <Bug className="w-5 h-5" />
                            اختبار الميزات
                        </h2>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    log("Launching Minigame...");
                                    setIsGameOpen(true);
                                }}
                                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-3 px-4 rounded-xl flex items-center justify-between transition-colors"
                            >
                                <span>تشغيل اللعبة المصغرة (صراع الملوك)</span>
                                <Gamepad2 className="w-4 h-4 text-amber-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Output Console */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                        <h3 className="font-mono text-sm text-slate-400">سجل الاختبارات (Console)</h3>
                        <button onClick={() => setOutput([])} className="text-xs text-slate-500 hover:text-slate-300">مسح السجل</button>
                    </div>
                    <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2">
                        {output.length === 0 ? (
                            <p className="text-slate-600 italic text-center mt-10">لا توجد عمليات حالياً...</p>
                        ) : (
                            output.map((msg, i) => (
                                <div key={i} className={`p-2 rounded ${msg.includes("Error") ? "bg-red-500/10 text-red-400" : msg.includes("Success") ? "bg-emerald-500/10 text-emerald-400" : "text-slate-300"}`}>
                                    {msg}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Render Game Modal for testing */}
            <HungryKingsArena
                isOpen={isGameOpen}
                onClose={() => setIsGameOpen(false)}
                userName={user.name!}
            />
        </div>
    );
}
