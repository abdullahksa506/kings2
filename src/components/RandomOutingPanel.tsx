"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Users, Check, X, Sparkles, Loader2 } from "lucide-react";
import { WeekSession, VALID_NAMES, services } from "@/lib/services";

interface RandomOutingPanelProps {
    currentWeek: WeekSession;
    userName: string;
}

const DAY_OPTIONS: Array<"الخميس" | "الجمعة" | "الخميس والجمعة"> = [
    "الخميس",
    "الجمعة",
    "الخميس والجمعة",
];

export default function RandomOutingPanel({ currentWeek, userName }: RandomOutingPanelProps) {
    const [busy, setBusy] = useState<string | null>(null);

    const isMember = VALID_NAMES.includes(userName);

    const responded = currentWeek.responded || [];
    const absentees = currentWeek.absentees || [];
    const dayVotes = currentWeek.dayVotes || {};

    const myAttendance: "present" | "absent" | "pending" = responded.includes(userName)
        ? absentees.includes(userName)
            ? "absent"
            : "present"
        : "pending";

    const attendingMembers = VALID_NAMES.filter(
        (n) => responded.includes(n) && !absentees.includes(n),
    );

    // Tally
    let thuCount = 0;
    let friCount = 0;
    let bothCount = 0;
    const validVoters: string[] = [];
    for (const [name, day] of Object.entries(dayVotes)) {
        if (!responded.includes(name) || absentees.includes(name)) continue;
        validVoters.push(name);
        if (day === "الخميس") thuCount += 1;
        else if (day === "الجمعة") friCount += 1;
        else if (day === "الخميس والجمعة") bothCount += 1;
    }
    const thuTotal = thuCount + bothCount;
    const friTotal = friCount + bothCount;
    const totalVoters = validVoters.length;
    const threshold = 4; // 4 of 6 = consensus
    const decided = !!currentWeek.day;
    const myVote = dayVotes[userName];

    const setAttendance = async (isAbsent: boolean) => {
        if (busy || !isMember) return;
        setBusy("attendance");
        try {
            await services.toggleAttendance(currentWeek.id, userName, isAbsent);
            toast.success(isAbsent ? "تم تسجيل المعذرة ❌" : "تم تأكيد الحضور ✅");
        } catch (e) {
            toast.error("صار خطأ، حاول مرة ثانية");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const castDayVote = async (day: (typeof DAY_OPTIONS)[number]) => {
        if (busy || !isMember) return;
        if (myAttendance !== "present") {
            toast.error("أكّد حضورك أولاً عشان تصوّت");
            return;
        }
        setBusy("vote");
        try {
            const res = await services.submitDayVote(currentWeek.id, userName, day);
            const auto = (res as { autoAppliedDay?: string | null })?.autoAppliedDay;
            if (auto) {
                toast.success(`صوّتك سُجّل وحُسم اليوم: ${auto} 🎉`);
            } else {
                toast.success(`صوّتت لـ ${day} 🗳️`);
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "ما قدرنا نسجل صوتك");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const applyResult = async () => {
        if (busy || !isMember) return;
        setBusy("apply");
        try {
            const res = await services.applyDayVoteResult(currentWeek.id);
            toast.success(`اعتُمد اليوم: ${res} 🎉`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "ما قدرنا نطبّق النتيجة");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="bg-slate-900/70 border border-fuchsia-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_10%,rgba(217,70,239,0.18),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(34,211,238,0.15),transparent_45%)]" />

            <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40">
                        <Sparkles className="w-5 h-5 text-fuchsia-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">طلعة عشوائية — تنسيق ذاتي</h2>
                        <p className="text-xs text-slate-400">
                            ما فيه ملك. أي عضو يبدأ، والنتيجة تُحسم تلقائياً عند {threshold} أصوات
                        </p>
                    </div>
                </div>

                {/* Decided banner */}
                {decided && (
                    <div className="mb-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-4 text-center">
                        <p className="text-emerald-300 font-bold text-lg">
                            اليوم محسوم: {currentWeek.day} 🎉
                        </p>
                    </div>
                )}

                {/* 1) Attendance */}
                <section className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-fuchsia-300" />
                        <h3 className="text-sm font-bold text-white">حضوري</h3>
                        <span className="text-xs text-slate-400 mr-auto">
                            {attendingMembers.length} حاضر · {absentees.length} معذور
                        </span>
                    </div>
                    {isMember ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setAttendance(false)}
                                disabled={busy !== null}
                                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold border transition-all disabled:opacity-50 ${
                                    myAttendance === "present"
                                        ? "bg-emerald-500 text-white border-emerald-400"
                                        : "bg-slate-900 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/15"
                                }`}
                            >
                                <Check className="w-4 h-4" /> حاضر
                            </button>
                            <button
                                onClick={() => setAttendance(true)}
                                disabled={busy !== null}
                                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold border transition-all disabled:opacity-50 ${
                                    myAttendance === "absent"
                                        ? "bg-rose-500 text-white border-rose-400"
                                        : "bg-slate-900 text-rose-300 border-rose-500/40 hover:bg-rose-500/15"
                                }`}
                            >
                                <X className="w-4 h-4" /> معذرة
                            </button>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500">سجّل دخول كعضو للمشاركة</p>
                    )}
                    {/* Members status grid */}
                    <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px]">
                        {VALID_NAMES.map((n) => {
                            const present = responded.includes(n) && !absentees.includes(n);
                            const absent = absentees.includes(n);
                            return (
                                <div
                                    key={n}
                                    className={`rounded-lg px-2 py-1 text-center border ${
                                        present
                                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                            : absent
                                            ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                                            : "bg-slate-800/50 border-slate-700 text-slate-500"
                                    }`}
                                >
                                    {present ? "✅" : absent ? "❌" : "⌛"} {n}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 2) Day voting */}
                {!decided && (
                    <section>
                        <div className="flex items-center gap-2 mb-2">
                            <CalendarDays className="w-4 h-4 text-cyan-300" />
                            <h3 className="text-sm font-bold text-white">صوّت لليوم</h3>
                            <span className="text-xs text-slate-400 mr-auto">
                                {totalVoters}/{threshold}+ أصوات
                            </span>
                        </div>
                        <div className="space-y-2">
                            {DAY_OPTIONS.map((opt) => {
                                const isMine = myVote === opt;
                                const count =
                                    opt === "الخميس" ? thuCount : opt === "الجمعة" ? friCount : bothCount;
                                const denom = totalVoters || 1;
                                return (
                                    <button
                                        key={opt}
                                        onClick={() => castDayVote(opt)}
                                        disabled={
                                            busy !== null ||
                                            !isMember ||
                                            myAttendance !== "present"
                                        }
                                        className={`relative w-full rounded-xl border px-4 py-2.5 text-right transition-all disabled:opacity-50 overflow-hidden ${
                                            isMine
                                                ? "bg-fuchsia-500 text-white border-fuchsia-400"
                                                : "bg-slate-900 text-white border-slate-700 hover:bg-slate-800"
                                        }`}
                                    >
                                        <div
                                            className={`absolute inset-y-0 right-0 ${
                                                isMine ? "bg-fuchsia-400/40" : "bg-fuchsia-500/15"
                                            } transition-all`}
                                            style={{ width: `${(count / denom) * 100}%` }}
                                        />
                                        <div className="relative flex items-center justify-between text-sm font-semibold">
                                            <span>{opt}</span>
                                            <span className="text-xs">
                                                {count} {isMine && "(صوّتك)"}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tally hint */}
                        {totalVoters > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800 text-center">
                                    <p className="text-slate-400">يحتسب للخميس</p>
                                    <p className="text-cyan-300 font-bold text-lg">{thuTotal}</p>
                                </div>
                                <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800 text-center">
                                    <p className="text-slate-400">يحتسب للجمعة</p>
                                    <p className="text-cyan-300 font-bold text-lg">{friTotal}</p>
                                </div>
                            </div>
                        )}

                        {/* Manual finalize button (for ties or early finalize) */}
                        {totalVoters >= 2 && thuTotal !== friTotal && (
                            <button
                                onClick={applyResult}
                                disabled={busy !== null}
                                className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
                            >
                                {busy === "apply" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                احسم النتيجة الحين ({thuTotal > friTotal ? "الخميس" : "الجمعة"})
                            </button>
                        )}

                        {totalVoters >= 2 && thuTotal === friTotal && (
                            <p className="mt-3 text-xs text-amber-400 text-center">
                                ⚖️ تعادل — لازم صوت يحسم
                            </p>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
