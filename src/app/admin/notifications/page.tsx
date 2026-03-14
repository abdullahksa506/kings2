"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Shield, Bell, Send, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { services, VALID_NAMES } from "@/lib/services";
import Link from "next/link";

export default function NotificationsTestPanel() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [usersData, setUsersData] = useState<any[]>([]);
    const [testStatuses, setTestStatuses] = useState<Record<string, { loading: boolean, success?: boolean, error?: string }>>({});

    // Auth guard
    useEffect(() => {
        if (!authLoading && (!user || user.role !== "dean")) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const allUsers = await services.getAllUsers();
                setUsersData(allUsers);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };
        fetchUsers();
    }, []);

    if (authLoading || !user || user.role !== "dean") {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    const handleTestNotification = async (userName: string) => {
        setTestStatuses(prev => ({
            ...prev,
            [userName]: { loading: true }
        }));

        try {
            const res = await fetch("/api/reminders/test-push-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userName }),
            });
            const data = await res.json();

            if (data.success) {
                setTestStatuses(prev => ({
                    ...prev,
                    [userName]: { loading: false, success: true }
                }));
            } else {
                setTestStatuses(prev => ({
                    ...prev,
                    [userName]: { loading: false, error: data.error || "خطأ غير معروف" }
                }));
            }
        } catch (e: any) {
            setTestStatuses(prev => ({
                ...prev,
                [userName]: { loading: false, error: e.message || "فشل الاتصال بالخادم" }
            }));
        }

        // Clear status after 3 seconds if success
        setTimeout(() => {
            setTestStatuses(prev => {
                if (prev[userName]?.success) {
                    const next = { ...prev };
                    delete next[userName];
                    return next;
                }
                return prev;
            });
        }, 5000);
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-300">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-amber-500">لوحة اختبار الإشعارات (للعميد فقط)</h1>
                        <p className="text-sm text-slate-500">منطقة مخصصة للعميد لاختبار وصول الإشعارات لكل عضو</p>
                    </div>
                </div>
                <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-slate-300 py-2 px-4 rounded-xl flex items-center gap-2 transition-colors border border-slate-700 w-fit">
                    <ArrowLeft className="w-4 h-4" />
                    العودة للرئيسية
                </Link>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-6 text-sky-400">
                    <Bell className="w-6 h-6" />
                    <h2 className="text-xl font-bold">قائمة الأعضاء وحالة الإشعارات</h2>
                </div>

                <div className="space-y-3">
                    {VALID_NAMES.map(name => {
                        const userData = usersData.find(u => (u.name === name || u.id === name));
                        const isRegistered = !!userData;
                        const hasPushSub = isRegistered && !!userData.pushSubscription;
                        const status = testStatuses[name];

                        return (
                            <div key={name} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/50 gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-medium text-slate-200 min-w-32">{name}</span>
                                    <div className="flex gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${isRegistered ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                                            {isRegistered ? "مسجل" : "غير مسجل"}
                                        </span>
                                        {isRegistered && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${hasPushSub ? "bg-sky-500/20 text-sky-400" : "bg-red-500/20 text-red-400"}`}>
                                                {hasPushSub ? "مفعل الإشعارات" : "غير مفعل الإشعارات"}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {status?.success && (
                                        <span className="text-emerald-400 text-sm flex items-center gap-1 animate-pulse">
                                            <CheckCircle2 className="w-4 h-4" /> تم الإرسال
                                        </span>
                                    )}
                                    {status?.error && (
                                        <span className="text-red-400 text-sm flex items-center gap-1 max-w-xs truncate" title={status.error}>
                                            <AlertTriangle className="w-4 h-4" /> {status.error}
                                        </span>
                                    )}
                                    
                                    <button
                                        onClick={() => handleTestNotification(name)}
                                        disabled={!hasPushSub || status?.loading}
                                        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-500 font-medium py-2 px-4 rounded-xl flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={!isRegistered ? "المستخدم غير مسجل" : !hasPushSub ? "المستخدم لم يفعل الإشعارات من جهازه" : "اختبار إرسال إشعار"}
                                    >
                                        {status?.loading ? (
                                            <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        تجربة الإشعار
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
