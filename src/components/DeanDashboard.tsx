"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, Rating, VALID_NAMES } from "@/lib/services";
import { Star, ShieldAlert, BarChart3, KeyRound, Users, CheckCircle2, Bell, Lock, RefreshCw, Trash2, MapPinOff, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import ExportDataButton from "./ExportDataButton";
import RestaurantNameCleanup from "./RestaurantNameCleanup";
import CycleOrganizer from "./CycleOrganizer";
import DataIntegrityPanel from "./DataIntegrityPanel";
import { canonRestaurant, deleteRestaurantLocation, listenToRestaurantLocations, RestaurantLocation } from "@/lib/mapServices";

export default function DeanDashboard({ currentWeekId, pastWeekId }: { currentWeekId?: string, pastWeekId?: string }) {
    const { user } = useAuth();
    const [selectedWeekType, setSelectedWeekType] = useState<"current" | "past">("current");
    const weekId = selectedWeekType === "current" ? currentWeekId : pastWeekId;

    const [ratings, setRatings] = useState<Rating[]>([]);
    const [resetRequests, setResetRequests] = useState<{ id: string, name: string, resetCode: string }[]>([]);
    const [registeredNames, setRegisteredNames] = useState<string[]>([]);
    const [usersData, setUsersData] = useState<any[]>([]);
    const [showPwaList, setShowPwaList] = useState(false);
    // Recovery: weeks that got marked completed but are missing day/restaurant
    const [recoverableWeeks, setRecoverableWeeks] = useState<WeekSession[]>([]);
    const [reopeningId, setReopeningId] = useState<string | null>(null);
    // Orphan map locations (no matching completed week)
    const [orphanLocations, setOrphanLocations] = useState<RestaurantLocation[]>([]);
    const [deletingLocId, setDeletingLocId] = useState<string | null>(null);
    const [completedWeekNames, setCompletedWeekNames] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeRatings: (() => void) | undefined;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (weekId && weekId.length > 0) {
                    unsubscribeRatings = services.listenToRatingsForWeek(weekId, (fetchedRatings) => {
                        setRatings(fetchedRatings);
                    });
                } else {
                    setRatings([]);
                }

                const reqs = await services.getUsersWithResetCodes();
                setResetRequests(reqs);

                const allUsers = await services.getAllUsers();
                setRegisteredNames(allUsers.map((u: any) => u.name || u.id));
                setUsersData(allUsers);

                // Find completed weeks that have no day OR no restaurant — these
                // were finalized by mistake (likely random week with no selection)
                try {
                    const rows = await services.getAllCompletedWeeks();
                    const broken = rows
                        .map((r) => r.week)
                        .filter((w) => !w.day || !w.restaurant)
                        .sort((a, b) => b.weekNumber - a.weekNumber)
                        .slice(0, 5);
                    setRecoverableWeeks(broken);

                    // Build canon set of names from completed weeks for orphan detection
                    const names = new Set<string>();
                    for (const r of rows) {
                        if (r.week.restaurant) names.add(canonRestaurant(r.week.restaurant));
                    }
                    setCompletedWeekNames(names);
                } catch (e) {
                    console.error("recovery scan failed", e);
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchData();

        return () => {
            if (unsubscribeRatings) unsubscribeRatings();
        };
    }, [weekId]);

    // Live listener for restaurant locations → compute orphans
    useEffect(() => {
        const unsub = listenToRestaurantLocations((locs) => {
            const orphans = locs.filter((l) => !completedWeekNames.has(canonRestaurant(l.name)));
            setOrphanLocations(orphans);
        });
        return unsub;
    }, [completedWeekNames]);

    const deleteOrphan = async (loc: RestaurantLocation) => {
        if (deletingLocId) return;
        if (!confirm(`فعلاً تبي تحذف موقع "${loc.name}"؟ (ضافه: ${loc.addedBy || "—"})`)) return;
        setDeletingLocId(loc.id);
        try {
            await deleteRestaurantLocation(loc.name);
            toast.success(`🗑️ تم حذف "${loc.name}"`);
            setOrphanLocations((list) => list.filter((x) => x.id !== loc.id));
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "ما قدرنا نحذف");
            console.error(e);
        } finally {
            setDeletingLocId(null);
        }
    };

    if (loading) return <div className="text-amber-500 font-mono text-sm animate-pulse">جاري جلب التقييمات السرية...</div>;

    const average = ratings.length > 0 ? ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length : 0;

    const reopenWeek = async (w: WeekSession) => {
        if (reopeningId) return;
        if (!confirm(`فعلاً تبي تعيد فتح أسبوع ${w.weekNumber}؟ يرجع 'قيد التنفيذ' وتقدر تحدد المطعم/اليوم.`)) return;
        setReopeningId(w.id);
        try {
            await services.uncompleteWeek(w.id);
            toast.success(`📂 أسبوع ${w.weekNumber} فُتح من جديد`);
            setRecoverableWeeks((list) => list.filter((x) => x.id !== w.id));
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "خطأ");
            console.error(e);
        } finally {
            setReopeningId(null);
        }
    };

    return (
        <div className="mt-6 pt-6 border-t border-amber-900/50">
            {/* ⚠️ REMOVABLE: قارئ المانجا المترجم (تجريبي) — لحذف الميزة كاملة:
                احذف هذا الـ Link + مجلد src/app/manga + مجلد src/app/api/manga. لا يعتمد عليه شي. */}
            <Link href="/manga" className="mb-6 flex items-center justify-between gap-3 bg-gradient-to-br from-indigo-900/40 to-violet-900/30 border border-indigo-500/30 hover:border-indigo-400/60 rounded-2xl p-4 transition group">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-xl">📖</div>
                    <div className="text-right">
                        <h3 className="text-sm font-bold text-indigo-200">قارئ المانجا المترجم</h3>
                        <p className="text-[11px] text-indigo-300/60">ابحث · اقرأ · ترجمة عربية تلقائية (تجريبي)</p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-300 rotate-180 group-hover:-translate-x-1 transition-transform" />
            </Link>

            {/* Cycle Organizer — fix cycles, week numbers, random flags, junk */}
            <CycleOrganizer />

            {/* Data-integrity scanner — surfaces silent problems before the friends hit them */}
            <div className="mb-6">
                <DataIntegrityPanel />
            </div>


            {orphanLocations.length > 0 && (
                <div className="mb-6 bg-gradient-to-br from-rose-900/30 to-orange-900/30 border-2 border-rose-500/40 rounded-2xl p-5">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40">
                            <MapPinOff className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-rose-300">🗺️ مواقع معزولة في الخريطة</h3>
                            <p className="text-xs text-rose-200/80 mt-0.5">
                                هذي المواقع محفوظة في الخريطة لكن ما لها أسبوع مكتمل مقابل. قد تكون مزحات أو إضافات بالغلط.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {orphanLocations.map((loc) => (
                            <div key={loc.id} className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div className="text-right flex-1 min-w-0">
                                    <p className="font-bold text-white text-sm line-clamp-1">{loc.name}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        ضافه: {loc.addedBy || "—"} · إحداثيات: {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => deleteOrphan(loc)}
                                    disabled={deletingLocId === loc.id}
                                    className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs px-3 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-50 shrink-0"
                                >
                                    <Trash2 className={`w-3.5 h-3.5 ${deletingLocId === loc.id ? "animate-pulse" : ""}`} />
                                    {deletingLocId === loc.id ? "يحذف..." : "احذف"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {recoverableWeeks.length > 0 && (
                <div className="mb-6 bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-2 border-amber-500/40 rounded-2xl p-5">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40">
                            <ShieldAlert className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-base font-bold text-amber-300">⚠️ أسابيع اعتُمدت بدون تفاصيل</h3>
                            <p className="text-xs text-amber-200/80 mt-0.5">
                                هالأسابيع وضعها &quot;اكتمل&quot; لكنها بدون مطعم أو يوم. اضغط &quot;أعد فتح&quot; ترجع &quot;قيد التنفيذ&quot; وتقدر تحدد القرارات.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {recoverableWeeks.map((w) => (
                            <div key={w.id} className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div className="text-right">
                                    <p className="font-bold text-white text-sm">
                                        أسبوع {w.weekNumber} · دورة {w.cycleNumber}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        ملك: {w.king || "عشوائي 🎲"} · {w.day || "بدون يوم"} · {w.restaurant || "بدون مطعم"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => reopenWeek(w)}
                                    disabled={reopeningId === w.id}
                                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-xs px-3 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${reopeningId === w.id ? "animate-spin" : ""}`} />
                                    {reopeningId === w.id ? "يفتح..." : "أعد فتح"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    تفاصيل تصويت الأسبوع (سرية للغاية)
                </h3>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                    <button
                        onClick={() => setSelectedWeekType("current")}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedWeekType === "current" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        الحالي
                    </button>
                    <button
                        onClick={() => setSelectedWeekType("past")}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${selectedWeekType === "past" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                    >
                        السابق
                    </button>
                </div>
            </div>

            {ratings.length === 0 ? (
                <div className="pb-4">
                    <p className="text-slate-500 text-sm mb-4">لا يوجد تقييمات لهذا الأسبوع حتى الآن.</p>
                </div>
            ) : (
                <>
                    <div className="flex gap-4 mb-6">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-1">
                            <p className="text-sm text-slate-400">عدد المصوتين</p>
                            <p className="text-2xl font-mono text-white mt-1">{ratings.length}/6</p>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex-1">
                            <p className="text-sm text-slate-400">التقييم المتوسط</p>
                            <p className="text-2xl font-mono text-white mt-1">{average.toFixed(1)} <span className="text-amber-500 text-sm">/ 5</span></p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {ratings.map(r => (
                            <div key={r.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                <span className="text-slate-300">{r.userName}</span>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star
                                            key={star}
                                            className={`w-4 h-4 ${star <= r.score ? "fill-amber-500 text-amber-500" : "text-slate-700"}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {average <= 2 && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex gap-2 items-start text-red-500 text-sm">
                            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>تنبيه: التقييم منخفض جداً (2 أو أقل). إذا تكرر ذلك لملك هذا الأسبوع في دورتين متتاليتين، سيسقط دوره القادم حسب الدستور.</p>
                        </div>
                    )}
                </>
            )}



            {/* PWA Tracking Section */}
            {(() => {
                const registeredUsers = usersData.filter(u => registeredNames.includes(u.name || u.id));
                const allStandalone = registeredUsers.length > 0 && registeredUsers.every(u => u.isStandalone === true);

                if (allStandalone || registeredUsers.length === 0) return null;

                const standaloneCount = registeredUsers.filter(u => u.isStandalone === true).length;

                return (
                    <div className="mt-8 pt-6 border-t border-amber-900/50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2">
                                📱 حالة تثبيت التطبيق
                            </h3>
                            <button
                                onClick={() => setShowPwaList(!showPwaList)}
                                className="text-sm bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {showPwaList ? "إخفاء القائمة" : "عرض القائمة"}
                            </button>
                        </div>

                        {showPwaList && (
                            <div className="space-y-2 mt-4">
                                {registeredUsers.map(user => {
                                    const name = user.name || user.id;
                                    const isApp = user.isStandalone === true;
                                    return (
                                        <div key={name} className={`flex justify-between items-center p-3 rounded-lg border ${isApp
                                            ? "bg-emerald-900/10 border-emerald-500/20"
                                            : "bg-slate-900/50 border-slate-700/50"
                                            }`}>
                                            <span className="text-slate-300">{name}</span>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${isApp
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : "bg-slate-800 text-slate-400"
                                                }`}>
                                                {isApp ? "تطبيق 📱" : "متصفح 🌐"}
                                            </span>
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-slate-500 mt-2">
                                    {standaloneCount} من {registeredUsers.length} ثبتوا التطبيق
                                </p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Registration Status Section */}
            <div className="mt-8 pt-6 border-t border-amber-900/50">
                <h3 className="text-lg font-bold text-amber-500 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    حالة التسجيل
                </h3>
                {registeredNames.length >= VALID_NAMES.length ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="font-medium">جميع الأعضاء مسجلين ✅</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {VALID_NAMES.map(name => {
                            const isRegistered = registeredNames.includes(name);
                            return (
                                <div key={name} className={`flex justify-between items-center p-3 rounded-lg border ${isRegistered
                                    ? "bg-emerald-900/10 border-emerald-500/20"
                                    : "bg-red-900/10 border-red-500/20"
                                    }`}>
                                    <span className="text-slate-300">{name}</span>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${isRegistered
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/20 text-red-400"
                                        }`}>
                                        {isRegistered ? "مسجّل ✓" : "لم يسجّل ✗"}
                                    </span>
                                </div>
                            );
                        })}
                        <p className="text-xs text-slate-500 mt-2">
                            {registeredNames.length} من {VALID_NAMES.length} سجّلوا حساباتهم
                        </p>
                    </div>
                )}
            </div>

            {/* Password Reset Requests Section */}
            {resetRequests.length > 0 && (
                <div className="mt-8 pt-6 border-t border-amber-900/50">
                    <h3 className="text-lg font-bold text-amber-500 mb-4 flex items-center gap-2">
                        <KeyRound className="w-5 h-5" />
                        طلبات استرجاع كلمة المرور
                    </h3>
                    <div className="space-y-3">
                        {resetRequests.map(req => (
                            <div key={req.id} className="flex justify-between items-center bg-slate-900/80 p-4 rounded-lg border border-red-500/30">
                                <span className="text-slate-300 font-medium">{req.name}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500">كود الاسترجاع:</span>
                                    <span className="bg-slate-950 text-amber-500 font-mono tracking-widest px-3 py-1 rounded-md border border-amber-500/30 text-lg">
                                        {req.resetCode}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Trusted Devices Section */}


            {/* Test Notifications Section */}
            <div className="mt-8 pt-6 border-t border-sky-900/50">
                <h3 className="text-lg font-bold text-sky-500 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    إدارة وإرسال الإشعارات التجريبية
                </h3>
                <Link href="/admin/notifications" className="inline-flex items-center gap-2 bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:bg-sky-500/30 py-3 px-6 rounded-xl font-semibold transition-colors w-full md:w-auto justify-center">
                    <Bell className="w-5 h-5" />
                    الانتقال لصفحة اختبار الإشعارات الفردية
                </Link>
            </div>

            {/* Restaurant Name Cleanup */}
            <RestaurantNameCleanup />

            {/* Export Data Section */}
            <div className="mt-8 pt-6 border-t border-emerald-900/50">
                <ExportDataButton />
            </div>
        </div>
    );
}

