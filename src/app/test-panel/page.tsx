"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كيف أعرف إن كل شي شغّال عندي؟"
 * قال: "اضغط زر الفحص... أسهل من ما تسأل الشباب وما أحد يرد 😂🔍"
 *
 * صفحة الفحص الذاتي — كل عضو يتأكد إن كل شي يشتغل على جهازه (خصوصاً بعد
 * إعادة تثبيت التطبيق، لأن الإشعارات لازم تُفعّل من جديد).
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { services } from "@/lib/services";
import { ChevronRight, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Bell, Smartphone } from "lucide-react";

type Status = "pass" | "fail" | "warn" | "pending";

interface Check {
    id: string;
    label: string;
    status: Status;
    detail: string;
    fix?: string; // what the user should do
}

const ICON: Record<Status, React.ReactNode> = {
    pass: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    fail: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
    warn: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    pending: <Loader2 className="w-5 h-5 text-slate-500 animate-spin shrink-0" />,
};

function authHeaders(): Record<string, string> {
    const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
    return { "Content-Type": "application/json", "x-user-name": encodeURIComponent(name), "x-user-token": token };
}

export default function SelfTestPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications();

    const [checks, setChecks] = useState<Check[]>([]);
    const [running, setRunning] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [pushTest, setPushTest] = useState<string>("");

    useEffect(() => {
        if (!authLoading && !user) router.replace("/");
    }, [authLoading, user, router]);

    const runChecks = useCallback(async () => {
        setRunning(true);
        setPushTest("");
        const out: Check[] = [];

        // 1) Signed in
        out.push({
            id: "auth",
            label: "تسجيل الدخول",
            status: user ? "pass" : "fail",
            detail: user ? `مسجّل باسم: ${user.name}` : "غير مسجّل",
            fix: user ? undefined : "سجّل دخولك من الصفحة الرئيسية",
        });

        // 2) Server connection + account state (server-side truth)
        let serverOk = false;
        let hasServerSub = false;
        try {
            const res = (await services.selfCheck()) as {
                name: string; registered: boolean; hasPushSubscription: boolean;
            };
            serverOk = true;
            hasServerSub = Boolean(res?.hasPushSubscription);
            out.push({ id: "server", label: "الاتصال بالسيرفر", status: "pass", detail: "السيرفر يرد ويعرف حسابك ✓" });
            out.push({
                id: "registered",
                label: "حسابك مفعّل",
                status: res?.registered ? "pass" : "warn",
                detail: res?.registered ? "الحساب مسجّل بكلمة مرور" : "الحساب غير مكتمل التسجيل",
            });
        } catch (e) {
            out.push({
                id: "server", label: "الاتصال بالسيرفر", status: "fail",
                detail: e instanceof Error ? e.message : "ما قدرنا نوصل السيرفر",
                fix: "تأكد من الإنترنت ثم أعد الفحص",
            });
        }

        // 3) Database read
        try {
            const w = await services.getCurrentWeek();
            out.push({
                id: "db", label: "قراءة البيانات",
                status: "pass",
                detail: w ? `الأسبوع الحالي محمّل ✓` : "متصل (ما فيه أسبوع نشط)",
            });
        } catch {
            out.push({ id: "db", label: "قراءة البيانات", status: "fail", detail: "تعذّرت قراءة البيانات", fix: "حدّث الصفحة" });
        }

        // 4) Service worker (needed for notifications)
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            const active = Boolean(reg?.active);
            out.push({
                id: "sw", label: "خدمة الخلفية (Service Worker)",
                status: active ? "pass" : "fail",
                detail: active ? "مسجّلة وتعمل ✓" : "غير مسجّلة",
                fix: active ? undefined : "أغلق التطبيق وافتحه من جديد",
            });
        } else {
            out.push({ id: "sw", label: "خدمة الخلفية", status: "fail", detail: "المتصفح ما يدعمها" });
        }

        // 5) Notification permission
        const perm = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
        out.push({
            id: "perm", label: "إذن الإشعارات",
            status: perm === "granted" ? "pass" : perm === "denied" ? "fail" : "warn",
            detail: perm === "granted" ? "مسموح ✓" : perm === "denied" ? "مرفوض 🚫" : "لم تُفعّل بعد",
            fix: perm === "denied"
                ? "الإذن مرفوض — افتح إعدادات الموقع في المتصفح واسمح بالإشعارات"
                : perm === "granted" ? undefined : "اضغط زر «فعّل الإشعارات» تحت",
        });

        // 6) Browser-side subscription
        let browserSub = false;
        try {
            const reg = await navigator.serviceWorker?.getRegistration();
            browserSub = Boolean(await reg?.pushManager?.getSubscription());
        } catch { /* ignore */ }
        out.push({
            id: "subLocal", label: "اشتراك الإشعارات (جهازك)",
            status: browserSub ? "pass" : "fail",
            detail: browserSub ? "الاشتراك موجود على جهازك ✓" : "ما فيه اشتراك على هذا الجهاز",
            fix: browserSub ? undefined : "اضغط «فعّل الإشعارات» تحت",
        });

        // 7) Server-side subscription — the one that actually matters for delivery
        if (serverOk) {
            out.push({
                id: "subServer", label: "اشتراكك مسجّل على السيرفر",
                status: hasServerSub ? "pass" : "fail",
                detail: hasServerSub ? "السيرفر يقدر يرسل لك إشعارات ✓" : "السيرفر ما عنده اشتراك لك — ما راح توصلك إشعارات",
                fix: hasServerSub ? undefined : "اضغط «فعّل الإشعارات» تحت (ضروري بعد إعادة تثبيت التطبيق)",
            });
        }

        // 8) Installed as an app (PWA) — affects iOS notifications
        const standalone =
            typeof window !== "undefined" &&
            (window.matchMedia?.("(display-mode: standalone)")?.matches ||
                (window.navigator as unknown as { standalone?: boolean }).standalone === true);
        const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
        out.push({
            id: "pwa", label: "التطبيق مثبّت على الشاشة",
            status: standalone ? "pass" : isIOS ? "fail" : "warn",
            detail: standalone ? "مثبّت ✓" : "تفتحه من المتصفح",
            fix: standalone ? undefined : isIOS
                ? "على الآيفون: لازم تثبّته (شارك ← إضافة إلى الشاشة الرئيسية) عشان الإشعارات تشتغل"
                : "يفضّل تثبيته للأداء الأفضل",
        });

        setChecks(out);
        setRunning(false);
    }, [user]);

    useEffect(() => {
        if (user) runChecks();
    }, [user, runChecks]);

    const enableNotifications = async () => {
        setFixing(true);
        try {
            await subscribeToPush();
            await new Promise((r) => setTimeout(r, 800));
            await runChecks();
        } finally {
            setFixing(false);
        }
    };

    const sendTestPush = async () => {
        setPushTest("جاري الإرسال...");
        try {
            const res = await fetch("/api/self-test/push", { method: "POST", headers: authHeaders(), body: "{}" });
            const data = await res.json();
            setPushTest(
                data?.success
                    ? "📨 أُرسل! إذا وصلك الإشعار = كل شي تمام. (إذا ما وصل، فعّل الإشعارات من فوق)"
                    : `❌ ما انرسل: ${data?.reason || data?.error || "فعّل الإشعارات أولاً"}`,
            );
        } catch {
            setPushTest("❌ خطأ في الإرسال — تأكد من الإنترنت");
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            </div>
        );
    }

    const failures = checks.filter((c) => c.status === "fail").length;
    const warns = checks.filter((c) => c.status === "warn").length;
    const allGood = checks.length > 0 && failures === 0 && warns === 0;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
            <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 pt-safe">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 active:scale-90 transition" aria-label="رجوع">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <h1 className="text-base font-bold">فحص جهازك</h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
                {/* Summary */}
                <div className={`rounded-2xl p-4 border text-center ${
                    checks.length === 0 ? "bg-slate-900 border-slate-800"
                        : allGood ? "bg-emerald-500/10 border-emerald-500/30"
                        : failures > 0 ? "bg-red-500/10 border-red-500/30"
                        : "bg-amber-500/10 border-amber-500/30"}`}>
                    {checks.length === 0 ? (
                        <p className="text-slate-400 text-sm">جاري الفحص...</p>
                    ) : allGood ? (
                        <><p className="text-2xl mb-1">🎉</p><p className="font-bold text-emerald-300">كل شي يشتغل عندك تمام!</p></>
                    ) : (
                        <>
                            <p className="text-2xl mb-1">{failures > 0 ? "⚠️" : "🟡"}</p>
                            <p className="font-bold text-white">
                                {failures > 0 ? `فيه ${failures} مشكلة تحتاج إصلاح` : `فيه ${warns} ملاحظة`}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">شوف التفاصيل تحت واتبع الحل</p>
                        </>
                    )}
                </div>

                {/* Checks */}
                <div className="space-y-2">
                    {checks.map((c) => (
                        <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-3">
                            {ICON[c.status]}
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm text-white">{c.label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{c.detail}</p>
                                {c.fix && (
                                    <p className="text-[11px] text-amber-300 mt-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                                        💡 {c.fix}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                    {isSupported && !isSubscribed && (
                        <button onClick={enableNotifications} disabled={fixing}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold rounded-2xl py-3 transition">
                            {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                            فعّل الإشعارات
                        </button>
                    )}

                    <button onClick={sendTestPush}
                        className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-2xl py-3 transition">
                        <Bell className="w-4 h-4" /> أرسل لي إشعار تجريبي
                    </button>
                    {pushTest && <p className="text-xs text-center text-slate-300 bg-slate-900 border border-slate-800 rounded-xl p-2.5">{pushTest}</p>}

                    <button onClick={runChecks} disabled={running}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-200 font-semibold rounded-2xl py-3 transition">
                        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        أعد الفحص
                    </button>
                </div>

                <p className="text-[10px] text-slate-600 text-center pt-2">
                    💡 بعد إعادة تثبيت التطبيق لازم تفعّل الإشعارات من جديد — هذي الصفحة تأكد لك إنها اشتغلت فعلاً.
                </p>
            </div>
        </main>
    );
}
