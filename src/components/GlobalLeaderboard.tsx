"use client";

import { useState, useEffect } from "react";
import { services, WeekSession, VALID_NAMES, Rating } from "@/lib/services";
import { History, Star, Crown, Download, ListFilter, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as xlsx from "xlsx";

interface LeaderboardEntry {
    week: WeekSession;
    averageScore: number;
    absoluteIndex: number;
}

export default function GlobalLeaderboard() {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
    const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
    const [weekRatings, setWeekRatings] = useState<Record<string, Rating[]>>({});
    const [loadingRatings, setLoadingRatings] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const results = await services.getAllCompletedWeeks();
            const indexedResults = results.map((entry, index) => ({
                ...entry,
                absoluteIndex: index + 1
            }));
            setData(indexedResults);
            setLoading(false);
        };
        fetchData();
    }, []);

    const exportToExcel = () => {
        if (data.length === 0) return;

        // Map data to a public-safe format (no ratings, no absentees specifically called out, just attendees)
        const exportData = data.map((entry) => {
            const week = entry.week;

            // Calculate Attendees: All VALID_NAMES minus absentees
            const absentees = week.absentees || [];
            const attendees = VALID_NAMES.filter(name => !absentees.includes(name));

            return {
                "رقم الدورة": week.cycleNumber || 1,
                "رقم الأسبوع": week.weekNumber || 1,
                "الملك": week.king || "أسبوع عشوائي (بدون ملك)",
                "المطعم": week.restaurant || "غير محدد",
                "الفعالية": week.activity || "لا يوجد",
                "الحاضرين": attendees.join("، "),
                // Purposely leaving out ratings
            };
        });

        const worksheet = xlsx.utils.json_to_sheet(exportData);
        // Force right-to-left
        if (!worksheet["!views"]) worksheet["!views"] = [];
        worksheet["!views"].push({ rightToLeft: true });

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "السجل الشامل");

        xlsx.writeFile(workbook, "تاريخ_طلعات_الخميس.xlsx");
    };

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

    const sortedData = [...data].sort((a, b) => {
        const timeA = a.week.createdAt.toMillis();
        const timeB = b.week.createdAt.toMillis();
        
        if (sortBy === "newest") return timeB - timeA;
        if (sortBy === "oldest") return timeA - timeB;
        if (sortBy === "highest") return b.averageScore - a.averageScore;
        if (sortBy === "lowest") return a.averageScore - b.averageScore;
        return 0;
    });

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="font-semibold text-lg text-slate-200 flex items-center gap-2">
                    <History className="w-6 h-6 text-amber-500" />
                    السجل الشامل
                </h3>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-auto flex-1 sm:flex-none">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none w-full bg-slate-950/50 border border-slate-700 text-slate-300 text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium cursor-pointer"
                            dir="rtl"
                        >
                            <option value="newest">الأحدث أولاً</option>
                            <option value="oldest">الأقدم أولاً</option>
                            <option value="highest">الأعلى تقييماً</option>
                            <option value="lowest">الأقل تقييماً</option>
                        </select>
                        <ListFilter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    <button
                        onClick={exportToExcel}
                        className="flex shrink-0 items-center justify-center gap-2 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors h-full"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">تحميل القائمة</span>
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {sortedData.map((entry) => {
                        const isExpanded = expandedWeek === entry.week.id;
                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                key={entry.week.id}
                                className="rounded-2xl border bg-slate-950/50 border-slate-800/60 overflow-hidden"
                            >
                                <div 
                                    onClick={async () => {
                                        if (isExpanded) {
                                            setExpandedWeek(null);
                                        } else {
                                            setExpandedWeek(entry.week.id);
                                            if (!weekRatings[entry.week.id]) {
                                                setLoadingRatings(prev => ({ ...prev, [entry.week.id]: true }));
                                                const ratings = await services.getAllRatingsForWeek(entry.week.id);
                                                setWeekRatings(prev => ({ ...prev, [entry.week.id]: ratings }));
                                                setLoadingRatings(prev => ({ ...prev, [entry.week.id]: false }));
                                            }
                                        }
                                    }}
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-mono text-amber-500">{entry.absoluteIndex}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm leading-tight mb-1 flex items-center gap-2">
                                                {entry.week.restaurant || "مطعم مجهول"}
                                            </h4>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Crown className="w-3 h-3 text-amber-500/60" />
                                                    <span className="text-xs text-slate-400">
                                                        {entry.week.king || "عشوائي"}
                                                    </span>
                                                </div>
                                                {entry.week.activity && entry.week.activity.length > 0 && (
                                                    <>
                                                        <span className="text-xs text-slate-700">•</span>
                                                        <span className="text-[10px] text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50 truncate max-w-[100px]">
                                                            {entry.week.activity}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <div className="flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner">
                                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                            <span className="font-mono text-white text-sm font-bold">
                                                {entry.averageScore > 0 ? entry.averageScore.toFixed(1) : "—"}
                                            </span>
                                        </div>
                                        <div className="text-slate-500">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-slate-800/60 bg-slate-900/30"
                                        >
                                            <div className="p-4">
                                                {loadingRatings[entry.week.id] ? (
                                                    <div className="text-center text-sm text-slate-500 py-2 animate-pulse">
                                                        جاري تحميل التقييمات...
                                                    </div>
                                                ) : weekRatings[entry.week.id]?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {weekRatings[entry.week.id].map(rating => (
                                                            <div key={rating.id} className="flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 px-2 py-1 rounded-lg">
                                                                <span className="text-xs text-slate-300">{rating.userName}</span>
                                                                <div className="flex items-center gap-0.5 ml-1">
                                                                    <span className="text-xs font-mono font-bold text-amber-400">{rating.score}</span>
                                                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-sm text-slate-500 py-2">
                                                        لا يوجد تقييمات فردية مسجلة لهذه الطلعة.
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
