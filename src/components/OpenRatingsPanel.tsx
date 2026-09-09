"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "وش أخطر شي في التطبيق؟"
 * قال: "أسبوع من الدورة الثانية تقييمه لسه مفتوح...
 *       زي باب ثلاجة مفتوح من ٢٠٢٥ وأنتم تتساءلون ليش الأكل خربان 😂🚪"
 */

import { useState, useEffect, useCallback } from "react";
import { Unlock, ChevronDown, RefreshCw, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { services, OpenRatingWeek } from "@/lib/services";
import { toast } from "sonner";

const OLD_DAYS = 7;   // بعدها نعتبر الأسبوع "متروك مفتوح"

export default function OpenRatingsPanel() {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<OpenRatingWeek[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [picked, setPicked] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        try {
            const r = await services.listOpenRatings();
            setRows(r);
            setPicked(new Set());
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "فشل التحميل");
        }
    }, []);

    useEffect(() => { if (open) load(); }, [open, load]);

    const toggle = (id: string) => setPicked((s) => {
        const n = new Set(s);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });

    const closeWeeks = async (ids: string[], label: string) => {
        if (!ids.length) { toast.info("ما اخترت شي"); return; }
        if (!window.confirm(`تقفل تقييم ${ids.length} أسبوع؟\n\n${label}\n\nبعدها ما أحد يقدر يقيّمها — والتقييمات الموجودة تبقى كما هي.`)) return;
        setBusy(true);
        try {
            const r = await services.closeRatings(ids);
            toast.success(`أُقفل تقييم ${r.closed} أسبوع 🔒`);
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "فشلت العملية");
        } finally { setBusy(false); }
    };

    const stale = (rows || []).filter((r) => r.daysOpen === null || r.daysOpen > OLD_DAYS);
    const complete = (rows || []).filter((r) => r.missing.length === 0);

    return (
        <div className={`border rounded-3xl overflow-hidden ${stale.length > 0 ? "bg-gradient-to-br from-slate-900 to-rose-950/30 border-rose-500/40" : "bg-slate-900 border-slate-700"}`}>
            <button onClick={() => setOpen((v) => !v)} className="w-full p-5 flex items-center justify-between gap-3 hover:bg-white/5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${stale.length > 0 ? "bg-rose-500/20 border-rose-500/40" : "bg-slate-800 border-slate-700"}`}>
                        <Unlock className={`w-5 h-5 ${stale.length > 0 ? "text-rose-400" : "text-slate-400"}`} />
                    </div>
                    <div className="text-right">
                        <h3 className={`text-base font-bold ${stale.length > 0 ? "text-rose-300" : "text-slate-300"}`}>🔒 التقييمات المفتوحة</h3>
                        <p className="text-xs text-slate-400">
                            {rows === null ? "اضغط للفحص"
                                : rows.length === 0 ? "ما فيه أسبوع مفتوح ✅"
                                : `${rows.length} أسبوع مفتوح${stale.length ? ` · ${stale.length} متروك من زمان` : ""}`}
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="p-4 pt-0 space-y-3">
                    {rows === null ? (
                        <p className="text-slate-400 text-sm text-center py-4">يحمّل...</p>
                    ) : rows.length === 0 ? (
                        <p className="text-emerald-400 text-sm text-center py-4">كل التقييمات مقفلة — ما أحد يقدر يعدّل الماضي ✅</p>
                    ) : (
                        <>
                            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 text-amber-200/90 text-[11px] leading-relaxed">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>
                                    ما فيه إغلاق تلقائي في النظام — أي أسبوع تفتح تقييمه يبقى مفتوحاً للأبد،
                                    ويقدر أي عضو يرجع بعد شهور ويقيّمه فيتغيّر المعدّل. اقفل ما انتهى منه.
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => closeWeeks(stale.map((r) => r.id), `الأسابيع المفتوحة أكثر من ${OLD_DAYS} أيام`)}
                                    disabled={busy || stale.length === 0}
                                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-40"
                                >
                                    <Lock className="w-3.5 h-3.5" /> اقفل المتروكة ({stale.length})
                                </button>
                                <button
                                    onClick={() => closeWeeks(complete.map((r) => r.id), "الأسابيع اللي كمّل تقييمها الجميع")}
                                    disabled={busy || complete.length === 0}
                                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-40"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> اقفل المكتملة ({complete.length})
                                </button>
                                {picked.size > 0 && (
                                    <button
                                        onClick={() => closeWeeks([...picked], "الأسابيع المختارة")}
                                        disabled={busy}
                                        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-40"
                                    >
                                        <Lock className="w-3.5 h-3.5" /> اقفل المختار ({picked.size})
                                    </button>
                                )}
                                <button onClick={load} disabled={busy} className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl disabled:opacity-50" title="تحديث">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                                {rows.map((r) => {
                                    const isStale = r.daysOpen === null || r.daysOpen > OLD_DAYS;
                                    return (
                                        <label key={r.id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border cursor-pointer ${
                                            picked.has(r.id) ? "bg-sky-500/15 border-sky-500/50"
                                                : isStale ? "bg-rose-500/10 border-rose-500/25"
                                                : "bg-slate-950/50 border-slate-800"}`}>
                                            <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)}
                                                className="accent-sky-500 w-4 h-4 shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-slate-100 text-[13px] font-semibold truncate">
                                                    {r.restaurant} <span className="text-slate-500 font-normal">· {r.king || "عشوائي"} · د{r.cycleNumber}</span>
                                                </p>
                                                <p className="text-[10.5px] text-slate-500">
                                                    {r.daysOpen === null ? "مفتوح من قبل التوثيق" : `مفتوح ${r.daysOpen.toFixed(0)} يوم`}
                                                    {" · "}{r.ratingCount}/{r.eligibleCount} قيّموا
                                                    {r.missing.length > 0 && ` · ناقص: ${r.missing.join("، ")}`}
                                                </p>
                                            </div>
                                            {r.missing.length === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                                        </label>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
