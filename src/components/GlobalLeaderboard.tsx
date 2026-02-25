"use client";

import { useEffect, useState } from "react";
import { services, WeekSession } from "@/lib/services";
import { History, Star, Crown } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
    week: WeekSession;
    averageScore: number;
}

export default function GlobalLeaderboard() {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const results = await services.getAllCompletedWeeks();
            setData(results);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
                <h3 className="font-semibold text-lg mb-4 text-slate-300">السجل الشامل</h3>
                <div className="h-48 bg-slate-800/50 rounded-xl"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="font-semibold text-lg mb-4 text-slate-300 flex items-center gap-2">
                    <History className="w-5 h-5 text-amber-500" />
                    السجل الشامل
                </h3>
                <p className="text-sm text-slate-500 text-center py-6">
                    لا يوجد طلعات سابقة مكتملة حتى الآن.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="font-semibold text-lg mb-6 text-slate-200 flex items-center gap-2">
                <History className="w-6 h-6 text-amber-500" />
                السجل الشامل
            </h3>

            <div className="space-y-3">
                {data.map((entry, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={entry.week.id}
                        className="flex items-center justify-between p-4 rounded-2xl border bg-slate-950/50 border-slate-800/60"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                <span className="text-xs font-mono text-amber-500">{index + 1}</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm leading-tight">
                                    {entry.week.restaurant || "مطعم مجهول"}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Crown className="w-3 h-3 text-amber-500/60" />
                                    <span className="text-xs text-slate-400">
                                        {entry.week.king || "عشوائي"}
                                    </span>
                                    <span className="text-xs text-slate-600">•</span>
                                    <span className="text-xs text-slate-500">
                                        الأسبوع {entry.week.weekNumber}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span className="font-mono text-white text-sm font-bold">
                                {entry.averageScore > 0 ? entry.averageScore.toFixed(1) : "—"}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
