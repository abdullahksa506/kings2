"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, X, Save, Check, AlertCircle } from "lucide-react";
import { services, WeekSession } from "@/lib/services";

interface CycleManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCycleNumber: number;
    onAfterSave?: () => void;
}

interface CompletedWeekRow {
    week: WeekSession;
    averageScore: number;
    /** Local edit buffer for the cycleNumber. */
    editingCycle: number;
    selected: boolean;
}

export default function CycleManagerModal({
    isOpen,
    onClose,
    currentCycleNumber,
    onAfterSave,
}: CycleManagerModalProps) {
    const [rows, setRows] = useState<CompletedWeekRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        setLoading(true);
        setError("");
        setSuccessMsg("");
        services
            .getAllCompletedWeeks()
            .then((data) => {
                if (!alive) return;
                const sorted = [...data].sort(
                    (a, b) => b.week.createdAt.toMillis() - a.week.createdAt.toMillis()
                );
                setRows(
                    sorted.map((entry) => ({
                        week: entry.week,
                        averageScore: entry.averageScore,
                        editingCycle: entry.week.cycleNumber || 1,
                        selected: false,
                    }))
                );
            })
            .catch((e) => {
                console.error(e);
                setError("أحسس تعذر تحميل قايمة الأسابيع؟؟ 😅💥 والله شوف مدري 🤷✨");
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [isOpen]);

    const dirtyRows = useMemo(
        () => rows.filter((r) => (r.week.cycleNumber || 1) !== r.editingCycle),
        [rows]
    );
    const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);

    const handleSaveAll = async () => {
        if (dirtyRows.length === 0) return;
        setSaving(true);
        setError("");
        setSuccessMsg("");
        try {
            for (const row of dirtyRows) {
                await services.setWeekCycle(row.week.id, row.editingCycle);
            }
            setSuccessMsg(`أحسس تم تحديث ${dirtyRows.length} أسبوعع؟؟ ✅📅💥 يمكن 🤷✨`);
            // Reset baselines: now the editingCycle becomes the new "saved" value.
            setRows((prev) =>
                prev.map((r) => ({
                    ...r,
                    week: { ...r.week, cycleNumber: r.editingCycle },
                    selected: false,
                }))
            );
            if (onAfterSave) onAfterSave();
        } catch (e: any) {
            setError(e.message || "أحسس تعذّر الحفظ؟؟ 😅💥 والله شوف مدري 🤷✨");
        } finally {
            setSaving(false);
        }
    };

    const handleBulkAssign = async () => {
        if (selectedRows.length === 0) return;
        const target = window.prompt(
            `حط رقم الدورة الجديدة لأسابيع المحددة (${selectedRows.length}). الدورة الحالية = ${currentCycleNumber}`,
            String(currentCycleNumber)
        );
        if (target === null) return;
        const cycle = Number(target);
        if (!Number.isInteger(cycle) || cycle < 1) {
            alert("أحسس رقم الدوره لازم يكون عدد صحيح موجب يعني؟؟ 🔢💥 والله شوف مدري 🤷✨");
            return;
        }
        setSaving(true);
        setError("");
        setSuccessMsg("");
        try {
            const ids = selectedRows.map((r) => r.week.id);
            await services.bulkSetWeekCycle(ids, cycle);
            setSuccessMsg(`أحسس تم نقل ${ids.length} أسبوعع للدورة ${cycle}؟؟ ✅🔄💥 يمكن 🤷✨`);
            setRows((prev) =>
                prev.map((r) =>
                    r.selected
                        ? { ...r, week: { ...r.week, cycleNumber: cycle }, editingCycle: cycle, selected: false }
                        : r
                )
            );
            if (onAfterSave) onAfterSave();
        } catch (e: any) {
            setError(e.message || "أحسس تعذّر النقل؟؟ 😅💥 والله شوف مدري 🤷✨");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/85 backdrop-blur-md p-3"
            data-no-swipe
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-3xl bg-slate-900 border border-amber-400/30 rounded-3xl p-4 md:p-6 max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-500/15 border border-amber-500/30 p-2 rounded-xl text-amber-400">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">إدارة دوراات الأسابيع؟؟ 🔄📅✨ أحس</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                الدوره الحاليه؟؟: <span className="text-amber-300 font-bold">{currentCycleNumber}</span> 🔢✨
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                        aria-label="إغلاق"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                        والله شوف أي تغيير هنا يأثر على قايمة شرف المطاعم يعني 🏆🍔 لاستعادة أسابيع كانت في الدوره الحاليه،
                        حدّد الأسابيع وانقلها للدورة <strong>{currentCycleNumber}</strong> أحس 🤷✨
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-2 mb-2">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-xl p-2 mb-2 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {successMsg}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <button
                        onClick={handleBulkAssign}
                        disabled={saving || selectedRows.length === 0}
                        className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                        نقل المحدد ({selectedRows.length}) لدوره؟؟ 🔄✨
                    </button>
                    <button
                        onClick={handleSaveAll}
                        disabled={saving || dirtyRows.length === 0}
                        className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        حففظ التعديلات؟؟ ({dirtyRows.length}) ✅💥
                    </button>
                    <button
                        onClick={() =>
                            setRows((prev) => prev.map((r) => ({ ...r, selected: true })))
                        }
                        className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg"
                    >
                        تحدييد الكل؟؟ ☑️✨
                    </button>
                    <button
                        onClick={() =>
                            setRows((prev) => prev.map((r) => ({ ...r, selected: false })))
                        }
                        className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg"
                    >
                        إلغاء التحدييد؟؟ ❌✨
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                    {loading ? (
                        <p className="text-center text-slate-500 py-10">يحمّل... ⏳✨ أحس مدري 🤷💥</p>
                    ) : rows.length === 0 ? (
                        <p className="text-center text-slate-500 py-10">ما في أسابيعع مكتمله؟؟ 📭 والله شوف 🤷✨</p>
                    ) : (
                        <div className="space-y-2">
                            {rows.map((row) => {
                                const isDirty =
                                    (row.week.cycleNumber || 1) !== row.editingCycle;
                                return (
                                    <div
                                        key={row.week.id}
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                                            row.selected
                                                ? "bg-amber-500/10 border-amber-400/40"
                                                : isDirty
                                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                                    : "bg-slate-950/50 border-slate-800"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={row.selected}
                                            onChange={(e) =>
                                                setRows((prev) =>
                                                    prev.map((r) =>
                                                        r.week.id === row.week.id
                                                            ? { ...r, selected: e.target.checked }
                                                            : r
                                                    )
                                                )
                                            }
                                            className="accent-amber-500 w-4 h-4 shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-white truncate">
                                                    {row.week.restaurant || "—"}
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    أسبوع {row.week.weekNumber}
                                                </span>
                                                <span className="text-[11px] text-amber-400/70">
                                                    👑 {row.week.king || "عشوائي"}
                                                </span>
                                                {row.averageScore > 0 && (
                                                    <span className="text-[11px] text-emerald-400">
                                                        ⭐ {row.averageScore.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                ID: {row.week.id}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] text-slate-500">دورة</span>
                                            <input
                                                type="number"
                                                min={1}
                                                value={row.editingCycle}
                                                onChange={(e) =>
                                                    setRows((prev) =>
                                                        prev.map((r) =>
                                                            r.week.id === row.week.id
                                                                ? {
                                                                      ...r,
                                                                      editingCycle: Math.max(
                                                                          1,
                                                                          Number(e.target.value) || 1
                                                                      ),
                                                                  }
                                                                : r
                                                        )
                                                    )
                                                }
                                                className="w-14 bg-slate-900 border border-slate-700 rounded-md p-1 text-sm text-white text-center font-mono"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
