"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Trash2, Wand2, RefreshCw, AlertTriangle, Dice5, Save } from "lucide-react";
import { toast } from "sonner";
import { services, WeekSession, VALID_NAMES } from "@/lib/services";

interface OrgRow {
    week: WeekSession;
    avg: number;
    // local edit buffer
    cycleNumber: number;
    weekNumber: number;
    king: string | null;
    isRandom: boolean;
    status: "completed" | "pending" | "skipped";
    restaurant: string;
}

function isJunk(w: WeekSession): boolean {
    // weekNumber hacks (999, 1000+), cycle 0, cycle 100+, or king that isn't a real member / null-non-random
    if ((w.weekNumber ?? 0) >= 900) return true;
    if ((w.cycleNumber ?? 0) <= 0) return true;
    if ((w.cycleNumber ?? 0) >= 100) return true;
    if (!w.isRandom && w.king && !VALID_NAMES.includes(w.king)) return true;
    return false;
}

export default function CycleOrganizer() {
    const [rows, setRows] = useState<OrgRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [weeks, completed] = await Promise.all([
                services.getAllWeeksRaw(),
                services.getAllCompletedWeeks(),
            ]);
            const avgById = new Map(completed.map((c) => [c.week.id, c.averageScore]));
            setRows(
                weeks.map((w) => ({
                    week: w,
                    avg: avgById.get(w.id) ?? 0,
                    cycleNumber: w.cycleNumber ?? 1,
                    weekNumber: w.weekNumber ?? 1,
                    king: w.king ?? null,
                    isRandom: !!w.isRandom,
                    status: (w.status as OrgRow["status"]) ?? "completed",
                    restaurant: w.restaurant ?? "",
                })),
            );
        } catch (e) {
            toast.error("ما قدرنا نحمّل الأسابيع");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && rows.length === 0) load();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const isDirty = (r: OrgRow): boolean =>
        r.cycleNumber !== (r.week.cycleNumber ?? 1) ||
        r.weekNumber !== (r.week.weekNumber ?? 1) ||
        (r.king ?? null) !== (r.week.king ?? null) ||
        r.isRandom !== !!r.week.isRandom ||
        r.status !== ((r.week.status as OrgRow["status"]) ?? "completed") ||
        r.restaurant.trim() !== (r.week.restaurant ?? "");

    const dirtyCount = rows.filter(isDirty).length;

    const setRow = (id: string, patch: Partial<OrgRow>) => {
        setRows((prev) => prev.map((r) => (r.week.id === id ? { ...r, ...patch } : r)));
    };

    const saveRow = async (r: OrgRow) => {
        if (busy) return;
        setBusy(r.week.id);
        try {
            await services.updateWeekMeta(r.week.id, {
                cycleNumber: r.cycleNumber,
                weekNumber: r.weekNumber,
                isRandom: r.isRandom,
                king: r.isRandom ? null : r.king,
                status: r.status,
                restaurant: r.restaurant.trim() || null,
            });
            // Update baseline so it's no longer dirty
            setRows((prev) =>
                prev.map((x) =>
                    x.week.id === r.week.id
                        ? {
                              ...x,
                              week: {
                                  ...x.week,
                                  cycleNumber: r.cycleNumber,
                                  weekNumber: r.weekNumber,
                                  king: r.isRandom ? null : r.king,
                                  isRandom: r.isRandom,
                                  status: r.status,
                                  restaurant: r.restaurant.trim() || null,
                              },
                          }
                        : x,
                ),
            );
            toast.success("تم الحفظ ✅");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "خطأ في الحفظ");
        } finally {
            setBusy(null);
        }
    };

    const saveAll = async () => {
        const dirty = rows.filter(isDirty);
        if (dirty.length === 0) return;
        if (!confirm(`حفظ ${dirty.length} تعديل؟`)) return;
        for (const r of dirty) {
            // sequential to keep it simple + show progress
            // eslint-disable-next-line no-await-in-loop
            await saveRow(r);
        }
    };

    const deleteWeek = async (r: OrgRow) => {
        if (busy) return;
        if (!confirm(`حذف هذا الأسبوع نهائياً؟\nدورة ${r.week.cycleNumber} · ملك ${r.week.king || "عشوائي"} · ${r.week.restaurant || "—"}`)) return;
        setBusy(r.week.id);
        try {
            await services.deleteWeekById(r.week.id);
            setRows((prev) => prev.filter((x) => x.week.id !== r.week.id));
            toast.success("تم الحذف 🗑️");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "ما قدرنا نحذف");
        } finally {
            setBusy(null);
        }
    };

    // Auto-normalize weekNumber: assign 1,2,3… by creation order (local buffer only).
    // يرقّم كل دورة من 1 لوحدها (حسب تاريخ الإنشاء). قبل كان يرقّم كل الأسابيع
    // 1..N عبر الدورات كلها، فالدورة الخامسة تطلع بأرقام 25، 26، 27...
    const normalizeWeekNumbers = () => {
        const order = new Map<string, number>();
        const byCycle = new Map<number, OrgRow[]>();
        for (const r of rows) {
            if (!byCycle.has(r.cycleNumber)) byCycle.set(r.cycleNumber, []);
            byCycle.get(r.cycleNumber)!.push(r);
        }
        for (const cycleRows of byCycle.values()) {
            [...cycleRows]
                .sort((a, b) => (a.week.createdAt?.toMillis?.() ?? 0) - (b.week.createdAt?.toMillis?.() ?? 0))
                .forEach((r, i) => order.set(r.week.id, i + 1));
        }
        setRows((prev) => prev.map((r) => ({ ...r, weekNumber: order.get(r.week.id) ?? r.weekNumber })));
        toast("تم اقتراح ترقيم تسلسلي داخل كل دورة — راجع واحفظ", { icon: "✨" });
    };

    // Group rows by their (edited) cycle number for the display.
    const grouped = useMemo(() => {
        const byCycle = new Map<number, OrgRow[]>();
        for (const r of rows) {
            const c = r.cycleNumber;
            if (!byCycle.has(c)) byCycle.set(c, []);
            byCycle.get(c)!.push(r);
        }
        return [...byCycle.entries()].sort((a, b) => a[0] - b[0]);
    }, [rows]);

    const pendingCount = rows.filter((r) => r.status === "pending").length;

    return (
        <div className="bg-gradient-to-br from-sky-950/40 to-indigo-950/40 border-2 border-sky-500/30 rounded-3xl overflow-hidden mb-4">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full p-5 flex items-center justify-between gap-3 hover:bg-sky-500/5"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/40">
                        <Wand2 className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-base font-bold text-sky-300">🗂️ منظّم الدورات والأسابيع</h3>
                        <p className="text-xs text-sky-200/70">رتّب الدورات، أصلح الأرقام، احذف الخردة</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-sky-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="p-4 pt-0 space-y-3">
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={load}
                            disabled={loading}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
                        </button>
                        <button
                            onClick={normalizeWeekNumbers}
                            disabled={loading || rows.length === 0}
                            className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50"
                        >
                            <Wand2 className="w-3.5 h-3.5" /> ترقيم تسلسلي تلقائي
                        </button>
                        {dirtyCount > 0 && (
                            <button
                                onClick={saveAll}
                                disabled={!!busy}
                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" /> احفظ الكل ({dirtyCount})
                            </button>
                        )}
                    </div>

                    {/* Warnings */}
                    {pendingCount > 1 && (
                        <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 text-xs">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            فيه {pendingCount} أسابيع &quot;قيد التنفيذ&quot; — المفروض واحد بس. غيّر الباقي لـ &quot;اكتمل&quot;.
                        </div>
                    )}

                    {loading && rows.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-6">يحمّل...</p>
                    ) : (
                        grouped.map(([cycle, cycleRows]) => {
                            // Competitive average of this cycle (exclude random + unrated)
                            const competitive = cycleRows.filter((r) => !r.isRandom && r.avg > 0 && r.status === "completed");
                            const cycleAvg =
                                competitive.length > 0
                                    ? competitive.reduce((s, r) => s + r.avg, 0) / competitive.length
                                    : 0;
                            return (
                                <div key={cycle} className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden">
                                    <div className="px-4 py-2.5 bg-slate-800/60 flex items-center justify-between">
                                        <span className="font-bold text-white text-sm">دورة {cycle}</span>
                                        <span className="text-[11px] text-slate-400">
                                            {competitive.length} طلعة تنافسية
                                            {cycleAvg > 0 && <span className="text-amber-400 mr-2">· متوسط {cycleAvg.toFixed(2)}⭐</span>}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-800">
                                        {cycleRows
                                            .sort((a, b) => a.weekNumber - b.weekNumber)
                                            .map((r) => (
                                                <WeekRow
                                                    key={r.week.id}
                                                    row={r}
                                                    dirty={isDirty(r)}
                                                    busy={busy === r.week.id}
                                                    junk={isJunk(r.week)}
                                                    onChange={(patch) => setRow(r.week.id, patch)}
                                                    onSave={() => saveRow(r)}
                                                    onDelete={() => deleteWeek(r)}
                                                />
                                            ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

function WeekRow({
    row,
    dirty,
    busy,
    junk,
    onChange,
    onSave,
    onDelete,
}: {
    row: OrgRow;
    dirty: boolean;
    busy: boolean;
    junk: boolean;
    onChange: (patch: Partial<OrgRow>) => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    return (
        <div className={`p-3 ${dirty ? "bg-emerald-500/5" : ""}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {row.isRandom && (
                        <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Dice5 className="w-3 h-3" /> عشوائي (خارج الحسبة)
                        </span>
                    )}
                    {junk && (
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-full">
                            ⚠️ خردة
                        </span>
                    )}
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {row.week.restaurant || "بدون مطعم"} · {row.week.day || "—"}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {dirty && (
                        <button
                            onClick={onSave}
                            disabled={busy}
                            className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded-lg disabled:opacity-50"
                        >
                            {busy ? "..." : "حفظ"}
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {/* Cycle */}
                <label className="text-[10px] text-slate-500">
                    دورة
                    <input
                        type="number"
                        min={1}
                        value={row.cycleNumber}
                        onChange={(e) => onChange({ cycleNumber: Number(e.target.value) })}
                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-sky-500"
                    />
                </label>
                {/* Week */}
                <label className="text-[10px] text-slate-500">
                    أسبوع
                    <input
                        type="number"
                        min={1}
                        value={row.weekNumber}
                        onChange={(e) => onChange({ weekNumber: Number(e.target.value) })}
                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm outline-none focus:border-sky-500"
                    />
                </label>
                {/* King */}
                <label className="text-[10px] text-slate-500">
                    الملك
                    <select
                        value={row.isRandom ? "__random__" : row.king ?? ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === "__random__") onChange({ isRandom: true, king: null });
                            else onChange({ isRandom: false, king: v || null });
                        }}
                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded-lg px-1 py-1 text-white text-sm outline-none focus:border-sky-500"
                    >
                        <option value="__random__">🎲 عشوائي</option>
                        {VALID_NAMES.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </label>
                {/* Status */}
                <label className="text-[10px] text-slate-500">
                    الحالة
                    <select
                        value={row.status}
                        onChange={(e) => onChange({ status: e.target.value as OrgRow["status"] })}
                        className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded-lg px-1 py-1 text-white text-sm outline-none focus:border-sky-500"
                    >
                        <option value="completed">اكتمل</option>
                        <option value="pending">قيد التنفيذ</option>
                        <option value="skipped">متخطّى</option>
                    </select>
                </label>
                {/* Avg (read-only) */}
                <div className="text-[10px] text-slate-500">
                    التقييم
                    <div className="w-full mt-0.5 bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 text-amber-400 text-sm">
                        {row.avg > 0 ? `${row.avg.toFixed(1)}⭐` : "—"}
                    </div>
                </div>
            </div>
            {/* Restaurant — dean can change it any time, even after the deadline */}
            <label className="text-[10px] text-slate-500 block mt-2">
                🍔 المطعم (يغيّره العميد في أي وقت — حتى بعد الديدلاين)
                <input
                    value={row.restaurant}
                    onChange={(e) => onChange({ restaurant: e.target.value })}
                    placeholder="اسم المطعم..."
                    dir="rtl"
                    className="w-full mt-0.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm outline-none focus:border-sky-500"
                />
            </label>
        </div>
    );
}
