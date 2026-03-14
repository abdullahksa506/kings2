"use client";

import { useState, useEffect } from "react";
import { services, WeekSession, VALID_NAMES } from "@/lib/services";
import { Trophy, Star, Crown, Download, ListFilter, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as xlsx from "xlsx";

interface LeaderboardEntry {
    week: WeekSession;
    averageScore: number;
}

interface KingStat {
    king: string;
    average: number;
    count: number;
}

export default function KingsLeaderboard() {
    const [data, setData] = useState<KingStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const results = await services.getAllCompletedWeeks();
            
            const kingsStats: Record<string, { totalScore: number; count: number }> = {};
            
            results.forEach(entry => {
                // Ignore random weeks or unrated weeks
                if (entry.week.king && entry.week.king !== "عشوائي" && entry.averageScore > 0) {
                    if (!kingsStats[entry.week.king]) {
                        kingsStats[entry.week.king] = { totalScore: 0, count: 0 };
                    }
                    kingsStats[entry.week.king].totalScore += entry.averageScore;
                    kingsStats[entry.week.king].count += 1;
                }
            });

            const formattedStats = Object.keys(kingsStats).map(king => ({
                king,
                average: kingsStats[king].totalScore / kingsStats[king].count,
                count: kingsStats[king].count
            })).sort((a, b) => b.average - a.average);

            setData(formattedStats);
            setLoading(false);
        };
        fetchData();
    }, []);

    const exportToExcel = () => {
        if (data.length === 0) return;

        const exportData = data.map((entry, index) => {
            return {
                "المركز": index + 1,
                "الملك": entry.king,
                "متوسط التقييم": Number(entry.average.toFixed(2)),
                "عدد الطلعات": entry.count,
            };
        });

        const worksheet = xlsx.utils.json_to_sheet(exportData);
        if (!worksheet["!views"]) worksheet["!views"] = [];
        worksheet["!views"].push({ rightToLeft: true });

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "قائمة الملوك");

        xlsx.writeFile(workbook, "متوسط_تقييم_الملوك.xlsx");
    };

    if (loading) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
                <h3 className="font-semibold text-lg mb-4 text-slate-300">قائمة الملوك (متوسط التقييم)</h3>
                <div className="h-48 bg-slate-800/50 rounded-xl"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="font-semibold text-lg mb-4 text-slate-300 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    قائمة الملوك
                </h3>
                <p className="text-sm text-slate-500 text-center py-6">
                    لا يوجد بيانات للتقييم حتى الآن.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="font-semibold text-lg text-slate-200 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-500" />
                    قائمة الملوك
                </h3>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={exportToExcel}
                        className="flex shrink-0 items-center justify-center gap-2 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors h-full w-full sm:w-auto"
                    >
                        <Download className="w-4 h-4" />
                        <span>تحميل القائمة</span>
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {data.map((entry, index) => {
                        // Different styling top 3
                        let ringColor = "border-slate-800/60";
                        let rankColor = "text-slate-500";
                        let rankBg = "bg-slate-800";
                        
                        if (index === 0) {
                            ringColor = "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
                            rankColor = "text-amber-500";
                            rankBg = "bg-amber-500/10 border border-amber-500/20";
                        } else if (index === 1) {
                            ringColor = "border-slate-400/50";
                            rankColor = "text-slate-300";
                            rankBg = "bg-slate-500/10 border border-slate-400/20";
                        } else if (index === 2) {
                            ringColor = "border-orange-500/40";
                            rankColor = "text-orange-400";
                            rankBg = "bg-orange-500/10 border border-orange-500/20";
                        }

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                key={entry.king}
                                className={`flex items-center justify-between p-4 rounded-2xl border bg-slate-950/50 hover:bg-slate-800/40 transition-all ${ringColor}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${rankBg}`}>
                                        <span className={`text-xs font-mono font-bold ${rankColor}`}>{index + 1}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base leading-tight mb-1 flex items-center gap-2">
                                            {entry.king}
                                            {index === 0 && <Crown className="w-4 h-4 text-amber-500" />}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <span>{entry.count} مطاعم</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                                        <Star className={`w-4 h-4 ${index === 0 ? "fill-amber-500 text-amber-500" : "fill-amber-500/80 text-amber-500/80"}`} />
                                        <span className="font-mono text-white text-base font-bold">
                                            {entry.average.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
