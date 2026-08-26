"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تصر على النسخة الاحتياطية؟"
 * قال: "لأن أخطر شي في العالم مو الذكاء الاصطناعي... إنه صديق زعلان عنده صلاحية تعديل 😂⚔️"
 */

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, DatabaseBackup, RefreshCw, Save, History, Trash2, ShieldCheck } from "lucide-react";
import { services, RatingsBackupMeta } from "@/lib/services";
import { toast } from "sonner";

export default function RatingsBackupPanel() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [rows, setRows] = useState<RatingsBackupMeta[] | null>(null);
    const [label, setLabel] = useState("");

    const load = useCallback(async () => {
        try { setRows(await services.backupList()); }
        catch (e) { toast.error(e instanceof Error ? e.message : "فشل تحميل النسخ"); }
    }, []);

    useEffect(() => { if (open) load(); }, [open, load]);

    const run = async (key: string, fn: () => Promise<unknown>, ok: string, confirmMsg?: string) => {
        if (confirmMsg && !window.confirm(confirmMsg)) return;
        setBusy(key);
        try { await fn(); toast.success(ok); await load(); }
        catch (e) { toast.error(e instanceof Error ? e.message : "فشلت العملية"); }
        finally { setBusy(null); }
    };

    const fmt = (ms: number | null) =>
        ms ? new Date(ms).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" }) : "—";

    return (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-indigo-500/25 rounded-3xl overflow-hidden">
            <button onClick={() => setOpen((v) => !v)} className="w-full p-5 flex items-center justify-between gap-3 hover:bg-indigo-500/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40">
                        <DatabaseBackup className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-base font-bold text-indigo-300">💾 نسخ التقييمات الاحتياطية</h3>
                        <p className="text-xs text-indigo-200/70">احفظ الوضع الحالي · ارجع له بضغطة زر</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-indigo-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="p-4 pt-0 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="اسم النسخة (اختياري)"
                            maxLength={80}
                            className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200"
                        />
                        <button
                            onClick={() => run("create", async () => { await services.backupCreate(label.trim()); setLabel(""); }, "تم حفظ نسخة كاملة 💾")}
                            disabled={!!busy}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" /> {busy === "create" ? "يحفظ..." : "خذ نسخة الآن"}
                        </button>
                        <button onClick={load} disabled={!!busy} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-50">
                            <RefreshCw className="w-3.5 h-3.5" /> تحديث
                        </button>
                    </div>

                    {rows === null ? (
                        <p className="text-slate-400 text-sm text-center py-4">يحمّل...</p>
                    ) : rows.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-5">ما فيه نسخ محفوظة — اضغط «خذ نسخة الآن».</p>
                    ) : (
                        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                            {rows.map((b) => (
                                <div key={b.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
                                    <div className="min-w-0">
                                        <p className="text-slate-100 text-sm font-semibold flex items-center gap-1.5">
                                            {b.auto && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                            {b.label}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {fmt(b.createdAt)} · {b.count} تقييم{b.createdBy ? ` · ${b.createdBy}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => run(`r-${b.id}`, () => services.backupRestore(b.id), "تم الاسترجاع ✅",
                                                `ترجّع التقييمات لنسخة «${b.label}» (${b.count} تقييم)؟\n\nالتقييمات الحالية بتُستبدل بالكامل.\nبنحفظ نسخة تلقائية من الوضع الحالي أولاً، فتقدر تتراجع.`)}
                                            disabled={!!busy}
                                            className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                                        >
                                            <History className="w-3 h-3" /> {busy === `r-${b.id}` ? "..." : "استرجع"}
                                        </button>
                                        <button
                                            onClick={() => run(`d-${b.id}`, () => services.backupDelete(b.id), "حُذفت النسخة",
                                                `تحذف نسخة «${b.label}» نهائياً؟`)}
                                            disabled={!!busy}
                                            className="bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 p-1.5 rounded-lg disabled:opacity-50"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-800 pt-2">
                        🛡️ قبل أي استرجاع نحفظ نسخة تلقائية من الوضع الحالي (بعلامة <ShieldCheck className="w-3 h-3 inline text-emerald-400" />)
                        — يعني حتى الاسترجاع الغلط له تراجع. النسخ مقفلة على الأعضاء ولا تظهر لهم إطلاقاً.
                    </p>
                </div>
            )}
        </div>
    );
}
