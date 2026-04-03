"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff, Send, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface LogEntry {
    timestamp: string;
    type: "info" | "success" | "error" | "debug";
    message: string;
    details?: any;
}

export default function NotificationsDebugPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [testing, setTesting] = useState(false);
    const [subscriptionStatus, setSubscriptionStatus] = useState<{
        supported: boolean;
        registered: boolean;
        subscription: PushSubscription | null;
        error?: string;
    }>({ supported: false, registered: false, subscription: null });
    const [expandedLog, setExpandedLog] = useState<number | null>(null);

    const log = (type: "info" | "success" | "error" | "debug", message: string, details?: any) => {
        const entry: LogEntry = {
            timestamp: new Date().toLocaleTimeString("ar-SA"),
            type,
            message,
            details
        };
        setLogs(prev => [entry, ...prev]);
        console.log(`[${type.toUpperCase()}] ${message}`, details || "");
    };

    // Check subscription status on mount
    useEffect(() => {
        const checkSubscription = async () => {
            log("info", "جاري فحص حالة الإشعارات...");

            if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                log("error", "الإشعارات ما مدعومة في هذا المتصفح");
                setSubscriptionStatus({
                    supported: false,
                    registered: false,
                    subscription: null,
                    error: "Push Notifications not supported"
                });
                return;
            }

            try {
                const registration = await navigator.serviceWorker.ready;
                log("success", "Service Worker جاهز");

                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) {
                    log("success", "اشتراك نشط موجود");
                    setSubscriptionStatus({
                        supported: true,
                        registered: true,
                        subscription: existingSub
                    });
                } else {
                    log("info", "ما فيش اشتراك نشط حاليًا");
                    setSubscriptionStatus({
                        supported: true,
                        registered: false,
                        subscription: null
                    });
                }
            } catch (e: any) {
                log("error", "خطأ في فحص الاشتراك", e);
                setSubscriptionStatus({
                    supported: false,
                    registered: false,
                    subscription: null,
                    error: e.message
                });
            }
        };

        checkSubscription();
    }, []);

    // Soft auth check (shows message instead of blocking)
    const isDean = user?.role === "dean";

    const testAuthHeaders = async () => {
        log("info", "جاري اختبار الترويسات المرسلة...");
        const name = localStorage.getItem("king_user_name") || "";
        const token = localStorage.getItem("king_user_token") || "";

        log("debug", "البيانات المحلية:", { name, token });

        if (!name || !token) {
            log("error", "ما هناك بيانات تسجيل دخول محلية!");
            return false;
        }

        log("success", "الترويسات موجودة وجاهزة");
        return true;
    };

    const testSingleNotification = async () => {
        setTesting(true);
        log("info", "=== بدء اختبار الإشعار ===");

        try {
            // Step 1: Check auth
            const authOk = await testAuthHeaders();
            if (!authOk) {
                log("error", "فشل التحقق من الترويسات");
                setTesting(false);
                return;
            }

            // Step 2: Get current subscription
            if (!subscriptionStatus.subscription) {
                log("error", "ما فيه اشتراك active!");
                setTesting(false);
                return;
            }

            log("success", "لديك اشتراك نشط");

            // Step 3: Prepare request
            const name = localStorage.getItem("king_user_name") || "";
            const token = localStorage.getItem("king_user_token") || "";

            const headers = {
                "Content-Type": "application/json",
                "x-user-name": name,
                "x-user-token": token,
            };

            log("debug", "الترويسات المُرسلة:", headers);

            // Step 4: Call endpoint
            log("info", "جاري إرسال الطلب إلى /api/reminders/test-push...");
            
            const response = await fetch("/api/reminders/test-push", {
                method: "POST",
                headers,
            });

            log("debug", `الرد من الخادم: status=${response.status}`);

            const data = await response.json();
            log("debug", "بيانات الرد:", data);

            if (!response.ok) {
                log("error", `خطأ من الخادم (${response.status}): ${data.error || JSON.stringify(data)}`);
                setTesting(false);
                return;
            }

            log("success", `الخادم رد: ${data.message}`);

            // Step 5: Wait for notification
            log("info", "جاري الانتظار لاستقبال الإشعار (3 ثانية)...");
            await new Promise(resolve => setTimeout(resolve, 3000));

            log("success", "== انظر لأسفل يمين الشاشة للإشعار ==");
        } catch (error: any) {
            log("error", "خطأ في الاختبار", error);
        }

        setTesting(false);
    };

    const clearLogs = () => {
        setLogs([]);
    };

    if (authLoading || !user || user.role !== "dean") {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
        );
    }

    const logClasses = (type: string) => {
        switch (type) {
            case "success":
                return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
            case "error":
                return "bg-red-500/10 border-red-500/30 text-red-300";
            case "debug":
                return "bg-slate-700/30 border-slate-600/30 text-slate-400";
            default:
                return "bg-blue-500/10 border-blue-500/30 text-blue-300";
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans text-slate-300">
            <header className="mb-8 border-b border-slate-800 pb-4">
                <h1 className="text-3xl font-bold text-amber-500 mb-2">🔧 Debug Notifications</h1>
                <p className="text-slate-400">صفحة اختبار وتشخيص مشاكل الإشعارات</p>
            </header>

            {!isDean && (
                <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                        <div>
                            <p className="text-amber-300 font-semibold">⚠️ تحذير: أنت لست عميداً</p>
                            <p className="text-amber-200 text-sm mt-1">هذه الصفحة للعميد فقط. لكن يمكنك معاينة الأداة.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Subscription Status */}
                <div className={`border rounded-xl p-4 ${subscriptionStatus.registered ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"}`}>
                    <div className="flex items-center gap-3 mb-3">
                        {subscriptionStatus.registered ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                        <span className="font-semibold">حالة الاشتراك</span>
                    </div>
                    <p className={`text-sm ${subscriptionStatus.registered ? "text-emerald-300" : "text-red-300"}`}>
                        {subscriptionStatus.registered ? "✅ اشتراك نشط" : "❌ ما فيش اشتراك"}
                    </p>
                    {subscriptionStatus.subscription && (
                        <p className="text-xs text-slate-500 mt-2 font-mono break-all">
                            {subscriptionStatus.subscription.endpoint.substring(0, 40)}...
                        </p>
                    )}
                </div>

                {/* Service Worker Status */}
                <div className={`border rounded-xl p-4 ${subscriptionStatus.supported ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30"}`}>
                    <div className="flex items-center gap-3 mb-3">
                        {subscriptionStatus.supported ? (
                            <Wifi className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <WifiOff className="w-5 h-5 text-red-400" />
                        )}
                        <span className="font-semibold">Service Worker</span>
                    </div>
                    <p className={`text-sm ${subscriptionStatus.supported ? "text-emerald-300" : "text-red-300"}`}>
                        {subscriptionStatus.supported ? "✅ مدعوم" : "❌ ما مدعوم"}
                    </p>
                </div>

                {/* Current User */}
                <div className="border rounded-xl p-4 bg-blue-500/5 border-blue-500/30">
                    <div className="flex items-center gap-3 mb-3">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <span className="font-semibold">المستخدم الحالي</span>
                    </div>
                    <p className="text-sm text-blue-300">
                        {user?.name || "مجهول"} ({user?.role})
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-8">
                <button
                    onClick={testSingleNotification}
                    disabled={testing || !subscriptionStatus.supported || !subscriptionStatus.registered}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
                >
                    <Send className="w-5 h-5" />
                    اختبر الآن
                </button>
                <button
                    onClick={clearLogs}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
                >
                    <RefreshCw className="w-5 h-5" />
                    امسح السجل
                </button>
            </div>

            {/* Logs */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-900 border-b border-slate-800 p-4 font-semibold text-slate-200">
                    📋 سجل التشخيص ({logs.length})
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            ما فيه سجلات حالياً. اختبر الآن للبدء!
                        </div>
                    ) : (
                        logs.map((entry, idx) => (
                            <div
                                key={idx}
                                className={`border-b border-slate-800 transition-colors hover:bg-slate-900/50`}
                            >
                                <button
                                    onClick={() => setExpandedLog(expandedLog === idx ? null : idx)}
                                    className={`w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/30 ${logClasses(entry.type)}`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs opacity-70">{entry.timestamp}</span>
                                            <span className="font-semibold">{entry.type.toUpperCase()}</span>
                                        </div>
                                        <p>{entry.message}</p>
                                    </div>
                                    {entry.details && (
                                        <div>
                                            {expandedLog === idx ? (
                                                <ChevronUp className="w-5 h-5" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5" />
                                            )}
                                        </div>
                                    )}
                                </button>
                                {expandedLog === idx && entry.details && (
                                    <div className="bg-slate-950/50 p-4 border-t border-slate-800/50 font-mono text-xs overflow-x-auto">
                                        <pre className="text-slate-400">
                                            {typeof entry.details === "string"
                                                ? entry.details
                                                : JSON.stringify(entry.details, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">🚀 الخطوات الموصى بها:</h2>
                <ol className="space-y-3 text-slate-400">
                    <li className="flex gap-3">
                        <span className="text-emerald-400 font-bold">1.</span>
                        <span>تشوف من الحالة أعلاه أن "حالة الاشتراك" ✅ (إذا كانت ❌ اضغط الزر الأزرق في الدشبورد الرئيسي "تفعيل الإشعارات")</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-emerald-400 font-bold">2.</span>
                        <span>اضغط زر "اختبر الآن" وشوف السجل يتعمر بالتفاصيل</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-emerald-400 font-bold">3.</span>
                        <span>إذا جاك خطأ AUTH، تأكد أنك سجلت دخول وبيانات login محفوظة في localStorage</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="text-emerald-400 font-bold">4.</span>
                        <span>إذا جاك خطأ في الإشعار نفسه، تفحص console أعلى (F12) للأخطاء</span>
                    </li>
                </ol>
            </div>
        </div>
    );
}
