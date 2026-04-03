"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Shield, Bell, Send, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Smartphone, Globe, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { services, VALID_NAMES } from "@/lib/services";
import Link from "next/link";

export default function NotificationsTestPanel() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [usersData, setUsersData] = useState<any[]>([]);
    const [testStatuses, setTestStatuses] = useState<Record<string, { loading: boolean, success?: boolean, error?: string }>>({});
    const [refreshing, setRefreshing] = useState(false);

    const getReminderAuthHeaders = (): Record<string, string> => {
        const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
        const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
        return {
            "Content-Type": "application/json",
            "x-user-name": encodeURIComponent(name),
            "x-user-token": token,
        };
    };

    // Auth guard
    useEffect(() => {
        if (!authLoading && (!user || user.role !== "dean")) {
            router.push("/");
        }
    }, [user, authLoading, router]);

    const fetchUsers = async () => {
        try {
            const allUsers = await services.getAllUsers();
            setUsersData(allUsers);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRefreshAll = async () => {
        setRefreshing(true);
        await fetchUsers();
        setRefreshing(false);
    };

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
            const name = localStorage.getItem("king_user_name") || "";
            const token = localStorage.getItem("king_user_token") || "";
            const res = await fetch("/api/reminders/test-push-user", {
                method: "POST",
                headers: getReminderAuthHeaders(),
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

        // Clear success status after 5 seconds
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

    // Stats
    const registeredUsers = usersData.filter(u => VALID_NAMES.includes(u.name || u.id));
    const withPush = registeredUsers.filter(u => !!u.pushSubscription);
    const withStandalone = registeredUsers.filter(u => u.isStandalone === true);

    // Detect subscription details
    const getSubInfo = (userData: any) => {
        if (!userData?.pushSubscription) return null;
        try {
            const sub = JSON.parse(userData.pushSubscription);
            const endpoint = sub.endpoint || "";
            let platform = "غير معروف";
            if (endpoint.includes("fcm.googleapis.com") || endpoint.includes("firebase")) {
                platform = "Android / Chrome";
            } else if (endpoint.includes("mozilla.com") || endpoint.includes("autopush")) {
                platform = "Firefox";
            } else if (endpoint.includes("windows.com") || endpoint.includes("wns")) {
                platform = "Windows";
            } else if (endpoint.includes("apple.com") || endpoint.includes("web.push.apple")) {
                platform = "iOS Safari";
            } else if (endpoint.includes("push.services")) {
                platform = "iOS / macOS";
            }

            // Check expiration
            const expirationTime = sub.expirationTime;
            let isExpired = false;
            if (expirationTime && expirationTime < Date.now()) {
                isExpired = true;
            }

            return { platform, isExpired, endpoint: endpoint.substring(0, 60) + "..." };
        } catch {
            return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-300">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <Shield className="w-8 h-8 text-amber-500" />
                    <div>
                        <h1 className="text-2xl font-bold text-amber-500">لوحة إدارة الإشعارات</h1>
                        <p className="text-sm text-slate-500">حالة شاملة لكل عضو واختبار الإرسال</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefreshAll}
                        disabled={refreshing}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 py-2 px-4 rounded-xl flex items-center gap-2 transition-colors border border-slate-700"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        تحديث البيانات
                    </button>
                    <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-slate-300 py-2 px-4 rounded-xl flex items-center gap-2 transition-colors border border-slate-700">
                        <ArrowLeft className="w-4 h-4" />
                        العودة
                    </Link>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 max-w-4xl mx-auto mb-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{registeredUsers.length}/{VALID_NAMES.length}</p>
                    <p className="text-xs text-slate-500 mt-1">مسجلين</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-sky-400">{withPush.length}/{VALID_NAMES.length}</p>
                    <p className="text-xs text-slate-500 mt-1">مفعلين الإشعارات</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{withStandalone.length}/{VALID_NAMES.length}</p>
                    <p className="text-xs text-slate-500 mt-1">ثبتوا التطبيق</p>
                </div>
            </div>

            {/* Users List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-6 text-sky-400">
                    <Bell className="w-6 h-6" />
                    <h2 className="text-xl font-bold">حالة الإشعارات لكل عضو</h2>
                </div>

                <div className="space-y-3">
                    {VALID_NAMES.map(name => {
                        const userData = usersData.find(u => (u.name === name || u.id === name));
                        const isRegistered = !!userData;
                        const hasPushSub = isRegistered && !!userData.pushSubscription;
                        const isStandalone = isRegistered && userData.isStandalone === true;
                        const subInfo = userData ? getSubInfo(userData) : null;
                        const status = testStatuses[name];

                        return (
                            <div key={name} className={`rounded-xl border p-4 ${
                                !isRegistered ? 'border-slate-800 bg-slate-950/30' :
                                hasPushSub ? 'border-sky-800/30 bg-slate-950/50' :
                                'border-red-800/30 bg-red-950/10'
                            }`}>
                                {/* Top Row: Name + Badges */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="text-lg font-bold text-slate-200 ml-2">{name}</span>
                                    
                                    {/* Registration */}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isRegistered ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                        {isRegistered ? "مسجل ✓" : "غير مسجل ✗"}
                                    </span>

                                    {/* PWA */}
                                    {isRegistered && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${isStandalone ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>
                                            {isStandalone ? <><Smartphone className="w-3 h-3" /> تطبيق</> : <><Globe className="w-3 h-3" /> متصفح</>}
                                        </span>
                                    )}

                                    {/* Push Status */}
                                    {isRegistered && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                            hasPushSub 
                                                ? (subInfo?.isExpired ? "bg-yellow-500/20 text-yellow-400" : "bg-sky-500/20 text-sky-400")
                                                : "bg-red-500/20 text-red-400"
                                        }`}>
                                            {hasPushSub ? (
                                                subInfo?.isExpired 
                                                    ? <><AlertTriangle className="w-3 h-3" /> اشتراك منتهي</>
                                                    : <><Wifi className="w-3 h-3" /> إشعارات مفعلة</>
                                            ) : (
                                                <><WifiOff className="w-3 h-3" /> إشعارات معطلة</>
                                            )}
                                        </span>
                                    )}
                                </div>

                                {/* Details Row */}
                                {isRegistered && (
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="text-xs text-slate-600 space-y-1">
                                            {hasPushSub && subInfo && (
                                                <>
                                                    <p>المنصة: <span className="text-slate-400">{subInfo.platform}</span></p>
                                                </>
                                            )}
                                            {!hasPushSub && (
                                                <p className="text-red-400/70">⚠️ هذا العضو لم يفعل الإشعارات من جهازه أو أوقفها من الإعدادات</p>
                                            )}
                                        </div>

                                        {/* Test Button + Status */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            {status?.success && (
                                                <span className="text-emerald-400 text-xs flex items-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4" /> تم الإرسال بنجاح ✓
                                                </span>
                                            )}
                                            {status?.error && (
                                                <span className="text-red-400 text-xs flex items-center gap-1 max-w-[200px]" title={status.error}>
                                                    <XCircle className="w-4 h-4 shrink-0" />
                                                    <span className="truncate">{status.error}</span>
                                                </span>
                                            )}
                                            
                                            <button
                                                onClick={() => handleTestNotification(name)}
                                                disabled={!hasPushSub || status?.loading}
                                                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-500 font-medium py-2 px-4 rounded-xl flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                                                title={!isRegistered ? "المستخدم غير مسجل" : !hasPushSub ? "المستخدم لم يفعل الإشعارات" : "اختبار إرسال إشعار"}
                                            >
                                                {status?.loading ? (
                                                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                تجربة
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Not registered info */}
                                {!isRegistered && (
                                    <p className="text-xs text-slate-600">هذا العضو لم يسجل حسابه بعد في التطبيق</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <p className="text-xs font-semibold text-slate-500 mb-2">دليل الحالات:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2"><Wifi className="w-3 h-3 text-sky-400" /> إشعارات مفعلة - كل شي تمام</div>
                        <div className="flex items-center gap-2"><WifiOff className="w-3 h-3 text-red-400" /> إشعارات معطلة - ما فعلها أو أوقفها</div>
                        <div className="flex items-center gap-2"><AlertTriangle className="w-3 h-3 text-yellow-400" /> اشتراك منتهي - يحتاج يجدد من المزيد</div>
                        <div className="flex items-center gap-2"><Smartphone className="w-3 h-3 text-emerald-400" /> مثبت كتطبيق (PWA)</div>
                        <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-slate-400" /> يستخدم المتصفح فقط</div>
                        <div className="flex items-center gap-2"><XCircle className="w-3 h-3 text-red-400" /> فشل الإرسال - الاشتراك غير صالح</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
