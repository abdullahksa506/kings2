"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { services, VALID_NAMES, MemberActivityStat } from "@/lib/services";
import {
    BarChart3, Eye, Castle, Users, UtensilsCrossed,
    Flame, TrendingUp, X,
    Award, Clock, LineChart as LineChartIcon, Timer
} from "lucide-react";

interface StatisticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function StatisticsPanel({ isOpen, onClose }: StatisticsPanelProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activityStats, setActivityStats] = useState<MemberActivityStat[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        setLoading(true);

        const load = () => {
            services.getStatistics().then(data => {
                if (!alive) return;
                setStats(data);
                setLoading(false);
            }).catch(e => {
                console.error("Failed to load stats:", e);
                if (alive) setLoading(false);
            });
        };

        // Live: recompute whenever ANY week changes — new outing, attendance update,
        // or completion — so the stats stay current after every طلعة without reopening.
        const unsub = onSnapshot(collection(db, "weeks"), () => { if (alive) load(); }, () => load());

        services.getActivityStats().then(data => {
            if (alive) setActivityStats(data);
        }).catch(e => {
            console.error("Failed to load activity stats:", e);
            if (alive) setActivityStats([]);
        });

        return () => { alive = false; unsub(); };
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

                        {/* ═══ HERO STATS (الأرقام الكبيرة الجذابة) ═══ */}
                        <HeroStats stats={stats} />

                        {/* Visual Charts */}
                        {stats.weeklyTrend && stats.weeklyTrend.length > 0 && (
                            <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-indigo-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                                <div className="absolute -right-8 -top-8 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl" />
                                <div className="flex items-center gap-2 mb-4 relative z-10">
                                    <LineChartIcon className="w-5 h-5 text-indigo-400" />
                                    <h3 className="font-bold text-indigo-300 text-lg">رسوم بيانية</h3>
                                </div>

                                <div className="space-y-5 relative z-10">
                                    <RatingTrendChart data={stats.weeklyTrend} />
                                    <AttendanceTrendChart data={stats.weeklyTrend} />
                                    <MemberAttendanceBarChart memberStats={stats.memberStats} />
                                    <RestaurantFrequencyBarChart data={stats.sortedRestaurants} />
                                </div>
                            </div>
                        )}

                        {/* Visit Stats — رجّعتها بطلب المستخدم. الرقم نفسه القديم
                            لأن العداد مخزّن في Firestore (services.recordVisit)،
                            ما أُعيد تصفيره أبداً مع إزالة الـ UI. */}
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

                        {/* Member Activity (feature suggested by هشام) */}
                        <MemberActivitySection activityStats={activityStats} />

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
                                                    {m.noResponse > 0 && <span className="text-slate-500">⏳ بدون تسجيل {m.noResponse}</span>}
                                                </div>
                                            </div>
                                            <div className="text-left flex-shrink-0">
                                                <div className={`text-lg font-bold ${attendanceRate >= 80 ? 'text-emerald-400' : attendanceRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {attendanceRate}%
                                                </div>
                                                <p className="text-[10px] text-slate-500">حضور مؤكّد</p>
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

                        {/* King Decision Analytics */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-amber-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -left-8 -top-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <Award className="w-5 h-5 text-amber-400" />
                                <h3 className="font-bold text-amber-300 text-lg">تحليل قرارات الملوك</h3>
                            </div>
                            <div className="space-y-2 relative z-10">
                                {stats.kingDecisionAnalytics.map((k: any) => (
                                    <div key={k.king} className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-white font-semibold text-sm">{k.king}</span>
                                            <span className="text-amber-400 text-sm font-bold">{k.avgScore}⭐</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">متوسط الحضور بأسابيعه: {k.avgAttendance}</p>
                                        <p className="text-[11px] text-slate-500">الخميس: {k.thursdayAvgScore}⭐ | الجمعة: {k.fridayAvgScore}⭐</p>
                                    </div>
                                ))}
                            </div>
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

                        {/* Restaurant Intelligence + Insights */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-fuchsia-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -left-8 -top-8 w-28 h-28 bg-fuchsia-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <UtensilsCrossed className="w-5 h-5 text-fuchsia-400" />
                                <h3 className="font-bold text-fuchsia-300 text-lg">ذكاء المطاعم + التوقعات</h3>
                            </div>

                            <div className="space-y-2 relative z-10">
                                {stats.restaurantIntelligence.retryCandidates.map((r: any) => (
                                    <FunFactRow key={`retry-${r.restaurant}`} icon="🥇" label="إعادة التجربة المقترحة" value={`${r.restaurant} (${r.avgScore}⭐)`} />
                                ))}
                                {stats.restaurantIntelligence.avoidCandidates.map((r: any) => (
                                    <FunFactRow key={`avoid-${r.restaurant}`} icon="⚠️" label="مطعم يحتاج مراجعة" value={`${r.restaurant} (${r.avgScore}⭐)`} />
                                ))}
                            </div>
                        </div>

                        {/* Missed outings per member */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-red-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                            <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-red-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2 mb-4 relative z-10">
                                <X className="w-5 h-5 text-red-400" />
                                <h3 className="font-bold text-red-300 text-lg">الطلعات اللي ما حضرها كل واحد ❌</h3>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-3 relative z-10">اعتذارات مسجّلة فقط (اللي ضغط فيها "معتذر")</p>
                            <div className="space-y-3 relative z-10">
                                {VALID_NAMES.map((name) => {
                                    const missed = (stats.memberMissedOutings?.[name] || []) as any[];
                                    return (
                                        <div key={name} className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="font-bold text-white text-sm">{name}</span>
                                                <span className={`text-xs font-bold ${missed.length === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {missed.length === 0 ? 'ما تغيّب ولا طلعة مسجّلة ✅' : `غاب ${missed.length} طلعة`}
                                                </span>
                                            </div>
                                            {missed.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {missed.map((o) => (
                                                        <span key={o.weekId} className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-200/90 rounded-lg px-2 py-1">
                                                            {o.dateLabel} · {o.restaurant || o.king || '—'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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

/**
 * HeroStats — big, beautiful numbers at the top of the panel. Replaces the
 * useless site-visits/time-window/trend noise with the actual "wow" stats.
 */
function HeroStats({ stats }: { stats: any }) {
    // Estimated total spent: 175 SAR per attendee per outing
    const totalAttendees = VALID_NAMES.reduce((sum, n) => sum + (stats.memberStats?.[n]?.attended || 0), 0);
    const estimatedSpend = totalAttendees * 175;
    const fmt = (n: number) => n.toLocaleString("ar-EG");

    const bestKing = stats.funFacts?.highestRatedKing;
    const bestRestaurant = stats.restaurantIntelligence?.ranked?.[0];
    const longestStreak = stats.funFacts?.longestStreak;

    return (
        <div className="space-y-3">
            {/* Hero #1: Total outings + days since first — massive numbers */}
            <div className="bg-gradient-to-br from-amber-600 via-orange-700 to-red-800 rounded-3xl p-6 shadow-2xl border border-amber-400/30 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-300/20 rounded-full blur-3xl" />
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-red-500/20 rounded-full blur-3xl" />
                <div className="relative z-10 text-center text-white">
                    <p className="text-sm font-bold text-amber-100/90 mb-1">إنجاز الجلسة</p>
                    <p
                        className="text-7xl sm:text-8xl font-black leading-none drop-shadow-2xl"
                        style={{ textShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
                    >
                        {fmt(stats.totalOutings)}
                    </p>
                    <p className="text-lg font-bold mt-1">طلعة</p>
                    {stats.daysSinceFirst > 0 && (
                        <p className="text-sm text-amber-100/85 mt-3">
                            خلال <span className="font-black text-white">{fmt(stats.daysSinceFirst)}</span> يوم من أول طلعة
                        </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-5">
                        <div className="bg-black/25 backdrop-blur rounded-2xl py-2 px-1">
                            <p className="text-2xl font-black">{fmt(stats.uniqueRestaurants)}</p>
                            <p className="text-[10px] text-amber-100/80 mt-0.5">مطعم</p>
                        </div>
                        <div className="bg-black/25 backdrop-blur rounded-2xl py-2 px-1">
                            <p className="text-2xl font-black">{fmt(stats.totalCycles)}</p>
                            <p className="text-[10px] text-amber-100/80 mt-0.5">دورة</p>
                        </div>
                        <div className="bg-black/25 backdrop-blur rounded-2xl py-2 px-1">
                            <p className="text-2xl font-black">{stats.avgAttendancePerWeek}</p>
                            <p className="text-[10px] text-amber-100/80 mt-0.5">معدّل حضور</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero #2: Estimated spend (HUGE psychology number) */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl p-6 shadow-2xl border border-emerald-400/30 relative overflow-hidden">
                <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-300/20 rounded-full blur-3xl" />
                <div className="relative z-10 text-center text-white">
                    <p className="text-sm font-bold text-emerald-100/90 mb-1">💸 المُنفَق التقريبي</p>
                    <p className="text-5xl sm:text-6xl font-black leading-none drop-shadow-2xl">
                        ≈ {fmt(estimatedSpend)}
                    </p>
                    <p className="text-base font-bold mt-2">ريال سعودي</p>
                    <p className="text-xs text-emerald-100/75 mt-2">
                        ({fmt(totalAttendees)} حضور × ١٧٥ ر.س — حسب سقف الميزانية)
                    </p>
                </div>
            </div>

            {/* Hero #3: Best king + best restaurant + streak (3 trophy cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {bestKing && (
                    <div className="bg-gradient-to-br from-yellow-500 to-amber-700 rounded-2xl p-4 shadow-xl border border-yellow-300/30 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-20 h-20 bg-yellow-200/20 rounded-full blur-xl" />
                        <div className="relative z-10 text-white">
                            <p className="text-3xl">👑</p>
                            <p className="text-[11px] font-bold text-yellow-100/90 mt-1">الملك الأفضل</p>
                            <p className="text-2xl font-black mt-0.5">{bestKing.name}</p>
                            <p className="text-base font-bold text-yellow-100">{bestKing.score} ⭐</p>
                        </div>
                    </div>
                )}
                {bestRestaurant && bestRestaurant.avgScore > 0 && (
                    <div className="bg-gradient-to-br from-fuchsia-500 to-purple-700 rounded-2xl p-4 shadow-xl border border-fuchsia-300/30 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-20 h-20 bg-fuchsia-200/20 rounded-full blur-xl" />
                        <div className="relative z-10 text-white">
                            <p className="text-3xl">🍽️</p>
                            <p className="text-[11px] font-bold text-fuchsia-100/90 mt-1">مطعم الموسم</p>
                            <p className="text-base font-black mt-0.5 line-clamp-1">{bestRestaurant.restaurant}</p>
                            <p className="text-base font-bold text-fuchsia-100">{bestRestaurant.avgScore} ⭐</p>
                        </div>
                    </div>
                )}
                {longestStreak && longestStreak.streak > 0 && (
                    <div className="bg-gradient-to-br from-orange-500 to-red-700 rounded-2xl p-4 shadow-xl border border-orange-300/30 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-20 h-20 bg-orange-200/20 rounded-full blur-xl" />
                        <div className="relative z-10 text-white">
                            <p className="text-3xl">🔥</p>
                            <p className="text-[11px] font-bold text-orange-100/90 mt-1">أطول سلسلة حضور</p>
                            <p className="text-2xl font-black mt-0.5">{longestStreak.name}</p>
                            <p className="text-base font-bold text-orange-100">{longestStreak.streak} متواصلة</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

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

// --- Member Activity (feature suggested by هشام) ---

function formatDuration(totalMinutes: number): string {
    if (totalMinutes <= 0) return "—";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours} س ${minutes} د`;
    if (hours > 0) return `${hours} ساعة`;
    return `${minutes} دقيقة`;
}

function timeAgo(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `قبل ${diffHr} ساعة`;
    const diffDay = Math.floor(diffHr / 24);
    return `قبل ${diffDay} يوم`;
}

function MemberActivitySection({ activityStats }: { activityStats: MemberActivityStat[] }) {
    const monthLabel = new Date().toLocaleDateString("ar", { month: "long", year: "numeric" });
    const maxSeconds = activityStats.reduce((m, a) => Math.max(m, a.totalSeconds), 0);
    const hasData = activityStats.some((a) => a.totalSeconds > 0);

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-teal-500/20 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute -left-8 -top-8 w-28 h-28 bg-teal-500/10 rounded-full blur-2xl" />
            <div className="flex items-center gap-2 mb-1 relative z-10">
                <Timer className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-teal-300 text-lg">نشاط الأعضاء</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 relative z-10">
                دقائق الاستخدام والصفحة المفضلة لكل عضو — {monthLabel}
            </p>

            {!hasData ? (
                <p className="text-sm text-slate-500 text-center py-6 relative z-10">
                    لسه ما فيه بيانات نشاط هذا الشهر. البيانات تتجمع مع استخدام الموقع.
                </p>
            ) : (
                <div className="space-y-2 relative z-10">
                    {activityStats
                        .filter((a) => a.totalSeconds > 0)
                        .map((a, i) => {
                            const pct = maxSeconds > 0 ? (a.totalSeconds / maxSeconds) * 100 : 0;
                            const lastSeen = a.lastSeenAt ? a.lastSeenAt.toDate() : null;
                            return (
                                <div
                                    key={a.userName}
                                    className="bg-slate-950/60 border border-slate-800/50 rounded-xl p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`text-sm font-bold w-6 text-center ${
                                                i === 0 ? "text-teal-300" : "text-slate-500"
                                            }`}
                                        >
                                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-white text-sm">
                                                    {a.userName}
                                                </span>
                                                <span className="text-teal-300 font-bold text-sm">
                                                    {formatDuration(a.totalMinutes)}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-slate-400">
                                                {a.favoriteTabLabel && (
                                                    <span>📌 المفضلة: {a.favoriteTabLabel}</span>
                                                )}
                                                {lastSeen && <span>👁️ {timeAgo(lastSeen)}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Credit */}
            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-center gap-1.5 relative z-10">
                <span className="text-[11px] text-slate-500">💡 فكرة هذه الميزة من اقتراح</span>
                <span className="text-[11px] font-bold text-teal-300">هشام</span>
            </div>
        </div>
    );
}

// --- Charts ---

interface WeeklyTrendPoint {
    weekId: string;
    weekNumber: number;
    cycleNumber: number;
    day: string | null;
    restaurant: string | null;
    king: string | null;
    avgRating: number | null;
    attendance: number;
}

function RatingTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
    const recent = data.slice(-12);
    const values = recent.map((p) => p.avgRating ?? 0);

    if (recent.length === 0) {
        return (
            <p className="text-xs text-slate-500 text-center py-3">لا توجد بيانات تقييم بعد</p>
        );
    }

    const width = 320;
    const height = 110;
    const padX = 18;
    const padY = 14;
    const maxY = 5;
    const minY = 0;

    const xStep = recent.length > 1 ? (width - 2 * padX) / (recent.length - 1) : 0;
    const yScale = (value: number) =>
        height - padY - ((value - minY) / (maxY - minY)) * (height - 2 * padY);

    const points = recent.map((point, idx) => {
        const x = padX + idx * xStep;
        const y = yScale(point.avgRating ?? 0);
        return { ...point, x, y };
    });

    const path = points
        .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(" ");

    const lastValue = values[values.length - 1];
    const firstValue = values[0];
    const trend = lastValue - firstValue;

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-300">متوسط التقييم لكل طلعة</p>
                <span
                    className={`text-[11px] font-bold ${
                        trend > 0
                            ? "text-emerald-400"
                            : trend < 0
                                ? "text-red-400"
                                : "text-slate-400"
                    }`}
                >
                    {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend).toFixed(1)}
                </span>
            </div>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-28"
                preserveAspectRatio="none"
            >
                {[1, 2, 3, 4, 5].map((tick) => (
                    <line
                        key={tick}
                        x1={padX}
                        x2={width - padX}
                        y1={yScale(tick)}
                        y2={yScale(tick)}
                        stroke="rgba(148, 163, 184, 0.12)"
                        strokeDasharray="2 3"
                    />
                ))}
                <path d={path} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" />
                {points.map((p) => (
                    <circle key={p.weekId} cx={p.x} cy={p.y} r={3} fill="#a78bfa" />
                ))}
            </svg>
            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>أسبوع {recent[0].weekNumber}</span>
                <span>أسبوع {recent[recent.length - 1].weekNumber}</span>
            </div>
        </div>
    );
}

function AttendanceTrendChart({ data }: { data: WeeklyTrendPoint[] }) {
    const recent = data.slice(-12);
    if (recent.length === 0) return null;

    const width = 320;
    const height = 110;
    const padX = 18;
    const padY = 14;
    const maxAttendance = Math.max(VALID_NAMES.length, ...recent.map((p) => p.attendance));

    const barWidth = (width - 2 * padX) / recent.length - 4;

    return (
        <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">عدد الحاضرين لكل طلعة</p>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-28"
                preserveAspectRatio="none"
            >
                {[1, Math.ceil(maxAttendance / 2), maxAttendance].map((tick) => {
                    const y = height - padY - (tick / maxAttendance) * (height - 2 * padY);
                    return (
                        <line
                            key={tick}
                            x1={padX}
                            x2={width - padX}
                            y1={y}
                            y2={y}
                            stroke="rgba(148, 163, 184, 0.12)"
                            strokeDasharray="2 3"
                        />
                    );
                })}
                {recent.map((point, idx) => {
                    const totalSlot = (width - 2 * padX) / recent.length;
                    const x = padX + idx * totalSlot + (totalSlot - barWidth) / 2;
                    const barHeight =
                        ((point.attendance) / maxAttendance) * (height - 2 * padY);
                    const y = height - padY - barHeight;
                    return (
                        <rect
                            key={point.weekId}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill="#34d399"
                            opacity={0.85}
                            rx={2}
                        />
                    );
                })}
            </svg>
            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>أسبوع {recent[0].weekNumber}</span>
                <span>أسبوع {recent[recent.length - 1].weekNumber}</span>
            </div>
        </div>
    );
}

function MemberAttendanceBarChart({
    memberStats,
}: {
    memberStats: Record<string, { attended: number; absent: number; noResponse: number; totalWeeks: number; timesAsKing: number }>;
}) {
    const rows = VALID_NAMES.map((name) => {
        const m = memberStats[name];
        if (!m) return { name, attended: 0, absent: 0, total: 0 };
        return { name, attended: m.attended, absent: m.absent, total: m.totalWeeks };
    });
    const maxTotal = Math.max(1, ...rows.map((r) => r.total));

    return (
        <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">حضور الأعضاء (مقابل الاعتذارات)</p>
            <div className="space-y-1.5">
                {rows.map((row) => {
                    const attendedPct = (row.attended / maxTotal) * 100;
                    const absentPct = (row.absent / maxTotal) * 100;
                    return (
                        <div key={row.name} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-300 w-12 truncate text-right">
                                {row.name}
                            </span>
                            <div className="flex-1 h-4 bg-slate-900/80 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500/80"
                                    style={{ width: `${attendedPct}%` }}
                                />
                                <div
                                    className="h-full bg-red-500/70"
                                    style={{ width: `${absentPct}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-slate-500 w-12 text-left">
                                {row.attended}/{row.total}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> حضور
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> اعتذار
                </span>
            </div>
        </div>
    );
}

function RestaurantFrequencyBarChart({ data }: { data: [string, number][] }) {
    if (!data || data.length === 0) return null;
    const top = data.slice(0, 6);
    const max = top[0]?.[1] || 1;

    return (
        <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">أكثر 6 مطاعم تكراراً</p>
            <div className="space-y-1.5">
                {top.map(([name, count], idx) => {
                    const pct = (count / max) * 100;
                    return (
                        <div key={name} className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 w-5 text-center">
                                {idx + 1}
                            </span>
                            <span
                                className="text-[11px] text-slate-200 truncate"
                                style={{ width: 90 }}
                                title={name}
                            >
                                {name}
                            </span>
                            <div className="flex-1 h-3.5 bg-slate-900/80 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="text-[10px] text-sky-400 font-semibold w-6 text-left">
                                {count}x
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
