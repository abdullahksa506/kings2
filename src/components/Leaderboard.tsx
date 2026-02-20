"use client";

import { useEffect, useState } from "react";
import { services, WeekSession } from "@/lib/services";
import { Trophy, Medal, Star } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
    week: WeekSession;
    averageScore: number;
}

export default function Leaderboard({ cycleNumber }: { cycleNumber: number }) {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!cycleNumber) return;
            setLoading(true);
            const leaderboard = await services.getLeaderboardData(cycleNumber);
            setData(leaderboard);
            setLoading(false);
        };
        fetchData();
    }, [cycleNumber]);

    if (loading) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
                <h3 className="font-semibold text-lg mb-4 text-slate-300">قائمة الشرف</h3>
                <div className="h-48 bg-slate-800/50 rounded-xl"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="font-semibold text-lg mb-4 text-slate-300 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    قائمة الشرف (المتصدرين)
                </h3>
                <p className="text-sm text-slate-500 text-center py-6">
                    لا يوجد طلعات سابقة مكتملة حتى الآن. شاركوا وقيّموا لتبدأ المنافسة!
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <h3 className="font-semibold text-lg mb-6 text-slate-200 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                قائمة الشرف للمطاعم
            </h3>

            <div className="space-y-3 relative z-10">
                {data.map((entry, index) => {
                    const isFirst = index === 0;
                    const isSecond = index === 1;
                    const isThird = index === 2;

                    let medalColor = "text-slate-600";
                    if (isFirst) medalColor = "text-amber-400"; // Gold
                    else if (isSecond) medalColor = "text-slate-300"; // Silver
                    else if (isThird) medalColor = "text-amber-700"; // Bronze

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={entry.week.id}
                            className={`flex items-center justify-between p-4 rounded-2xl border ${isFirst ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-slate-950/50 border-slate-800/60'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-8 shrink-0 flex justify-center text-lg font-bold">
                                    {(isFirst || isSecond || isThird) ? (
                                        <Medal className={`w-6 h-6 ${medalColor}`} />
                                    ) : (
                                        <span className="text-slate-600">#{index + 1}</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base leading-tight">
                                        {entry.week.restaurant || "مطعم مجهول"}
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        اختيار: <span className="font-medium text-amber-500/80">{entry.week.king || "عشوائي"}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                    <span className="font-mono text-white font-bold">{entry.averageScore > 0 ? entry.averageScore.toFixed(1) : "—"}</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
