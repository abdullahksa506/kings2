"use client";

import { useState, useEffect } from "react";
import { services, WeekSession, BathroomRating } from "@/lib/services";
import { Bath, Trophy } from "lucide-react";

interface BathroomStats {
    weekId: string;
    restaurantName: string;
    cycleNumber: number;
    averageScore: number;
    totalVotes: number;
    ratings: BathroomRating[];
}

export default function BathroomLeaderboard() {
    const [stats, setStats] = useState<BathroomStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // 1. Get all weeks that have a restaurant assigned (completed or active)
                const allWeeks = await services.getAllCompletedWeeks();

                const statsData: BathroomStats[] = [];

                // 2. For each week payload, fetch bathroom ratings and compute average
                for (const item of allWeeks) {
                    const week = item.week;
                    if (!week.restaurant) continue;

                    const ratings = await services.getBathroomRatingsForWeek(week.id);
                    if (ratings.length === 0) continue;

                    const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
                    const averageScore = totalScore / ratings.length;

                    statsData.push({
                        weekId: week.id,
                        restaurantName: week.restaurant,
                        cycleNumber: week.cycleNumber,
                        averageScore,
                        totalVotes: ratings.length,
                        ratings: ratings.sort((a, b) => b.score - a.score) // Sort ratings descending
                    });
                }

                // 3. Sort by average score descending
                statsData.sort((a, b) => b.averageScore - a.averageScore);
                setStats(statsData);
            } catch (err) {
                console.error("Failed to fetch bathroom leaderboard stats:", err);
            }
            setLoading(false);
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="bg-slate-900 border border-sky-900/40 rounded-3xl p-6 shadow-xl w-full text-center">
                <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sky-400">جاري تحميل ليدربورد الحمامات...</p>
            </div>
        );
    }

    if (stats.length === 0) return null;

    return (
        <div className="bg-slate-900 border border-sky-900/40 rounded-3xl p-6 shadow-xl w-full">
            <h3 className="font-bold text-xl mb-6 text-sky-400 flex items-center gap-2 justify-center">
                <Trophy className="w-6 h-6" />
                ليدربورد الحمامات (الأفضل تقييماً)
            </h3>

            <div className="space-y-4">
                {stats.map((stat, index) => (
                    <div
                        key={stat.weekId}
                        className={`bg-slate-950/50 rounded-xl border transition-all ${index === 0 ? "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)] relative overflow-hidden" :
                            index === 1 ? "border-slate-400/50" :
                                index === 2 ? "border-amber-700/50" : "border-slate-800"
                            }`}
                    >
                        {index === 0 && (
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 blur-2xl opacity-20" />
                        )}

                        {/* Header: Rank, Restaurant, Avg Score */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-sky-900/20">
                            <div className="flex items-center gap-3 mb-2 sm:mb-0">
                                <span className={`text-xl font-black ${index === 0 ? "text-amber-500" :
                                    index === 1 ? "text-slate-300" :
                                        index === 2 ? "text-amber-700" : "text-sky-700"
                                    }`}>
                                    #{index + 1}
                                </span>
                                <div>
                                    <h4 className="text-lg font-bold text-sky-300">{stat.restaurantName}</h4>
                                    <p className="text-xs text-slate-500">الدورة {stat.cycleNumber}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-lg border border-sky-900/30">
                                <div className="text-center">
                                    <p className="text-xs text-sky-500/70 mb-1">المتوسط</p>
                                    <p className="font-bold text-sky-400">{stat.averageScore.toFixed(2)}</p>
                                </div>
                                <div className="w-px h-8 bg-sky-900/40" />
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 mb-1">المصوتين</p>
                                    <p className="font-bold text-slate-400">{stat.totalVotes}</p>
                                </div>
                            </div>
                        </div>

                        {/* Details: Who voted what */}
                        <div className="p-4 bg-slate-900/20">
                            <h5 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                <Bath className="w-4 h-4" />
                                تفاصيل التقييمات:
                            </h5>
                            <div className="flex flex-wrap gap-2">
                                {stat.ratings.map(r => (
                                    <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                                        <span className="text-slate-300">{r.userName}</span>
                                        <span className="text-lg drop-shadow-md">
                                            {["🤢", "😕", "😐", "🙂", "✨"][r.score - 1]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
