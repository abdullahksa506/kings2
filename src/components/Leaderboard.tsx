"use client";

import { useEffect, useState } from "react";
import { PublicUserProfile, services, WeekSession } from "@/lib/services";
import { Trophy, Medal, Star, RotateCcw, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { OrnamentalDivider, RoyalGoldFrame } from "./RoyalDecor";

interface LeaderboardEntry {
    week: WeekSession;
    averageScore: number;
}

export default function Leaderboard({ cycleNumber, isDean = false, onReset }: { cycleNumber: number, isDean?: boolean, onReset?: () => Promise<void> }) {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [publicProfilesMap, setPublicProfilesMap] = useState<Record<string, PublicUserProfile>>({});

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
        <RoyalGoldFrame className="rounded-3xl">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-amber-400/15 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(251,191,36,0.10),transparent_55%)]" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center mb-3 relative z-10">
                <Crown className="w-7 h-7 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.45)]" />
                <h3 className="mt-2 font-bold text-xl text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500">
                    قائمة شرف المطاعم
                </h3>
                <p className="text-[11px] text-amber-400/70 mt-1.5 font-medium">دورة هذا الموسم</p>
            </div>
            <div className="mb-4 relative z-10"><OrnamentalDivider /></div>
            {isDean && onReset && (
                <div className="flex justify-end mb-4 relative z-10">
                    <button
                        onClick={onReset}
                        className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        تصفير الدورة
                    </button>
                </div>
            )}

            <div className="space-y-3 relative z-10">
                {data.map((entry, index) => {
                    const isFirst = index === 0;
                    const isSecond = index === 1;
                    const isThird = index === 2;
                    const kingName = entry.week.king || "عشوائي";
                    const kingProfile = entry.week.king ? publicProfilesMap[entry.week.king] : null;
                    const kingDisplayName = kingProfile?.nickName?.trim() || kingName;
                    const kingAvatar = kingProfile?.profileImage || null;
                    const kingInitial = kingDisplayName.charAt(0) || "؟";

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
                            className={`flex items-center justify-between p-4 rounded-2xl border ${
                                isFirst
                                    ? 'bg-gradient-to-l from-amber-500/15 via-amber-600/5 to-transparent border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                                    : isSecond
                                        ? 'bg-gradient-to-l from-slate-400/10 to-transparent border-slate-300/40'
                                        : isThird
                                            ? 'bg-gradient-to-l from-orange-500/10 to-transparent border-orange-500/40'
                                            : 'bg-slate-950/50 border-slate-800/60'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 shrink-0 flex items-center justify-center text-lg font-bold rounded-full bg-slate-950/40">
                                    {isFirst ? (
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400/40 to-amber-700/20 border border-amber-400/40 flex items-center justify-center shadow-[inset_0_0_8px_rgba(255,200,90,0.35)]">
                                            <Crown className="w-4 h-4 text-amber-200" />
                                        </div>
                                    ) : (isSecond || isThird) ? (
                                        <Medal className={`w-6 h-6 ${medalColor}`} />
                                    ) : (
                                        <span className="text-slate-600">#{index + 1}</span>
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-base leading-tight">
                                        {entry.week.restaurant || "مطعم مجهول"}
                                    </h4>
                                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                        <span>اختيار:</span>
                                        <span className="w-6 h-6 rounded-full overflow-hidden border border-white/20 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-200 shrink-0">
                                            {kingAvatar ? (
                                                <img src={kingAvatar} alt={kingDisplayName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{kingInitial}</span>
                                            )}
                                        </span>
                                        <span className="font-medium text-amber-500/80">{kingDisplayName}</span>
                                    </div>
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
        </RoyalGoldFrame>
    );
}
