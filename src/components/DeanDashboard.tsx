"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, Rating } from "@/lib/services";
import { Star, ShieldAlert, BarChart3 } from "lucide-react";

export default function DeanDashboard({ weekId }: { weekId: string }) {
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRatings = async () => {
            if (weekId) {
                setLoading(true);
                const fetchedRatings = await services.getAllRatingsForWeek(weekId);
                setRatings(fetchedRatings);
                setLoading(false);
            }
        };
        fetchRatings();
    }, [weekId]);

    if (loading) return <div className="text-amber-500 font-mono text-sm animate-pulse">جاري جلب التقييمات السرية...</div>;

    if (ratings.length === 0) {
        return <p className="text-slate-500 text-sm mt-4 pb-4">لا يوجد تقييمات لهذا الأسبوع حتى الآن.</p>;
    }

    const average = ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length;

    return (
        <div className="mt-6 pt-6 border-t border-amber-900/50">
            <h3 className="text-lg font-bold text-amber-500 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                تفاصيل تصويت الأسبوع (سرية للغاية)
            </h3>

            <div className="flex gap-4 mb-6">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-1">
                    <p className="text-sm text-slate-400">عدد المصوتين</p>
                    <p className="text-2xl font-mono text-white mt-1">{ratings.length}/6</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-1">
                    <p className="text-sm text-slate-400">التقييم المتوسط</p>
                    <p className="text-2xl font-mono text-white mt-1">{average.toFixed(1)} <span className="text-amber-500 text-sm">/ 5</span></p>
                </div>
            </div>

            <div className="space-y-2">
                {ratings.map(r => (
                    <div key={r.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                        <span className="text-slate-300">{r.userName}</span>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                    key={star}
                                    className={`w-4 h-4 ${star <= r.score ? "fill-amber-500 text-amber-500" : "text-slate-700"}`}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {average <= 2 && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex gap-2 items-start text-red-500 text-sm">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>تنبيه: التقييم منخفض جداً (2 أو أقل). إذا تكرر ذلك لملك هذا الأسبوع في دورتين متتاليتين، سيسقط دوره القادم حسب الدستور.</p>
                </div>
            )}
        </div>
    );
}
