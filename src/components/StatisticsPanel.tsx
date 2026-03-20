"use client";

import { useState, useEffect } from "react";
import { services, VALID_NAMES } from "@/lib/services";
import {
    BarChart3, Eye, Castle, Users, UtensilsCrossed,
    MessageSquare, Flame, Calendar, TrendingUp, X,
    Crown, Award, Zap, Clock, Hash
} from "lucide-react";

interface StatisticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function StatisticsPanel({ isOpen, onClose }: StatisticsPanelProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        services.getStatistics().then(data => {
            setStats(data);
            setLoading(false);
        }).catch(e => {
            console.error("Failed to load stats:", e);
            setLoading(false);
        });
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 md:p-3 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-2xl my-2 md:my-4 animate-[slideUp_0.4s_ease-out]">
                {/* Header */}
                <div className="sticky top-0 z-20 flex items-center justify-between mb-4 md:mb-6 bg-slate-950/80 backdrop-blur-sm rounded-xl p-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-violet-500/30 to-purple-600/30 p-3 rounded-2xl border border-violet-500/30">
                            <BarChart3 className="w-7 h-7 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-violet-300 to-purple-400 bg-clip-text text-transparent">
                                إحصائيات عرش الخميس
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">أرقام وتفاصيل عن كل شي</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 p-2 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                        <p className="text-slate-400 mt-4 text-sm">جاري تحميل الإحصائيات...</p>
                    </div>
                ) : stats ? (
                    <div className="space-y-4">

                        {/* Visit Stats */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-violet-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 w-28 h-28 bg-violet-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <Eye className="w-5 h-5 text-violet-400" />
                                <h3 className="font-bold text-violet-300 text-lg">زيارات الموقع</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                                <StatBox label="إجمالي الزيارات" value={stats.visitStats.total} color="violet" icon="📊" />
                                <StatBox label="زيارات اليوم" value={stats.visitStats.today} color="purple" icon="📅" />
                                <StatBox label="هذا الأسبوع" value={stats.visitStats.thisWeek} color="fuchsia" icon="📆" />
                                <StatBox label="هذا الشهر" value={stats.visitStats.thisMonth} color="pink" icon="🗓️" />
                            </div>
                        </div>

                        {/* Outings Stats */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-amber-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <Castle className="w-5 h-5 text-amber-400" />
                                <h3 className="font-bold text-amber-300 text-lg">الطلعات</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                                <StatBox label="عدد الطلعات" value={stats.totalOutings} color="amber" icon="🏰" />
                                <StatBox label="عدد الدورات" value={stats.totalCycles} color="yellow" icon="🔄" />
                                <StatBox label="أيام الخميس" value={stats.thursdayCount} color="orange" icon="📅" />
                                <StatBox label="أيام الجمعة" value={stats.fridayCount} color="amber" icon="🌙" />
                            </div>
                            {stats.daysSinceFirst > 0 && (
                                <div className="mt-3 flex items-center gap-2 bg-amber-500/10 rounded-xl p-3 border border-amber-500/10 relative z-10">
                                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <p className="text-amber-300/80 text-sm">
                                        مرّ <span className="font-bold text-amber-400">{stats.daysSinceFirst}</span> يوم من أول طلعة
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Member Stats */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-emerald-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <Users className="w-5 h-5 text-emerald-400" />
                                <h3 className="font-bold text-emerald-300 text-lg">إحصائيات الأعضاء</h3>
                            </div>
                            <div className="space-y-2 relative z-10">
                                {VALID_NAMES.map((name, i) => {
                                    const m = stats.memberStats[name];
                                    if (!m) return null;
                                    const attendanceRate = m.totalWeeks > 0 ? Math.round((m.attended / m.totalWeeks) * 100) : 0;
                                    return (
                                        <div key={name} className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3 flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
                                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                                                <span className="text-sm font-bold text-emerald-400">{name.charAt(0)}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white text-sm">{name}</span>
                                                    {stats.funFacts.mostAttendant?.name === name && (
                                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">الأكثر حضوراً</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                                                    <span>👑 ملك {m.timesAsKing}x</span>
                                                    <span>✅ حضور {m.attended}</span>
                                                    <span>❌ اعتذار {m.absent}</span>
                                                </div>
                                            </div>
                                            <div className="text-left flex-shrink-0">
                                                <div className={`text-lg font-bold ${attendanceRate >= 80 ? 'text-emerald-400' : attendanceRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {attendanceRate}%
                                                </div>
                                                <p className="text-[10px] text-slate-500">نسبة الحضور</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="mt-2 bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/10 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <p className="text-emerald-300/80 text-sm">
                                        متوسط الحضور لكل طلعة: <span className="font-bold text-emerald-400">{stats.avgAttendancePerWeek}</span> شخص
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Streaks */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-orange-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -left-8 -top-8 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <Flame className="w-5 h-5 text-orange-400" />
                                <h3 className="font-bold text-orange-300 text-lg">سلسلة الحضور المتتالي 🔥</h3>
                            </div>
                            <div className="space-y-2 relative z-10">
                                {Object.entries(stats.streaks)
                                    .sort(([, a]: any, [, b]: any) => b.max - a.max)
                                    .map(([name, s]: [string, any], i) => (
                                        <div key={name} className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/50 rounded-xl p-3">
                                            <span className={`text-lg font-bold w-7 text-center ${i === 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                                                {i === 0 ? '🔥' : `${i + 1}`}
                                            </span>
                                            <span className="text-white font-medium text-sm flex-1">{name}</span>
                                            <div className="text-left">
                                                <span className={`font-bold text-sm ${i === 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                                                    {s.max} طلعة متتالية
                                                </span>
                                                {s.current > 0 && s.current < s.max && (
                                                    <span className="text-[10px] text-slate-500 block">حالياً {s.current}</span>
                                                )}
                                                {s.current === s.max && s.current > 0 && (
                                                    <span className="text-[10px] text-orange-400/70 block">مستمر! 🔥</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Restaurant Stats */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-sky-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <UtensilsCrossed className="w-5 h-5 text-sky-400" />
                                <h3 className="font-bold text-sky-300 text-lg">المطاعم</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 relative z-10">
                                <StatBox label="مطاعم مختلفة" value={stats.uniqueRestaurants} color="sky" icon="🍽️" />
                                <StatBox label="إجمالي الزيارات" value={stats.totalOutings} color="cyan" icon="📋" />
                            </div>
                            {stats.sortedRestaurants.length > 0 && (
                                <div className="space-y-1.5 relative z-10 mt-3">
                                    <p className="text-xs text-slate-500 font-medium mb-2">ترتيب المطاعم بالتكرار:</p>
                                    {stats.sortedRestaurants.map(([name, count]: [string, number], i: number) => (
                                        <div key={name} className="flex items-center gap-2 bg-slate-950/40 rounded-lg p-2.5 border border-slate-800/30">
                                            <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-sky-400' : 'text-slate-500'}`}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                                            </span>
                                            <span className="text-white text-sm flex-1 truncate">{name}</span>
                                            <span className="text-sky-400 font-bold text-sm">{count}x</span>
                                            {/* Mini bar */}
                                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full"
                                                    style={{ width: `${(count / (stats.sortedRestaurants[0]?.[1] || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chat & Activity */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-pink-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-pink-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <MessageSquare className="w-5 h-5 text-pink-400" />
                                <h3 className="font-bold text-pink-300 text-lg">النشاط والتفاعل</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 relative z-10">
                                <StatBox label="رسائل الشات" value={stats.chatCount} color="pink" icon="💬" />
                                <StatBox label="اقتراحات" value={stats.suggestionsCount} color="rose" icon="💡" />
                            </div>
                            {Object.keys(stats.chatPerUser).length > 0 && (
                                <div className="space-y-1.5 relative z-10 mt-3">
                                    <p className="text-xs text-slate-500 font-medium mb-2">أكثر المتفاعلين في الشات:</p>
                                    {Object.entries(stats.chatPerUser)
                                        .sort(([, a]: any, [, b]: any) => b - a)
                                        .map(([name, count]: [string, any], i: number) => (
                                            <div key={name} className="flex items-center gap-2 bg-slate-950/40 rounded-lg p-2 border border-slate-800/30">
                                                <span className={`text-xs font-bold ${i === 0 ? 'text-pink-400' : 'text-slate-500'}`}>
                                                    {i === 0 ? '🗣️' : `${i + 1}`}
                                                </span>
                                                <span className="text-white text-sm flex-1">{name}</span>
                                                <span className="text-pink-400 font-bold text-sm">{count} رسالة</span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Fun Facts */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-yellow-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -right-8 -bottom-8 w-28 h-28 bg-yellow-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <Award className="w-5 h-5 text-yellow-400" />
                                <h3 className="font-bold text-yellow-300 text-lg">أرقام ممتعة 🎯</h3>
                            </div>
                            <div className="space-y-2 relative z-10">
                                {stats.funFacts.highestRatedKing && (
                                    <FunFactRow icon="🌟" label="الملك المحبوب (أعلى تقييم لطلعته)" value={`${stats.funFacts.highestRatedKing.name} (${stats.funFacts.highestRatedKing.score} ⭐)`} />
                                )}
                                {stats.funFacts.lowestRatedKing && (
                                    <FunFactRow icon="📉" label="أسوأ ملك (أقل تقييم لطلعته)" value={`${stats.funFacts.lowestRatedKing.name} (${stats.funFacts.lowestRatedKing.score} ⭐)`} />
                                )}
                                {stats.funFacts.mostGenerousRater && (
                                    <FunFactRow icon="💖" label="الذوّيق (أعلى متوسط يعطيه)" value={`${stats.funFacts.mostGenerousRater.name} (${stats.funFacts.mostGenerousRater.score} ⭐)`} />
                                )}
                                {stats.funFacts.mostCriticalRater && (
                                    <FunFactRow icon="⚖️" label="الجلّاد (أقل متوسط يعطيه)" value={`${stats.funFacts.mostCriticalRater.name} (${stats.funFacts.mostCriticalRater.score} ⭐)`} />
                                )}
                                {stats.funFacts.globalAverageRating > 0 && (
                                    <FunFactRow icon="🌍" label="متوسط تقييم كل الطلعات" value={`${stats.funFacts.globalAverageRating} ⭐`} />
                                )}
                                {stats.funFacts.mostKing && (
                                    <FunFactRow icon="👑" label="أكثر واحد صار ملك" value={`${stats.funFacts.mostKing.name} (${stats.funFacts.mostKing.count} مرة)`} />
                                )}
                                {stats.funFacts.mostAttendant && (
                                    <FunFactRow icon="✅" label="أكثر واحد يحضر" value={`${stats.funFacts.mostAttendant.name} (${stats.funFacts.mostAttendant.count} مرة)`} />
                                )}
                                {stats.funFacts.mostAbsent && stats.funFacts.mostAbsent.count > 0 && (
                                    <FunFactRow icon="🙈" label="أكثر واحد يعتذر" value={`${stats.funFacts.mostAbsent.name} (${stats.funFacts.mostAbsent.count} مرة)`} />
                                )}
                                {stats.funFacts.longestStreak && stats.funFacts.longestStreak.streak > 0 && (
                                    <FunFactRow icon="🔥" label="أطول سلسلة حضور متتالي" value={`${stats.funFacts.longestStreak.name} (${stats.funFacts.longestStreak.streak} طلعات)`} />
                                )}
                                {stats.funFacts.mostChatActive && (
                                    <FunFactRow icon="🗣️" label="أكثر واحد يسولف بالشات" value={`${stats.funFacts.mostChatActive.name} (${stats.funFacts.mostChatActive.count} رسالة)`} />
                                )}
                                <FunFactRow icon="📊" label="متوسط الحضور لكل طلعة" value={`${stats.avgAttendancePerWeek} شخص`} />
                                <FunFactRow
                                    icon="📅"
                                    label="اليوم المفضل"
                                    value={stats.thursdayCount > stats.fridayCount
                                        ? `الخميس (${stats.thursdayCount} مرة)`
                                        : stats.fridayCount > stats.thursdayCount
                                            ? `الجمعة (${stats.fridayCount} مرة)`
                                            : `تعادل! (${stats.thursdayCount} لكل يوم)`}
                                />
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="w-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition-all mt-2 mb-4"
                        >
                            إغلاق
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-slate-500">فشل تحميل الإحصائيات</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// --- Helper Components ---

function StatBox({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
    const colorMap: Record<string, string> = {
        violet: "from-violet-500/20 to-purple-500/20 border-violet-500/20 text-violet-400",
        purple: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/20 text-purple-400",
        fuchsia: "from-fuchsia-500/20 to-pink-500/20 border-fuchsia-500/20 text-fuchsia-400",
        pink: "from-pink-500/20 to-rose-500/20 border-pink-500/20 text-pink-400",
        rose: "from-rose-500/20 to-red-500/20 border-rose-500/20 text-rose-400",
        amber: "from-amber-500/20 to-yellow-500/20 border-amber-500/20 text-amber-400",
        yellow: "from-yellow-500/20 to-amber-500/20 border-yellow-500/20 text-yellow-400",
        orange: "from-orange-500/20 to-amber-500/20 border-orange-500/20 text-orange-400",
        emerald: "from-emerald-500/20 to-teal-500/20 border-emerald-500/20 text-emerald-400",
        sky: "from-sky-500/20 to-cyan-500/20 border-sky-500/20 text-sky-400",
        cyan: "from-cyan-500/20 to-teal-500/20 border-cyan-500/20 text-cyan-400",
    };

    return (
        <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.violet} border rounded-xl p-3 text-center`}>
            <span className="text-lg mb-1 block">{icon}</span>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
        </div>
    );
}

function FunFactRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 bg-slate-950/40 rounded-xl p-3 border border-slate-800/30">
            <span className="text-lg flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-white truncate">{value}</p>
            </div>
        </div>
    );
}
