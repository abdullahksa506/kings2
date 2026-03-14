"use client";

import { useState, useEffect } from "react";
import { services, WeekSession, VALID_NAMES } from "@/lib/services";
import { History, Star, Crown, Download } from "lucide-react";
import { motion } from "framer-motion";
import * as xlsx from "xlsx";

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
                "اليوم": week.day || "غير محدد",
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

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-lg text-slate-200 flex items-center gap-2">
                    <History className="w-6 h-6 text-amber-500" />
                    السجل الشامل
                </h3>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    تحميل القائمة
                </button>
            </div>

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
