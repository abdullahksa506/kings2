"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, MapPin, Star, Check, Search } from "lucide-react";
import { plannerServices, PlanResult, PlanSuggestion } from "@/lib/plannerServices";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onPick: (name: string, mapsUrl: string) => void;
}

const QUICK_CHIPS = [
    "برجر", "هندي", "مشاوي", "قهوة", "حلا", "شاورما", "تركي", "بحري", "إيطالي", "آسيوي", "فطور",
    "رخيص", "جديد ما جربناه", "عالي التقييم",
];

const AREA_CHIPS = ["العليا", "النخيل", "الملقا", "حطين", "الياسمين", "الورود", "غرناطة", "الربيع"];

export default function OutingPlannerPanel({ isOpen, onClose, onPick }: Props) {
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<PlanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<string | null>(null);

    if (!isOpen) return null;

    const addChip = (chip: string) => {
        setQuery((q) => (q ? `${q} ${chip}` : chip));
    };

    const run = async (q?: string) => {
        const text = (q ?? query).trim();
        if (!text) {
            setError("اكتب وش تبي — مثلاً: برجر رخيص بالعليا");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const res = await plannerServices.plan(text);
            setResult(res);
            if (res.suggestions.length === 0) {
                setError("ما لقيت مطاعم بهالمواصفات — جرّب توسّع البحث");
            }
        } catch (e: any) {
            setError(e?.message || "تعذّر التخطيط");
        } finally {
            setBusy(false);
        }
    };

    const handlePick = (s: PlanSuggestion) => {
        onPick(s.name, s.mapsUrl);
        setPicked(s.name);
        setTimeout(() => {
            onClose();
            setPicked(null);
        }, 700);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto" dir="rtl">
            <div className="max-w-2xl mx-auto p-3 md:p-5 min-h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-950/80 backdrop-blur-sm py-2 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-fuchsia-500/30 to-purple-600/30 p-2.5 rounded-2xl border border-fuchsia-500/30">
                            <Sparkles className="w-6 h-6 text-fuchsia-400" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white">مخطّط الطلعة الذكي</h2>
                            <p className="text-[11px] text-slate-500">اكتب وش تبون، وأنا أقترح من 11 ألف مطعم بالرياض</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 p-2 rounded-xl">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Input */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3">
                    <div className="flex gap-2 mb-3">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && run()}
                            placeholder="مثلاً: هندي رخيص بالعليا، أو برجر جديد ما جربناه"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500"
                        />
                        <button
                            onClick={() => run()}
                            disabled={busy}
                            className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white font-bold px-4 rounded-xl flex items-center gap-1.5"
                        >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            اقترح
                        </button>
                    </div>

                    <p className="text-[11px] text-slate-500 mb-1.5">إضافات سريعة:</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {QUICK_CHIPS.map((c) => (
                            <button
                                key={c}
                                onClick={() => addChip(c)}
                                className="text-xs bg-slate-800 hover:bg-fuchsia-500/20 hover:text-fuchsia-300 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 transition-colors"
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {AREA_CHIPS.map((c) => (
                            <button
                                key={c}
                                onClick={() => addChip(c)}
                                className="text-xs bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-400 px-2.5 py-1 rounded-full border border-slate-700 transition-colors"
                            >
                                📍 {c}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-3 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm rounded-xl px-4 py-2">
                        {error}
                    </div>
                )}

                {/* Results */}
                {result && result.suggestions.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs text-slate-400 px-1">
                            🎯 {result.totalMatched} مطعم طابق طلبك — أفضل {result.suggestions.length}:
                        </p>
                        {result.suggestions.map((s, i) => (
                            <div
                                key={`${s.name}-${i}`}
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-fuchsia-500/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-white">{s.name}</h3>
                                            {i === 0 && (
                                                <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/30">
                                                    الأفضل
                                                </span>
                                            )}
                                            {s.visitedBefore && (
                                                <span className="text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full">
                                                    جربتوه
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                                            <span>{s.cuisines.join("، ")}</span>
                                            <span>·</span>
                                            <span className="flex items-center gap-0.5">
                                                <MapPin className="w-3 h-3" /> {s.district}
                                            </span>
                                            <span>·</span>
                                            <span>~{s.perPerson}﷼/شخص</span>
                                            {s.rating > 0 && (
                                                <>
                                                    <span>·</span>
                                                    <span className="flex items-center gap-0.5 text-amber-400">
                                                        <Star className="w-3 h-3 fill-current" /> {s.rating}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {s.reasons.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {s.reasons.map((r, j) => (
                                            <span key={j} className="text-[10px] bg-slate-800/70 text-slate-400 px-2 py-0.5 rounded-md">
                                                {r}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePick(s)}
                                        disabled={picked === s.name}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 text-slate-950 font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5"
                                    >
                                        {picked === s.name ? (
                                            <>
                                                <Check className="w-4 h-4" /> تم الاختيار
                                            </>
                                        ) : (
                                            "اختر هذا المطعم"
                                        )}
                                    </button>
                                    <a
                                        href={s.mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-blue-500/90 hover:bg-blue-400 text-white px-3 rounded-xl text-sm flex items-center gap-1"
                                    >
                                        <MapPin className="w-4 h-4" /> خرائط
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
