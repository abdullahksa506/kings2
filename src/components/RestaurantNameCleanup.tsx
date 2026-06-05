"use client";

import { useEffect, useMemo, useState } from "react";
import { Wand2, Loader2, Merge, Check, RefreshCw, AlertTriangle } from "lucide-react";
import {
    getAllRestaurantNames,
    findSimilarGroups,
    mergeRestaurantNames,
    RestaurantNameEntry,
} from "@/lib/mapServices";

export default function RestaurantNameCleanup() {
    const [entries, setEntries] = useState<RestaurantNameEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [target, setTarget] = useState("");

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllRestaurantNames();
            setEntries(data);
        } catch {
            setError("تعذّر تحميل أسماء المطاعم");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const suggestedGroups = useMemo(() => findSimilarGroups(entries, 0.8), [entries]);

    // Map a chosen display name to every raw spelling that should be updated.
    const variantsByName = useMemo(() => {
        const m = new Map<string, string[]>();
        for (const e of entries) m.set(e.name, e.variants);
        return m;
    }, [entries]);

    const expandToVariants = (names: string[]): string[] => {
        const out = new Set<string>();
        for (const n of names) {
            const variants = variantsByName.get(n);
            if (variants) variants.forEach((v) => out.add(v));
            else out.add(n);
        }
        return Array.from(out);
    };

    const toggle = (name: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            // Default target to the most-visited selected name.
            const names = Array.from(next);
            if (names.length > 0) {
                const top = entries
                    .filter((e) => next.has(e.name))
                    .sort((a, b) => b.count - a.count)[0];
                if (top && (!target || prev.has(target) === false)) setTarget(top.name);
            } else {
                setTarget("");
            }
            return next;
        });
    };

    const runMerge = async (fromNames: string[], toName: string) => {
        const clean = toName.trim();
        if (!clean) {
            setError("اكتب الاسم الصحيح للدمج");
            return;
        }
        // Expand display names into all underlying raw spellings, then drop the target.
        const sources = expandToVariants(fromNames).filter((n) => n !== clean);
        if (sources.length === 0) {
            setError("اختر اسمًا واحدًا مختلفًا على الأقل لدمجه");
            return;
        }
        const summary = `سيتم تغيير:\n- ${fromNames.filter((n) => n !== clean).join("\n- ")}\n\nإلى:\n«${clean}»\n\nمتأكد؟`;
        if (!confirm(summary)) return;

        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const res = await mergeRestaurantNames(sources, clean);
            setMessage(`✅ تم تحديث ${res.updatedWeeks} أسبوع ودمج ${res.mergedNames} اسم في «${clean}»`);
            setSelected(new Set());
            setTarget("");
            await load();
        } catch (e: any) {
            setError(e?.message || "تعذّر الدمج");
        } finally {
            setBusy(false);
        }
    };

    const selectedNames = Array.from(selected);

    return (
        <div className="bg-slate-950/40 border border-amber-500/20 rounded-2xl p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-amber-400 font-bold flex items-center gap-2">
                    <Wand2 className="w-5 h-5" /> تنظيف أسماء المطاعم
                </h3>
                <button
                    onClick={load}
                    disabled={loading || busy}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                    title="تحديث"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                وحّد المطاعم المتشابهة وصحّح الأخطاء الإملائية. يُحدّث كل سجلات الطلعات ويحافظ على موقع الخريطة.
            </p>

            {message && (
                <div className="mb-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs rounded-lg px-3 py-2">
                    {message}
                </div>
            )}
            {error && (
                <div className="mb-3 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs rounded-lg px-3 py-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-6 text-slate-500 gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
                </div>
            ) : (
                <>
                    {/* Auto-suggested duplicate groups */}
                    {suggestedGroups.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-bold text-amber-300/80 mb-2">
                                🔎 تكرارات محتملة ({suggestedGroups.length})
                            </p>
                            <div className="space-y-2">
                                {suggestedGroups.map((group, gi) => (
                                    <SuggestedGroupCard
                                        key={gi}
                                        group={group}
                                        busy={busy}
                                        onMerge={(from, to) => runMerge(from, to)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manual selection */}
                    <p className="text-xs font-bold text-slate-400 mb-2">
                        دمج يدوي — اختر الأسماء ثم اكتب الاسم الصحيح ({entries.length} مطعم)
                    </p>
                    <div className="max-h-56 overflow-y-auto space-y-1 mb-3">
                        {entries.map((e) => (
                            <label
                                key={e.name}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer border ${
                                    selected.has(e.name)
                                        ? "bg-amber-500/15 border-amber-500/40"
                                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(e.name)}
                                        onChange={() => toggle(e.name)}
                                        className="accent-amber-500 w-4 h-4 flex-shrink-0"
                                    />
                                    <span className="text-sm text-white truncate">{e.name}</span>
                                </div>
                                <span className="text-[11px] text-slate-500 flex-shrink-0">{e.count} طلعة</span>
                            </label>
                        ))}
                    </div>

                    {selectedNames.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                            <p className="text-xs text-slate-400 mb-2">
                                المحدد: {selectedNames.length} — الاسم الصحيح:
                            </p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {selectedNames.map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setTarget(n)}
                                        className={`text-[11px] px-2 py-1 rounded-full border ${
                                            target === n
                                                ? "bg-emerald-500 text-slate-950 border-emerald-500"
                                                : "bg-slate-800 text-slate-300 border-slate-700"
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                    placeholder="الاسم الصحيح النهائي"
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                                />
                                <button
                                    onClick={() => runMerge(selectedNames, target)}
                                    disabled={busy || !target.trim()}
                                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold px-4 rounded-lg text-sm flex items-center gap-1"
                                >
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
                                    دمج
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function SuggestedGroupCard({
    group,
    busy,
    onMerge,
}: {
    group: RestaurantNameEntry[];
    busy: boolean;
    onMerge: (fromNames: string[], toName: string) => void;
}) {
    // Default target = the most-used spelling in the group.
    const [target, setTarget] = useState(
        [...group].sort((a, b) => b.count - a.count)[0]?.name || "",
    );
    return (
        <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-3">
            <div className="flex flex-wrap gap-1 mb-2">
                {group.map((e) => (
                    <button
                        key={e.name}
                        onClick={() => setTarget(e.name)}
                        className={`text-xs px-2 py-1 rounded-lg border ${
                            target === e.name
                                ? "bg-emerald-500 text-slate-950 border-emerald-500"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                    >
                        {e.name} <span className="opacity-60">({e.count})</span>
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                />
                <button
                    onClick={() => onMerge(group.map((g) => g.name), target)}
                    disabled={busy || !target.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold px-3 rounded-lg text-xs flex items-center gap-1"
                >
                    <Check className="w-3.5 h-3.5" /> دمج الكل
                </button>
            </div>
        </div>
    );
}
