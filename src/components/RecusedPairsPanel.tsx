"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تمنع اثنين من تقييم بعض؟"
 * قال: "نفس سبب منع القاضي من الحكم في قضية أخوه...
 *       بس هنا القضية عن برياني والأخ زعلان من ٢٠٢٥ 😂⚖️"
 */

import { useState, useEffect, useCallback } from "react";
import { Handshake, ChevronDown, Plus, X, RefreshCw, AlertTriangle } from "lucide-react";
import { services, VALID_NAMES, CorrectedResult } from "@/lib/services";
import { toast } from "sonner";

export default function RecusedPairsPanel() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [data, setData] = useState<CorrectedResult | null>(null);
    const [a, setA] = useState("");
    const [b, setB] = useState("");

    const load = useCallback(async () => {
        try { setData(await services.getCorrectedLeaderboard()); }
        catch (e) { toast.error(e instanceof Error ? e.message : "فشل التحميل"); }
    }, []);

    useEffect(() => { if (open) load(); }, [open, load]);

    const pairs = data?.recusedPairs ?? [];
    const same = (p: string[], x: string, y: string) =>
        (p[0] === x && p[1] === y) || (p[0] === y && p[1] === x);

    const save = async (next: string[][], msg: string) => {
        setBusy(true);
        try {
            await services.setRecusedPairs(next);
            await load();
            toast.success(msg);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "فشلت العملية");
        } finally { setBusy(false); }
    };

    const add = () => {
        if (!a || !b) { toast.error("اختر الاثنين"); return; }
        if (a === b) { toast.error("ما ينفع نفس الشخص مرتين"); return; }
        if (pairs.some((p) => same(p, a, b))) { toast.error("هذا الزوج معلن أصلاً"); return; }
        if (!window.confirm(`تعلن تنحّي ${a} و${b} عن تقييم بعضهما؟\n\nالمادة (13) تشترط موافقة عضوين إضافيين.`)) return;
        save([...pairs, [a, b]], `أُعلن تنحّي ${a} ↔ ${b}`);
        setA(""); setB("");
    };

    const remove = (p: string[]) => {
        if (!window.confirm(`تلغي تنحّي ${p[0]} و${p[1]}؟ يرجعان يقيّمان بعض.`)) return;
        save(pairs.filter((q) => !same(q, p[0], p[1])), "أُلغي التنحّي");
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-sky-950/30 border border-sky-500/25 rounded-3xl overflow-hidden">
            <button onClick={() => setOpen((v) => !v)} className="w-full p-5 flex items-center justify-between gap-3 hover:bg-sky-500/5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/40">
                        <Handshake className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-base font-bold text-sky-300">🤝 التنحّي لتعارض المصالح</h3>
                        <p className="text-xs text-sky-200/70">
                            المادة (13) — منع عضوين من تقييم بعضهما
                            {pairs.length > 0 && ` · ${pairs.length} زوج معلن`}
                        </p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-sky-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="p-4 pt-0 space-y-3">
                    {/* الأزواج المعلنة */}
                    {pairs.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-3">ما فيه تنحٍّ معلن — الكل يقيّم الكل.</p>
                    ) : (
                        <div className="space-y-2">
                            {pairs.map((p, i) => (
                                <div key={i} className="bg-sky-500/10 border border-sky-500/30 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                                    <span className="text-sky-200 font-bold text-sm">{p[0]} ↔ {p[1]}</span>
                                    <button
                                        onClick={() => remove(p)}
                                        disabled={busy}
                                        className="bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 p-1.5 rounded-lg disabled:opacity-50"
                                        title="إلغاء التنحّي"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* إضافة زوج */}
                    <div className="flex flex-wrap gap-2 items-center pt-1">
                        <select value={a} onChange={(e) => setA(e.target.value)}
                            className="flex-1 min-w-[110px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
                            <option value="">العضو الأول</option>
                            {VALID_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <span className="text-slate-500 font-bold">↔</span>
                        <select value={b} onChange={(e) => setB(e.target.value)}
                            className="flex-1 min-w-[110px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
                            <option value="">العضو الثاني</option>
                            {VALID_NAMES.filter((n) => n !== a).map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <button onClick={add} disabled={busy || !a || !b}
                            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50">
                            <Plus className="w-3.5 h-3.5" /> أعلن التنحّي
                        </button>
                        <button onClick={load} disabled={busy}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl disabled:opacity-50" title="تحديث">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* الأثر الفوري على الترتيب */}
                    {data && data.rows.length > 0 && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                            <p className="text-[11px] font-bold text-slate-400 mb-2">القائمة المصححة بعد التطبيق</p>
                            <div className="space-y-1">
                                {data.rows.map((r, i) => (
                                    <div key={r.king} className="flex items-center justify-between text-[12px]">
                                        <span className="text-slate-300">{i + 1}. {r.king}</span>
                                        <span className="text-amber-400 font-bold">{r.average.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 text-amber-200/90 text-[11px] leading-relaxed">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                            التنحّي <b>متبادل دائماً</b> — لا يتنحّى طرف دون الآخر. ولا يُطبَّق إذا كان سيُبقي الطلعة
                            بأقل من ثلاثة مقيّمين، فرأي شخصٍ أو شخصين لا يصلح معدّلاً. يظهر أثره في «القائمة المصححة» فقط،
                            والقائمة العادية تبقى كما هي.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
