"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Lightbulb, ThumbsUp, ThumbsDown, Trash2, Loader2 } from "lucide-react";
import {
    services,
    FUTURE_FEATURE_SEEDS,
    FeatureFeedbackEntry,
} from "@/lib/services";

interface FutureFeaturesVotingProps {
    userName: string;
    isDean: boolean;
    accentSoftClass: string;
    accentBorderClass: string;
    accentTextClass: string;
}

export default function FutureFeaturesVoting({
    userName,
    isDean,
    accentSoftClass,
    accentBorderClass,
    accentTextClass,
}: FutureFeaturesVotingProps) {
    const [open, setOpen] = useState(false);
    const [feedback, setFeedback] = useState<Record<string, FeatureFeedbackEntry>>({});
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        const unsub = services.listenToFeatureFeedback(setFeedback);
        return () => unsub();
    }, []);

    const visibleFeatures = useMemo(() => {
        return FUTURE_FEATURE_SEEDS.filter((feature) => {
            const entry = feedback[feature.id];
            return !entry?.removed;
        });
    }, [feedback]);

    if (visibleFeatures.length === 0) return null;

    const handleVote = async (featureId: string, vote: "yes" | "no") => {
        if (!userName) return;
        const current = feedback[featureId]?.votes?.[userName];
        const next = current === vote ? null : vote;
        setPendingId(featureId);
        try {
            await services.submitFeatureVote(featureId, next);
        } catch (e) {
            console.error("Failed to submit feature vote:", e);
        } finally {
            setPendingId(null);
        }
    };

    const handleRemove = async (featureId: string, title: string) => {
        if (!confirm(`والله شوف تبي تحذف "${title}" من قايمة الميزات المقترحه؟؟ ❌💥 أحس لو تبي 🤷✨`)) return;
        setPendingId(featureId);
        try {
            await services.setFeatureRemoved(featureId, true);
        } catch (e) {
            console.error("Failed to remove feature:", e);
            alert("أحسس تعذّر حذف الميزه؟؟ 😅💥 والله شوف مدري 🤷✨");
        } finally {
            setPendingId(null);
        }
    };

    return (
        <div className={`bg-slate-900/70 border ${accentBorderClass} rounded-2xl shadow-lg overflow-hidden`}>
            <button
                onClick={() => setOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 p-4 text-right hover:bg-slate-900/90 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`${accentSoftClass} ${accentTextClass} p-2 rounded-xl`}>
                        <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base">ميزاات مقترحه للمستقبل؟؟ 💡✨ أحس</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            والله شوف صوّت على اللي تبيه يضاف للموقع يعني — اختياري وما يأثر على شي 🤷💥
                        </p>
                    </div>
                </div>
                <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-3">
                    {visibleFeatures.map((feature) => {
                        const entry = feedback[feature.id];
                        const votes = entry?.votes || {};
                        const yesCount = Object.values(votes).filter((v) => v === "yes").length;
                        const noCount = Object.values(votes).filter((v) => v === "no").length;
                        const myVote = userName ? votes[userName] : undefined;
                        const isPending = pendingId === feature.id;

                        return (
                            <div
                                key={feature.id}
                                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                                            <span>{feature.icon}</span>
                                            <span>{feature.title}</span>
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                    {isDean && (
                                        <button
                                            onClick={() => handleRemove(feature.id, feature.title)}
                                            disabled={isPending}
                                            className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                                            title="حذف الميزة (عميد فقط)"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={() => handleVote(feature.id, "yes")}
                                        disabled={isPending || !userName}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                                            myVote === "yes"
                                                ? "bg-emerald-500/30 border-emerald-400/40 text-emerald-200"
                                                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300"
                                        }`}
                                    >
                                        {isPending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                        )}
                                        <span>أؤيد؟؟ 👍 ({yesCount})</span>
                                    </button>
                                    <button
                                        onClick={() => handleVote(feature.id, "no")}
                                        disabled={isPending || !userName}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                                            myVote === "no"
                                                ? "bg-red-500/30 border-red-400/40 text-red-200"
                                                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-300"
                                        }`}
                                    >
                                        {isPending ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <ThumbsDown className="w-3.5 h-3.5" />
                                        )}
                                        <span>لا أؤيد؟؟ 👎 ({noCount})</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
