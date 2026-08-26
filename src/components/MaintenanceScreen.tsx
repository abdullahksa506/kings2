"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "وش أصعب شي في الصيانة؟"
 * قال: "مو الكود... إقناع ٦ أشخاص يحددون إذا بيجون ولا لا 😂📵"
 * قالوا: "وحلها؟" قال: "أقفل الموقع كله وأخلي زرّين بس — بجي / ما بجي. جرّبوا 🔒"
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, VALID_NAMES, MaintenanceState } from "@/lib/services";
import { outingDateLabel } from "@/lib/outingDate";
import { Wrench, MapPin, CalendarDays, Crown, Check, X, BellRing, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MaintenanceScreen({
    state,
    onDeanBypass,
}: {
    state: MaintenanceState;
    onDeanBypass: () => void;
}) {
    const { user, logout } = useAuth();
    const [week, setWeek] = useState<WeekSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const unsub = services.listenToCurrentWeek((w) => { setWeek(w); setLoading(false); });
        return () => unsub();
    }, []);

    const me = user?.name || "";
    const isDean = me === "شوكا";
    const isKing = !!week?.king && week.king === me;

    const absentees: string[] = week?.absentees || [];
    const responded: string[] = week?.responded || [];
    const myStatus: "coming" | "absent" | "none" =
        absentees.includes(me) ? "absent" : responded.includes(me) ? "coming" : "none";

    // الملك ما يحتاج يأكد حضوره — هو صاحب الطلعة.
    const pending = VALID_NAMES.filter((n) => n !== week?.king && !responded.includes(n));

    const answer = async (isAbsent: boolean) => {
        if (!week) return;
        setBusy(true);
        try {
            await services.toggleAttendance(week.id, me, isAbsent);
            toast.success(isAbsent ? "سجّلنا اعتذارك 😔" : "سجّلنا حضورك ✅");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "ما ضبطت — جرّب مرة ثانية");
        } finally {
            setBusy(false);
        }
    };

    const nudgeEveryone = async () => {
        if (!week) return;
        if (pending.length === 0) { toast.info("كلهم حددوا بالفعل 🎉"); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/reminders/attendance-pending", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-name": encodeURIComponent(localStorage.getItem("king_user_name") || ""),
                    "x-user-token": localStorage.getItem("king_user_token") || "",
                },
                body: JSON.stringify({ weekId: week.id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "فشل الإرسال");
            toast.success(data.message || "انبعث التنبيه 📣");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "فشل إرسال التنبيه");
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 flex flex-col items-center">
            <div className="w-full max-w-md space-y-4">

                {/* شريط العميد — الوحيد اللي يقدر يفك الإغلاق */}
                {isDean && (
                    <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-3 flex flex-wrap items-center gap-2">
                        <span className="text-emerald-300 text-xs font-bold flex items-center gap-1.5 flex-1">
                            <ShieldCheck className="w-4 h-4" /> أنت العميد — تشوف صفحة الصيانة
                        </span>
                        <button
                            onClick={onDeanBypass}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                        >
                            ادخل الموقع
                        </button>
                        <button
                            onClick={async () => {
                                setBusy(true);
                                try { await services.setMaintenance(false); toast.success("انتهت الصيانة ✅"); }
                                catch (e) { toast.error(e instanceof Error ? e.message : "فشل"); }
                                finally { setBusy(false); }
                            }}
                            disabled={busy}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                        >
                            أطفئ الصيانة
                        </button>
                    </div>
                )}

                {/* الترويسة */}
                <div className="text-center pt-4 pb-2">
                    <div className="inline-flex p-4 rounded-3xl bg-amber-500/15 border border-amber-500/40 mb-4">
                        <Wrench className="w-9 h-9 text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-black text-amber-400">الموقع تحت الصيانة 🔧</h1>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                        {state.note || "نشتغل على تحديثات. الطلعة ماشية عادي — بس حدد إذا بتجي."}
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                    </div>
                ) : !week ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center">
                        <p className="text-slate-400 text-sm">ما فيه طلعة مفتوحة حالياً.</p>
                    </div>
                ) : (
                    <>
                        {/* بطاقة الطلعة */}
                        <div className="bg-gradient-to-br from-slate-900 to-amber-950/25 border border-amber-500/25 rounded-3xl p-5 space-y-3">
                            <p className="text-[11px] text-amber-300/80 font-bold">طلعة هذا الأسبوع</p>

                            <div className="flex items-start gap-2.5">
                                <MapPin className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xl font-black text-white leading-tight">
                                        {week.restaurant || "لسه ما تحدد المطعم"}
                                    </p>
                                    {week.activity && <p className="text-slate-400 text-xs mt-0.5">{week.activity}</p>}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <CalendarDays className="w-5 h-5 text-amber-400 shrink-0" />
                                <p className="text-slate-200 text-sm">
                                    {week.day || "اليوم ما تحدد"}
                                    <span className="text-slate-500"> · {outingDateLabel(week)}</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                                <p className="text-slate-200 text-sm">
                                    الملك: <span className="font-bold">{week.king || "أسبوع عشوائي"}</span>
                                </p>
                            </div>
                        </div>

                        {/* حالة ردود الشلة — يشوفها الكل */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                            <p className="text-[11px] text-slate-400 font-bold mb-2.5">
                                من حدد؟ ({VALID_NAMES.length - (week.king ? 1 : 0) - pending.length}/{VALID_NAMES.length - (week.king ? 1 : 0)})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {VALID_NAMES.filter((n) => n !== week.king).map((n) => {
                                    const isAbsent = absentees.includes(n);
                                    const did = responded.includes(n);
                                    return (
                                        <span
                                            key={n}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                                                !did
                                                    ? "bg-slate-800 border-slate-700 text-slate-500"
                                                    : isAbsent
                                                        ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                                                        : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                            }`}
                                        >
                                            {n} {!did ? "…" : isAbsent ? "✕" : "✓"}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {/* زر التنبيه: للملك، وللعميد كذلك عشان الأسبوع العشوائي ما فيه ملك */}
                        {(isKing || isDean) && (
                            <div className="bg-gradient-to-br from-slate-900 to-violet-950/30 border border-violet-500/30 rounded-3xl p-5 space-y-3">
                                <p className="text-violet-300 text-sm font-bold flex items-center gap-1.5">
                                    <Crown className="w-4 h-4" /> {isKing ? "أنت ملك هذا الأسبوع" : "تنبيه الشلة (العميد)"}
                                </p>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    {pending.length > 0
                                        ? `باقي ${pending.length} ما حددوا: ${pending.join("، ")}`
                                        : "كل الشلة حددوا 🎉"}
                                </p>
                                <button
                                    onClick={nudgeEveryone}
                                    disabled={busy || pending.length === 0}
                                    className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    <BellRing className="w-4 h-4" />
                                    {busy ? "يرسل..." : "نبّه الكل يحددون"}
                                </button>
                            </div>
                        )}

                        {/* أزرار الحضور — للكل ما عدا ملك الأسبوع (هو صاحب الطلعة) */}
                        {!isKing && (
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                                <p className="text-slate-300 text-sm font-bold text-center">بتجي الطلعة؟</p>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        onClick={() => answer(false)}
                                        disabled={busy}
                                        className={`py-4 rounded-2xl font-black flex flex-col items-center gap-1 border-2 transition-all disabled:opacity-50 ${
                                            myStatus === "coming"
                                                ? "bg-emerald-500 border-emerald-400 text-white"
                                                : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                                        }`}
                                    >
                                        <Check className="w-6 h-6" /> بجي
                                    </button>
                                    <button
                                        onClick={() => answer(true)}
                                        disabled={busy}
                                        className={`py-4 rounded-2xl font-black flex flex-col items-center gap-1 border-2 transition-all disabled:opacity-50 ${
                                            myStatus === "absent"
                                                ? "bg-rose-500 border-rose-400 text-white"
                                                : "bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20"
                                        }`}
                                    >
                                        <X className="w-6 h-6" /> ما بجي
                                    </button>
                                </div>
                                <p className="text-center text-[11px] text-slate-500">
                                    {myStatus === "none"
                                        ? "ما حددت بعد — اختر وحدة"
                                        : myStatus === "coming"
                                            ? "مسجّل إنك بتجي ✅ (تقدر تغيّر)"
                                            : "مسجّل إنك معتذر ✕ (تقدر تغيّر)"}
                                </p>
                            </div>
                        )}
                    </>
                )}

                <button
                    onClick={logout}
                    className="w-full text-slate-500 hover:text-slate-300 text-xs font-bold py-3 flex items-center justify-center gap-1.5"
                >
                    <LogOut className="w-3.5 h-3.5" /> تسجيل خروج
                </button>
            </div>
        </main>
    );
}
