"use client";

import { useState, useEffect, useMemo } from "react";
import { services, WeekSession } from "@/lib/services";
import { MapPin, Vote, Crown, Timer, CheckCircle, XCircle, Shuffle } from "lucide-react";
import { Timestamp } from "firebase/firestore";

interface RestaurantVotingPanelProps {
    currentWeek: WeekSession;
    userName: string;
    isKing: boolean;
    onRefresh: () => void;
    // For dictatorial mode, pass these to allow direct restaurant entry
    restaurant: string;
    setRestaurant: (value: string) => void;
    // Optional Google/Apple Maps URL — saved into the map when the King saves choices.
    mapsUrl?: string;
    setMapsUrl?: (value: string) => void;
}

const VOTING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function RestaurantVotingPanel({
    currentWeek,
    userName,
    isKing,
    onRefresh,
    restaurant,
    setRestaurant,
    mapsUrl = "",
    setMapsUrl,
}: RestaurantVotingPanelProps) {
    const [saving, setSaving] = useState(false);
    const [showModeSelection, setShowModeSelection] = useState(false);
    const [candidates, setCandidates] = useState<[string, string, string]>(["", "", ""]);
    const [overrideRestaurant, setOverrideRestaurant] = useState("");
    const [showOverrideInput, setShowOverrideInput] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>("");

    // Derived state
    const votingActive = currentWeek.restaurantVotingActive ?? false;
    const votingEnded = !votingActive && currentWeek.restaurantVotingResult != null;
    const restaurantCandidates = currentWeek.restaurantCandidates ?? [];
    const restaurantVotes = currentWeek.restaurantVotes ?? {};
    const myVote = restaurantVotes[userName];
    const votingResult = currentWeek.restaurantVotingResult;
    const wasOverridden = currentWeek.restaurantOverridden ?? false;
    const overrideValue = currentWeek.restaurantOverrideValue;

    // Calculate vote counts (anonymous - just numbers)
    const voteCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const candidate of restaurantCandidates) {
            counts[candidate] = 0;
        }
        for (const vote of Object.values(restaurantVotes)) {
            if (typeof vote === "string" && counts[vote] !== undefined) {
                counts[vote]++;
            }
        }
        return counts;
    }, [restaurantCandidates, restaurantVotes]);

    const totalVotes = Object.values(voteCounts).reduce((sum, c) => sum + c, 0);

    // Calculate time remaining
    useEffect(() => {
        if (!votingActive || !currentWeek.restaurantVotingStartedAt) {
            setTimeRemaining("");
            return;
        }

        const updateTimer = () => {
            const startedAt = currentWeek.restaurantVotingStartedAt;
            if (!startedAt) return;

            const startMs = startedAt instanceof Timestamp ? startedAt.toMillis() : (startedAt as any).seconds * 1000;
            const endMs = startMs + VOTING_DURATION_MS;
            const now = Date.now();
            const remainingMs = endMs - now;

            if (remainingMs <= 0) {
                setTimeRemaining("انتهى الوقت");
                return;
            }

            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeRemaining(`${hours}س ${minutes}د`);
            } else if (minutes > 0) {
                setTimeRemaining(`${minutes}د ${seconds}ث`);
            } else {
                setTimeRemaining(`${seconds}ث`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [votingActive, currentWeek.restaurantVotingStartedAt]);

    // Handlers
    const handleStartVoting = async () => {
        const trimmed = candidates.map(c => c.trim()).filter(Boolean);
        if (trimmed.length !== 3 || new Set(trimmed).size !== 3) {
            alert("يجب إدخال 3 مطاعم مختلفة وغير فارغة");
            return;
        }
        setSaving(true);
        try {
            await services.startRestaurantVoting(currentWeek.id, candidates);
            setShowModeSelection(false);
            setCandidates(["", "", ""]);
            onRefresh();
        } catch (e: any) {
            alert(e?.message || "حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitVote = async (restaurantName: string) => {
        if (myVote) return; // Already voted
        setSaving(true);
        try {
            await services.submitRestaurantVote(currentWeek.id, restaurantName);
            onRefresh();
        } catch (e: any) {
            alert(e?.message || "حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    const handleEndVoting = async () => {
        if (!confirm("هل تريد إنهاء التصويت الآن؟")) return;
        setSaving(true);
        try {
            await services.endRestaurantVoting(currentWeek.id);
            onRefresh();
        } catch (e: any) {
            alert(e?.message || "حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelVoting = async () => {
        if (!confirm("هل تريد إلغاء التصويت والعودة للخيار الدكتاتوري؟")) return;
        setSaving(true);
        try {
            await services.cancelRestaurantVoting(currentWeek.id);
            onRefresh();
        } catch (e: any) {
            alert(e?.message || "حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    const handleOverride = async () => {
        const trimmed = overrideRestaurant.trim();
        if (!trimmed) {
            alert("أدخل اسم المطعم");
            return;
        }
        if (!confirm(`هل تريد قمع صوت الجمهور واختيار "${trimmed}"؟`)) return;
        setSaving(true);
        try {
            await services.overrideRestaurantResult(currentWeek.id, trimmed);
            setShowOverrideInput(false);
            setOverrideRestaurant("");
            onRefresh();
        } catch (e: any) {
            alert(e?.message || "حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    // RENDER: Voting Active State
    if (votingActive) {
        return (
            <div className="bg-gradient-to-br from-slate-950/80 to-slate-900/40 rounded-2xl p-5 border border-purple-500/20 hover:border-purple-500/30 transition-colors shadow-[inset_0_0_20px_rgba(168,85,247,0.04)]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/15">
                            <Vote className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-purple-300">التصويت الديموقراطي</p>
                            <p className="text-xs text-slate-400">اختر المطعم المفضل</p>
                        </div>
                    </div>
                    {timeRemaining && (
                        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
                            <Timer className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-mono text-amber-300">{timeRemaining}</span>
                        </div>
                    )}
                </div>

                {/* Candidates */}
                <div className="space-y-2 mb-4">
                    {restaurantCandidates.map((candidate, idx) => {
                        const count = voteCounts[candidate] || 0;
                        const isMyVote = myVote === candidate;
                        const canVote = !isKing && !myVote;

                        return (
                            <button
                                key={idx}
                                onClick={() => canVote && handleSubmitVote(candidate)}
                                disabled={saving || !canVote}
                                className={`w-full p-4 rounded-xl border transition-all text-right flex items-center justify-between gap-3 ${
                                    isMyVote
                                        ? "bg-purple-500/20 border-purple-400/40 text-purple-200"
                                        : canVote
                                        ? "bg-slate-900/60 border-slate-700 text-slate-200 hover:bg-slate-800/80 hover:border-slate-600"
                                        : "bg-slate-900/40 border-slate-800 text-slate-400 cursor-default"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="bg-slate-800 text-slate-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                                        {idx + 1}
                                    </span>
                                    <span className="font-semibold">{candidate}</span>
                                    {isMyVote && <CheckCircle className="w-5 h-5 text-purple-400" />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400">{count} صوت</span>
                                    <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 transition-all"
                                            style={{ width: totalVotes > 0 ? `${(count / totalVotes) * 100}%` : "0%" }}
                                        />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Status */}
                <div className="text-center text-sm text-slate-400 mb-4">
                    {isKing ? (
                        "الملك لا يصوّت"
                    ) : myVote ? (
                        <span className="text-purple-300">صوّتت لـ {myVote}</span>
                    ) : (
                        "اختر مطعمك المفضل"
                    )}
                    <span className="mx-2">·</span>
                    <span>{totalVotes} صوت حتى الآن</span>
                </div>

                {/* King Controls */}
                {isKing && (
                    <div className="flex flex-wrap gap-2 justify-center border-t border-slate-800 pt-4">
                        <button
                            onClick={handleEndVoting}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            إنهاء التصويت
                        </button>
                        <button
                            onClick={handleCancelVoting}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            إلغاء التصويت
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // RENDER: Voting Ended State (show results)
    if (votingEnded) {
        return (
            <div className="bg-gradient-to-br from-slate-950/80 to-slate-900/40 rounded-2xl p-5 border border-emerald-500/20 hover:border-emerald-500/30 transition-colors shadow-[inset_0_0_20px_rgba(16,185,129,0.04)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/15">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-emerald-300">نتيجة التصويت</p>
                        <p className="text-xs text-slate-400">
                            {wasOverridden ? "تم قمع صوت الجمهور" : "اختيار الجمهور"}
                        </p>
                    </div>
                </div>

                {/* Winner */}
                <div className={`p-4 rounded-xl border mb-4 text-center ${
                    wasOverridden
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-emerald-500/10 border-emerald-500/20"
                }`}>
                    <p className="text-xs text-slate-400 mb-1">المطعم المختار</p>
                    <p className="text-2xl font-bold text-white">{currentWeek.restaurant}</p>
                    {wasOverridden && (
                        <p className="text-xs text-red-400 mt-2">
                            <XCircle className="w-3 h-3 inline ml-1" />
                            الملك ألغى نتيجة التصويت ({votingResult})
                        </p>
                    )}
                </div>

                {/* Vote Summary */}
                <div className="space-y-1.5 mb-4">
                    {restaurantCandidates.map((candidate, idx) => {
                        const count = voteCounts[candidate] || 0;
                        const isWinner = candidate === votingResult;

                        return (
                            <div
                                key={idx}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                                    isWinner ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-slate-900/40"
                                }`}
                            >
                                <span className={isWinner ? "font-semibold text-emerald-300" : "text-slate-400"}>
                                    {candidate}
                                    {isWinner && !wasOverridden && " (الفائز)"}
                                </span>
                                <span className="text-sm text-slate-500">{count} صوت</span>
                            </div>
                        );
                    })}
                </div>

                {/* King Override Option */}
                {isKing && !wasOverridden && (
                    <div className="border-t border-slate-800 pt-4">
                        {!showOverrideInput ? (
                            <button
                                onClick={() => setShowOverrideInput(true)}
                                className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                            >
                                <Crown className="w-4 h-4" />
                                قمع صوت الجمهور
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="اسم المطعم البديل..."
                                    value={overrideRestaurant}
                                    onChange={e => setOverrideRestaurant(e.target.value)}
                                    className="w-full bg-slate-900 text-white border border-red-500/30 rounded-lg p-3 outline-none focus:border-red-400"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleOverride}
                                        disabled={saving || !overrideRestaurant.trim()}
                                        className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 text-sm font-semibold transition-colors disabled:opacity-50"
                                    >
                                        تأكيد القمع
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowOverrideInput(false);
                                            setOverrideRestaurant("");
                                        }}
                                        className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-sm transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // RENDER: Mode Selection (King choosing between dictatorial/democratic)
    if (isKing && showModeSelection) {
        return (
            <div className="bg-gradient-to-br from-slate-950/80 to-slate-900/40 rounded-2xl p-5 border border-purple-500/15 shadow-[inset_0_0_20px_rgba(168,85,247,0.04)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/15">
                        <Vote className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-purple-300">الخيار الديموقراطي</p>
                        <p className="text-xs text-slate-400">أدخل 3 مطاعم للتصويت عليها</p>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    {[0, 1, 2].map(idx => (
                        <div key={idx} className="flex items-center gap-2">
                            <span className="bg-slate-800 text-slate-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                            </span>
                            <input
                                type="text"
                                placeholder={`المطعم ${idx + 1}...`}
                                value={candidates[idx]}
                                onChange={e => {
                                    const newCandidates = [...candidates] as [string, string, string];
                                    newCandidates[idx] = e.target.value;
                                    setCandidates(newCandidates);
                                }}
                                className="flex-1 bg-slate-900 text-white border border-slate-700 rounded-lg p-3 outline-none focus:border-purple-400"
                            />
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleStartVoting}
                        disabled={saving || candidates.filter(c => c.trim()).length !== 3}
                        className="flex-1 px-4 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Vote className="w-4 h-4" />
                        ابدأ التصويت (24 ساعة)
                    </button>
                    <button
                        onClick={() => {
                            setShowModeSelection(false);
                            setCandidates(["", "", ""]);
                        }}
                        className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        رجوع
                    </button>
                </div>
            </div>
        );
    }

    // RENDER: Default State (dictatorial input or mode selection buttons for King)
    return (
        <div className="bg-gradient-to-br from-slate-950/80 to-slate-900/40 rounded-2xl p-5 border border-amber-500/15 hover:border-amber-500/25 transition-colors flex items-center gap-4 shadow-[inset_0_0_20px_rgba(245,158,11,0.04)]">
            <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/15">
                <MapPin className="w-7 h-7 text-amber-400/80" />
            </div>
            <div className="flex-1">
                <p className="text-xs text-amber-400/80 mb-1 font-semibold">المطعم المختار · الميزانية ≤ 175</p>
                {isKing ? (
                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="اسم المطعم..."
                            value={restaurant}
                            onChange={e => setRestaurant(e.target.value)}
                            className="bg-slate-900 text-white border border-slate-700 rounded-lg p-3 outline-none w-full max-w-sm focus:border-slate-400"
                        />
                        {setMapsUrl && (
                            <div>
                                <input
                                    type="url"
                                    placeholder="📍 رابط موقع المطعم في خرائط قوقل (اختياري)"
                                    value={mapsUrl}
                                    onChange={e => setMapsUrl(e.target.value)}
                                    inputMode="url"
                                    dir="ltr"
                                    className="bg-slate-900 text-white border border-slate-700 rounded-lg p-3 outline-none w-full max-w-sm focus:border-emerald-500 text-sm placeholder:text-slate-500 placeholder:text-right"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    يتسجّل المطعم على الخريطة عند حفظ القرارات
                                </p>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowModeSelection(true)}
                                className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5"
                            >
                                <Vote className="w-3.5 h-3.5" />
                                الخيار الديموقراطي
                            </button>
                            <span className="text-xs text-slate-600">أو اكتب المطعم مباشرة (دكتاتوري)</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-xl font-semibold text-white">
                        {currentWeek.restaurant || <span className="text-slate-600 font-normal">لم يحدد بعد</span>}
                    </p>
                )}
            </div>
        </div>
    );
}
