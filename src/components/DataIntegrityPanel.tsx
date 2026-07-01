"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كيف تكتشف الأخطاء قبل ما تصير مشكلة؟"
 * قال: "أفحص البيانات كل يوم... مثل ما ChatGPT يفحص إذا فيه أحد يمدحه 😂🔍"
 */

import { useState } from "react";
import { ChevronDown, Stethoscope, RefreshCw, CheckCircle2, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { services, DataIntegrityReport, DataIntegrityIssue } from "@/lib/services";
import { toast } from "sonner";

const SEV = {
    high: { icon: AlertOctagon, cls: "bg-rose-500/10 border-rose-500/30 text-rose-300", label: "عالي" },
    medium: { icon: AlertTriangle, cls: "bg-amber-500/10 border-amber-500/30 text-amber-300", label: "متوسط" },
    low: { icon: Info, cls: "bg-sky-500/10 border-sky-500/30 text-sky-300", label: "بسيط" },
} as const;

export default function DataIntegrityPanel() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<DataIntegrityReport | null>(null);

    const run = async () => {
        setLoading(true);
        try {
            const r = await services.checkDataIntegrity();
            setReport(r);
            if (r.healthy) toast.success("البيانات نظيفة 100% ✅");
            else toast.warning(`فيه ${r.issues.length} ملاحظة على البيانات`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "فشل الفحص");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-teal-950/30 border border-teal-500/25 rounded-3xl overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full p-5 flex items-center justify-between gap-3 hover:bg-teal-500/5"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/20 border border-teal-500/40">
                        <Stethoscope className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-base font-bold text-teal-300">🩺 فحص سلامة البيانات</h3>
                        <p className="text-xs text-teal-200/70">يكتشف المشاكل قبل ما تصير — أسابيع معلّقة، أرقام خردة، تقييمات مكررة</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-teal-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="p-4 pt-0 space-y-3">
                    <button
                        onClick={run}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold rounded-2xl py-3 transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "يفحص..." : "افحص الآن"}
                    </button>

                    {report && (
                        <>
                            <div className="grid grid-cols-3 gap-2">
                                <Stat label="أسابيع" value={report.totalWeeks} />
                                <Stat label="تقييمات" value={report.totalRatings} />
                                <Stat label="معلّقة" value={report.pendingCount} warn={report.pendingCount > 1} />
                            </div>

                            {report.healthy ? (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-300">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-bold">كل شي تمام — ما فيه أي مشكلة في البيانات 🎉</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400 font-bold">{report.issues.length} ملاحظة (الأخطر أولاً):</p>
                                    {report.issues.map((iss, i) => (
                                        <IssueRow key={i} issue={iss} />
                                    ))}
                                    <p className="text-[10px] text-slate-500 text-center pt-1">
                                        🔧 للإصلاح: افتح «منظّم الدورات» فوق — عدّل الرقم/الملك/الحالة أو احذف الأسبوع الخردة.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
    return (
        <div className={`rounded-2xl p-3 text-center border ${warn ? "bg-rose-500/10 border-rose-500/30" : "bg-slate-800/60 border-slate-700"}`}>
            <p className={`text-2xl font-black ${warn ? "text-rose-300" : "text-slate-100"}`}>{value.toLocaleString("ar-EG")}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
        </div>
    );
}

function IssueRow({ issue }: { issue: DataIntegrityIssue }) {
    const sev = SEV[issue.severity];
    const Icon = sev.icon;
    return (
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2 border text-xs ${sev.cls}`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="leading-relaxed">{issue.message}</p>
                {issue.weekId && <p className="text-[9px] opacity-60 font-mono mt-0.5" dir="ltr">id: {issue.weekId}</p>}
            </div>
            <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border border-current/40 font-bold">{sev.label}</span>
        </div>
    );
}
