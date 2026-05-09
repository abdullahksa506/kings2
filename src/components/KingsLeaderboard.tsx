"use client";

import { useState, useEffect } from "react";
import { PublicUserProfile, services, WeekSession, VALID_NAMES } from "@/lib/services";
import { Trophy, Star, Crown, Download, ListFilter, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as xlsx from "xlsx";
import { OrnamentalDivider, RoyalGoldFrame } from "./RoyalDecor";

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
    const [publicProfilesMap, setPublicProfilesMap] = useState<Record<string, PublicUserProfile>>({});

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

    useEffect(() => {
        const unsub = services.listenToPublicUserProfiles((profiles) => {
            const nextMap: Record<string, PublicUserProfile> = {};
            profiles.forEach((p) => {
                nextMap[p.userName] = p;
            });
            setPublicProfilesMap(nextMap);
        });
        return () => unsub();
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
        <RoyalGoldFrame className="rounded-3xl">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-400/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(251,191,36,0.10),transparent_55%)]" />
            <div className="flex flex-col items-center text-center mb-3 relative z-10">
                <Trophy className="w-7 h-7 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.45)]" />
                <h3 className="mt-2 font-bold text-xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500">
                    قائمة الملوك
                </h3>
                <p className="text-[11px] text-amber-400/70 mt-1.5 font-medium">متوسط تقييم الطلعات</p>
            </div>
            <div className="mb-5 relative z-10"><OrnamentalDivider /></div>
            <div className="flex justify-end mb-4 relative z-10">
                <button
                    onClick={exportToExcel}
                    className="flex shrink-0 items-center justify-center gap-2 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    <span>تحميل القائمة</span>
                </button>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {data.map((entry, index) => {
                        const profile = publicProfilesMap[entry.king];
                        const displayName = profile?.nickName?.trim() || entry.king;
                        const avatar = profile?.profileImage || null;
                        const initial = displayName.charAt(0) || "؟";
                        // Different styling top 3
                        let ringColor = "border-slate-800/60";
                        let rankColor = "text-slate-500";
                        let rankBg = "bg-slate-800";
                        
                        let cardBg = "bg-slate-950/50";
                        if (index === 0) {
                            ringColor = "border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.25)]";
                            rankColor = "text-amber-300";
                            rankBg = "bg-gradient-to-br from-amber-400/40 to-amber-700/20 border border-amber-400/40 shadow-[inset_0_0_8px_rgba(255,200,90,0.35)]";
                            cardBg = "bg-gradient-to-l from-amber-500/15 via-amber-600/5 to-transparent";
                        } else if (index === 1) {
                            ringColor = "border-slate-300/50";
                            rankColor = "text-slate-200";
                            rankBg = "bg-gradient-to-br from-slate-300/30 to-slate-600/15 border border-slate-300/30";
                            cardBg = "bg-gradient-to-l from-slate-400/10 to-transparent";
                        } else if (index === 2) {
                            ringColor = "border-orange-500/50";
                            rankColor = "text-orange-300";
                            rankBg = "bg-gradient-to-br from-orange-400/30 to-orange-700/15 border border-orange-400/30";
                            cardBg = "bg-gradient-to-l from-orange-500/10 to-transparent";
                        }

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                key={entry.king}
                                className={`flex items-center justify-between p-4 rounded-2xl border ${cardBg} hover:bg-slate-800/40 transition-all ${ringColor}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${rankBg}`}>
                                        {index === 0 ? (
                                            <Crown className="w-4 h-4 text-amber-200" />
                                        ) : (
                                            <span className={`text-xs font-mono font-bold ${rankColor}`}>{index + 1}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-base leading-tight mb-1 flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full overflow-hidden border border-white/20 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0">
                                                {avatar ? (
                                                    <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{initial}</span>
                                                )}
                                            </span>
                                            {displayName}
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
        </RoyalGoldFrame>
    );
}
