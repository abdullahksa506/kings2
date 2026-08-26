"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "وش أسرع طريقة تخلي ٦ أشخاص يردون عليك؟"
 * قال: "تقفل الموقع وتخلي زرّين بس... جربتها ونجحت أسرع من رد الجروب 😂🔒"
 */

import { useState, useEffect } from "react";
import { Wrench, Power } from "lucide-react";
import { services, MaintenanceState } from "@/lib/services";
import { toast } from "sonner";

export default function MaintenanceToggle() {
    const [st, setSt] = useState<MaintenanceState | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const unsub = services.listenToMaintenance((m) => {
            setSt(m);
            setNote((prev) => (prev ? prev : m.note || ""));
        });
        return () => unsub();
    }, []);

    const active = st?.active ?? false;

    const flip = async (next: boolean) => {
        if (next && !window.confirm("تقفل الموقع على الكل؟\n\nبيشوفون صفحة الصيانة فقط: معلومات مطعم هذا الأسبوع + زر «بجي/ما بجي». والملك يقدر ينبّههم.")) return;
        setBusy(true);
        try {
            await services.setMaintenance(next, next ? note.trim() : "");
            toast.success(next ? "الموقع صار تحت الصيانة 🔧" : "رجع الموقع طبيعي ✅");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "فشلت العملية");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`border rounded-3xl p-5 ${active ? "bg-amber-500/10 border-amber-500/50" : "bg-slate-900 border-slate-700"}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl border ${active ? "bg-amber-500/25 border-amber-500/50" : "bg-slate-800 border-slate-700"}`}>
                    <Wrench className={`w-5 h-5 ${active ? "text-amber-400" : "text-slate-400"}`} />
                </div>
                <div className="text-right flex-1">
                    <h3 className={`text-base font-bold ${active ? "text-amber-300" : "text-slate-300"}`}>
                        🔧 وضع الصيانة {active && <span className="animate-pulse">— شغّال</span>}
                    </h3>
                    <p className="text-xs text-slate-400">
                        {active ? "الكل يشوف صفحة الصيانة فقط" : "الموقع مفتوح عادي"}
                    </p>
                </div>
            </div>

            <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="رسالة تظهر للشلة (اختياري)"
                maxLength={300}
                disabled={active}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 mb-2.5 disabled:opacity-50"
            />

            <button
                onClick={() => flip(!active)}
                disabled={busy || st === null}
                className={`w-full font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 ${
                    active ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-amber-600 hover:bg-amber-500 text-white"
                }`}
            >
                <Power className="w-4 h-4" />
                {busy ? "..." : active ? "أطفئ الصيانة" : "اقفل الموقع للصيانة"}
            </button>

            <p className="text-[11px] text-slate-500 leading-relaxed mt-2.5">
                أثناء الصيانة: الشلة يشوفون مطعم الأسبوع ويومه وملكه فقط، مع زر «بجي / ما بجي».
                الملك يشوف زر «نبّه الكل يحددون». وأنت تقدر تدخل الموقع عادي من زر «ادخل الموقع».
            </p>
        </div>
    );
}
