"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "وش الفرق بين القائمة العادية والمصححة؟"
 * قال: "العادية تقول مين الأفضل، والمصححة تقول مين الأفضل لو ما كان فيه أحد زعلان 😂⚖️"
 */

import { useState, useEffect } from "react";
import { services, CorrectedResult, PublicUserProfile } from "@/lib/services";
import { Scale, ChevronDown, ChevronUp, Info, ArrowUp, ArrowDown, Minus } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function CorrectedLeaderboard() {
    const [data, setData] = useState<CorrectedResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [showHow, setShowHow] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, PublicUserProfile>>({});

    useEffect(() => {
        services.getCorrectedLeaderboard()
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const unsub = services.listenToPublicUserProfiles((list) => {
            const map: Record<string, PublicUserProfile> = {};
            list.forEach((p) => { map[p.userName] = p; });
            setProfiles(map);
        });
        return () => unsub();
    }, []);

    // ترتيب كل ملك في القائمة القديمة، لحساب فرق المركز
    const oldOrder = data
        ? [...data.rows].sort((a, b) => b.baseAverage - a.baseAverage).map((r) => r.king)
        : [];

    return (
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/25 border border-emerald-500/25 rounded-3xl p-4 md:p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="font-bold text-lg text-emerald-300 flex items-center gap-2">
                    <Scale className="w-5 h-5" />
                    القائمة المصححة
                </h3>
                <button
                    onClick={() => setShowHow((v) => !v)}
                    className="text-[11px] text-emerald-300/80 hover:text-emerald-200 flex items-center gap-1 shrink-0"
                >
                    <Info className="w-3.5 h-3.5" /> كيف تُحسب؟
                    {showHow ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">الترتيب وفق مواد الدستور (12) و(13) و(14)</p>

            {showHow && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 mb-3 space-y-2 text-[12px] text-slate-300 leading-relaxed">
                    <p><span className="text-emerald-400 font-bold">المادة (12)</span> — تُسقط أسوأ طلعة من سجل كل ملك (بأربع طلعات فأكثر)، فلا تهدم ليلةٌ واحدة عاماً كاملاً.</p>
                    <p><span className="text-sky-400 font-bold">المادة (13)</span> — المتخاصمان المعلنان لا يُحتسب تقييم أيٍّ منهما على طلعة الآخر، ما لم يهبط عدد المقيّمين تحت ثلاثة.</p>
                    <p><span className="text-violet-400 font-bold">المادة (14)</span> — الدورة الختامية للسنة تزن ٢.٥، وباقي الدورات ١، والدورة الناقصة لا تدخل الحساب.</p>
                    {data && (
                        <p className="text-slate-500 pt-1 border-t border-slate-800">
                            {data.weightedCycle ? `الدورة المرجّحة: ${data.weightedCycle} (الختامية)` : `كل الدورات متساوية — الترجيح يبدأ عند اكتمال الدورة ${data.finalCycle}`}
                            {data.excludedCycles.length > 0 && ` · مستثناة لعدم اكتمالها: ${data.excludedCycles.join("، ")}`}
                            {data.recusedPairs.length > 0
                                ? ` · تنحٍّ معلن: ${data.recusedPairs.map((p) => p.join(" ↔ ")).join("، ")}`
                                : " · لا يوجد تنحٍّ معلن"}
                        </p>
                    )}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-slate-500 py-6 text-center">جاري الحساب...</p>
            ) : !data || data.rows.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">ما فيه دورة مكتملة بعد — القائمة تظهر بعد أن يلعب الستة دورة كاملة.</p>
            ) : (
                <div className="space-y-2">
                    {data.rows.map((r, i) => {
                        const prof = profiles[r.king];
                        const shift = oldOrder.indexOf(r.king) - i;   // + يعني صعد
                        const diff = r.average - r.baseAverage;
                        return (
                            <div key={r.king} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border ${
                                i === 0 ? "bg-amber-500/10 border-amber-500/40" : "bg-slate-950/50 border-slate-800"
                            }`}>
                                <span className="text-lg w-7 text-center shrink-0">{MEDALS[i] || i + 1}</span>
                                <span className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-200 shrink-0">
                                    {prof?.profileImage
                                        ? <img src={prof.profileImage} alt={r.king} className="w-full h-full object-cover" />
                                        : r.king.charAt(0)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-bold text-sm truncate">{prof?.nickName?.trim() || r.king}</p>
                                    <p className="text-[10.5px] text-slate-500">
                                        {r.count} طلعة محتسبة
                                        {r.droppedScore !== null && ` · أُسقطت ${r.droppedScore.toFixed(2)}`}
                                    </p>
                                </div>
                                {shift !== 0 && (
                                    <span className={`text-[10px] font-bold flex items-center gap-0.5 shrink-0 ${
                                        shift > 0 ? "text-emerald-400" : "text-rose-400"
                                    }`}>
                                        {shift > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                        {Math.abs(shift)}
                                    </span>
                                )}
                                <div className="text-left shrink-0">
                                    <p className="text-amber-400 font-bold text-base leading-none">{r.average.toFixed(2)}</p>
                                    <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 justify-end ${
                                        diff > 0.005 ? "text-emerald-400" : diff < -0.005 ? "text-rose-400" : "text-slate-500"
                                    }`}>
                                        {diff > 0.005 ? <ArrowUp className="w-2.5 h-2.5" />
                                            : diff < -0.005 ? <ArrowDown className="w-2.5 h-2.5" />
                                            : <Minus className="w-2.5 h-2.5" />}
                                        {Math.abs(diff).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <p className="text-[10.5px] text-slate-500 pt-1.5 text-center">
                        السهم بجانب الاسم = فرق المركز عن القائمة العادية · السهم بجانب الرقم = فرق المعدّل
                    </p>
                </div>
            )}
        </div>
    );
}
