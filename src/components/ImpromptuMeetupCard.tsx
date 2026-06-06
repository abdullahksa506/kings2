"use client";

/*
 * 🤖 نكتة AI:
 * كلود سُئل: ليش بنيت ميزة لقاء مفاجئ؟
 * قال: عشان الواتساب يدفنون فيها رسائل "أحد فاضي؟" يومياً 😂📱
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Zap, Send, X, Loader2 } from "lucide-react";
import { impromptuServices, ImpromptuMeetup } from "@/lib/impromptuServices";

interface Props {
    userName: string;
    isAdmin: boolean;
}

export default function ImpromptuMeetupCard({ userName, isAdmin }: Props) {
    const [meetup, setMeetup] = useState<ImpromptuMeetup | null>(null);
    const [busy, setBusy] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [showStartForm, setShowStartForm] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => impromptuServices.listenToActiveMeetup(setMeetup), []);

    // Live countdown only while an open meetup is on screen.
    useEffect(() => {
        if (!meetup || meetup.status !== "open") return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [meetup?.id, meetup?.status]);

    const effectiveStatus = meetup ? impromptuServices.effectiveStatus(meetup) : null;

    const freeCount = useMemo(
        () => (meetup ? impromptuServices.countFree(meetup) : 0),
        [meetup],
    );

    const remainingSecs = meetup ? Math.max(0, Math.ceil((meetup.expiresAtMs - now) / 1000)) : 0;
    const mins = Math.floor(remainingSecs / 60);
    const secs = remainingSecs % 60;
    const remainingDisplay = `${mins}:${String(secs).padStart(2, "0")}`;

    const handleStart = useCallback(async () => {
        setBusy(true);
        try {
            await impromptuServices.startMeetup(message.trim().slice(0, 120));
            setShowStartForm(false);
            setMessage("");
        } catch (e: any) {
            alert(e?.message || "تعذّر بدء اللقاء");
        } finally {
            setBusy(false);
        }
    }, [message]);

    const handleRespond = useCallback(
        async (status: "free" | "busy" | "maybe") => {
            if (!meetup) return;
            setBusy(true);
            try {
                await impromptuServices.respondMeetup(meetup.id, status);
            } catch (e: any) {
                alert(e?.message || "تعذّر الرد");
            } finally {
                setBusy(false);
            }
        },
        [meetup],
    );

    const handleCancel = useCallback(async () => {
        if (!meetup) return;
        if (!confirm("إلغاء اللقاء المفاجئ؟")) return;
        setBusy(true);
        try {
            await impromptuServices.cancelMeetup(meetup.id);
        } catch (e: any) {
            alert(e?.message || "تعذّر الإلغاء");
        } finally {
            setBusy(false);
        }
    }, [meetup]);

    // ---------- IDLE: no active meetup → big invite button ----------
    if (!meetup || effectiveStatus === "failed" || effectiveStatus === "canceled") {
        return (
            <div className="bg-gradient-to-br from-fuchsia-900/30 via-purple-900/20 to-slate-900 border border-fuchsia-500/30 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-fuchsia-500/20 p-2.5 rounded-2xl text-fuchsia-400 border border-fuchsia-500/30">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-white">أنا فاضي — لقاء مفاجئ</h3>
                        <p className="text-xs text-slate-400">بدون انتظار الأسبوع، ابدأ الآن</p>
                    </div>
                </div>

                {meetup && effectiveStatus === "failed" && (
                    <p className="text-xs text-slate-500 mb-3 text-center bg-slate-950/40 py-2 rounded-lg">
                        آخر لقاء ما اكتمل 😅 — جرّب مرة ثانية
                    </p>
                )}

                {showStartForm ? (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="وقت أو مكان (اختياري) — مثلاً: 'كافيه ٨م'"
                            maxLength={120}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleStart}
                                disabled={busy}
                                className="flex-1 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"
                            >
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                ابدأ الآن — أنا فاضي
                            </button>
                            <button
                                onClick={() => setShowStartForm(false)}
                                disabled={busy}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-xl text-sm"
                            >
                                إلغاء
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 text-center">
                            ينطلق إشعار للجميع، عندهم 15 دقيقة يردّون
                        </p>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowStartForm(true)}
                        className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20"
                    >
                        <Zap className="w-5 h-5" />
                        فاضي بكير، مين معاي؟
                    </button>
                )}
            </div>
        );
    }

    // ---------- SUCCEEDED: meetup confirmed ----------
    if (effectiveStatus === "succeeded") {
        const freeMembers = [
            meetup.initiator,
            ...Object.entries(meetup.responses || {})
                .filter(([n, r]) => n !== meetup.initiator && r.status === "free")
                .map(([n]) => n),
        ];
        return (
            <div className="bg-gradient-to-br from-emerald-900/40 via-green-900/30 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-xl shadow-emerald-500/20">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-emerald-500/20 p-2.5 rounded-2xl text-emerald-400 border border-emerald-500/40 animate-pulse">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-white">🎉 اللقاء تأكد!</h3>
                        <p className="text-xs text-emerald-300">{freeMembers.length} أعضاء فاضيين</p>
                    </div>
                </div>
                {meetup.message && (
                    <div className="bg-slate-950/60 border border-emerald-500/20 p-3 rounded-xl mb-3">
                        <p className="text-sm text-slate-200">💬 &ldquo;{meetup.message}&rdquo;</p>
                    </div>
                )}
                <div className="space-y-1.5">
                    {freeMembers.map((name) => (
                        <div
                            key={name}
                            className="flex items-center gap-2 bg-slate-950/50 px-3 py-2 rounded-lg border border-emerald-500/10"
                        >
                            <span className="text-emerald-400 text-lg">✅</span>
                            <span className="text-sm text-white font-semibold flex-1">{name}</span>
                            {name === meetup.initiator && (
                                <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    بدأ اللقاء
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-500 text-center mt-3">نسّقوا التفاصيل في الواتساب 💬</p>
            </div>
        );
    }

    // ---------- OPEN: waiting for responses ----------
    const isInitiator = meetup.initiator === userName;
    const myResponse = meetup.responses?.[userName];
    const progressPct = Math.min(100, (freeCount / meetup.threshold) * 100);

    return (
        <div className="bg-gradient-to-br from-fuchsia-900/40 via-purple-900/30 to-slate-900 border-2 border-fuchsia-500/50 rounded-3xl p-5 shadow-xl shadow-fuchsia-500/20">
            <div className="flex items-center gap-3 mb-3">
                <div className="bg-fuchsia-500/20 p-2.5 rounded-2xl text-fuchsia-400 border border-fuchsia-500/40">
                    <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-white">🚨 {meetup.initiator} فاضي!</h3>
                    <p className="text-xs text-slate-400">
                        مين معاه؟ — يبقى{" "}
                        <span className="text-fuchsia-300 font-mono font-bold">{remainingDisplay}</span> دقيقة
                    </p>
                </div>
                {(isInitiator || isAdmin) && (
                    <button
                        onClick={handleCancel}
                        disabled={busy}
                        className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                        title="إلغاء"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {meetup.message && (
                <div className="bg-slate-950/60 border border-fuchsia-500/20 p-3 rounded-xl mb-3">
                    <p className="text-sm text-slate-200">💬 &ldquo;{meetup.message}&rdquo;</p>
                </div>
            )}

            <div className="bg-slate-950/60 rounded-xl p-3 mb-3 border border-slate-800">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">الفاضيين</span>
                    <span className="text-fuchsia-300 font-bold">
                        {freeCount} / {meetup.threshold}
                    </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-emerald-500 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {isInitiator ? (
                <p className="text-center text-sm text-fuchsia-300 py-1">
                    ✨ بدأت اللقاء — بانتظار ردود الأعضاء
                </p>
            ) : !myResponse ? (
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleRespond("free")}
                        disabled={busy}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-sm"
                    >
                        ✅ فاضي
                    </button>
                    <button
                        onClick={() => handleRespond("maybe")}
                        disabled={busy}
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-sm"
                    >
                        🤔 يمكن
                    </button>
                    <button
                        onClick={() => handleRespond("busy")}
                        disabled={busy}
                        className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm"
                    >
                        ❌ مشغول
                    </button>
                </div>
            ) : (
                <div className="text-center bg-slate-950/40 rounded-xl py-2 space-y-1">
                    <p className="text-sm text-slate-300">
                        ردّيت:{" "}
                        <span className="font-bold text-white">
                            {myResponse.status === "free"
                                ? "✅ فاضي"
                                : myResponse.status === "busy"
                                ? "❌ مشغول"
                                : "🤔 يمكن"}
                        </span>
                    </p>
                    <button
                        onClick={() => handleRespond(myResponse.status === "free" ? "busy" : "free")}
                        disabled={busy}
                        className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline"
                    >
                        غيّر ردّك
                    </button>
                </div>
            )}
        </div>
    );
}
