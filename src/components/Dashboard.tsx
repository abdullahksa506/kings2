"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, VALID_NAMES } from "@/lib/services";
import { Crown, Calendar, MapPin, CheckCircle, Shield, PlusCircle, AlertTriangle, PlayCircle, Lock, Unlock, RotateCcw, Bell } from "lucide-react";
import { isBefore, setDay, setHours, setMinutes } from "date-fns";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import RatingForm from "./RatingForm";
import DeanDashboard from "./DeanDashboard";
import Leaderboard from "./Leaderboard";
import GlobalLeaderboard from "./GlobalLeaderboard";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [currentWeek, setCurrentWeek] = useState<WeekSession | null>(null);
    const [pastWeek, setPastWeek] = useState<WeekSession | null>(null);
    const [hasRatedCurrentWeek, setHasRatedCurrentWeek] = useState(false);
    const [hasRatedPastWeek, setHasRatedPastWeek] = useState(false);
    const [loading, setLoading] = useState(true);

    // Forms state
    const [selectedDay, setSelectedDay] = useState<"الخميس" | "الجمعة">("الخميس");
    const [restaurant, setRestaurant] = useState("");
    const [saving, setSaving] = useState(false);

    // Change Password State
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [changePasswordError, setChangePasswordError] = useState("");
    const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

    const fetchWeek = async () => {
        setLoading(true);
        const week = await services.getCurrentWeek();
        const previous = await services.getPreviousWeek();

        if (week) {
            setCurrentWeek(week);
            if (week.day) setSelectedDay(week.day);
            if (week.restaurant) setRestaurant(week.restaurant);
            if (user?.name) {
                const rated = await services.hasUserRated(week.id, user.name);
                setHasRatedCurrentWeek(rated);
            }
        } else {
            setCurrentWeek(null);
            setHasRatedCurrentWeek(false);
        }

        if (previous) {
            setPastWeek(previous);
            if (user?.name) {
                const rated = await services.hasUserRated(previous.id, user.name);
                setHasRatedPastWeek(rated);
            }
        } else {
            setPastWeek(null);
            setHasRatedPastWeek(false);
        }

        setLoading(false);
    };

    const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications();
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        fetchWeek();
    }, [user]);

    const handleSubscribe = async () => {
        setSubscribing(true);
        const sub = await subscribeToPush();
        if (sub && user) {
            await services.updatePushSubscription(user.name, sub);
        }
        setSubscribing(false);
    };

    const handleSetChoices = async () => {
        if (!currentWeek || !user) return;
        setSaving(true);
        try {
            await services.setWeekChoices(currentWeek.id, selectedDay, restaurant, null);

            // Notify members (Web Push)
            try {
                await fetch("/api/reminders/decision", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ weekId: currentWeek.id })
                });
            } catch (e) {
                console.error("Failed to notify members about the decision:", e);
            }

            await fetchWeek();
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء الحفظ");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangePasswordError("");
        setChangePasswordSuccess("");
        if (!user) return;
        setChangePasswordLoading(true);

        try {
            await services.changePassword(user.name, currentPassword, newPassword);
            setChangePasswordSuccess("تم تغيير كلمة المرور بنجاح");
            setTimeout(() => {
                setIsChangePasswordOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setChangePasswordSuccess("");
            }, 2000);
        } catch (e: any) {
            setChangePasswordError(e.message || "حدث خطأ ما");
        } finally {
            setChangePasswordLoading(false);
        }
    };

    const handleStartNewWeek = async () => {
        setSaving(true);
        try {
            if (currentWeek) {
                // Complete the current one first
                await services.completeWeek(currentWeek.id);
            }

            // Determine the next king in the sequence
            let nextKing = VALID_NAMES[0];
            let isRandom = false;
            let nextCycleNumber = currentWeek ? currentWeek.cycleNumber : 1;
            let nextWeekNumber = currentWeek ? currentWeek.weekNumber + 1 : 1;

            if (currentWeek && !currentWeek.isRandom) {
                const currentIndex = VALID_NAMES.indexOf(currentWeek.king || "");
                if (currentIndex === VALID_NAMES.length - 1) {
                    // After the 6th person, the 7th week is random
                    nextKing = "أسبوع عشوائي";
                    isRandom = true;
                } else if (currentIndex !== -1) {
                    nextKing = VALID_NAMES[currentIndex + 1];
                }
            } else if (currentWeek && currentWeek.isRandom) {
                // After random week, start new cycle
                nextKing = VALID_NAMES[0];
                nextCycleNumber++;
            }

            // Note: Not selecting "أسبوع عشوائي" as actual king name in DB if random, set to null
            const finalKingName = isRandom ? null : nextKing;

            await services.startNewWeek(finalKingName, isRandom, nextCycleNumber, nextWeekNumber);
            await fetchWeek();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const isKing = currentWeek?.king === user?.name;

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans relative">
            {/* Version Badge */}
            <div className="fixed top-2 left-2 z-50 text-[10px] text-slate-600 font-mono select-none">v9</div>
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-800">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Crown className="w-8 h-8 text-amber-500" />
                        عرش الخميس
                    </h1>
                    <p className="text-slate-400 mt-2">أهلاً بك، {user?.name}</p>
                </div>
                <div className="flex gap-2 text-xs md:text-sm">
                    {isSupported && !isSubscribed && (
                        <button
                            onClick={handleSubscribe}
                            disabled={subscribing}
                            className="bg-emerald-900/30 border border-emerald-500/30 hover:bg-emerald-800/40 py-2 md:py-3 px-3 md:px-4 rounded-xl transition-all shadow-md text-emerald-400 flex items-center gap-2"
                        >
                            <Bell className="w-4 h-4" />
                            <span className="hidden md:inline">{subscribing ? "جاري التفعيل..." : "تفعيل الإشعارات"}</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsChangePasswordOpen(true)}
                        className="bg-slate-900 border border-slate-800 hover:bg-slate-800 py-2 md:py-3 px-3 md:px-5 rounded-xl transition-all shadow-md text-amber-500 font-medium"
                    >
                        تغيير كلمة المرور
                    </button>
                    <button
                        onClick={logout}
                        className="bg-slate-900 border border-slate-800 hover:bg-slate-800 py-2 md:py-3 px-3 md:px-5 rounded-xl transition-all shadow-md text-slate-300 font-medium"
                    >
                        تسجيل الخروج
                    </button>
                </div>
            </header>

            {/* Change Password Modal */}
            {isChangePasswordOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <h2 className="text-xl font-bold text-amber-500 mb-4">تغيير كلمة المرور</h2>

                        {changePasswordError && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {changePasswordError}
                            </div>
                        )}
                        {changePasswordSuccess && (
                            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                                {changePasswordSuccess}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-300">كلمة المرور الحالية</label>
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-amber-500 font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-slate-300">كلمة المرور الجديدة</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-amber-500 font-mono"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={changePasswordLoading}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {changePasswordLoading ? "جاري..." : "حفظ"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsChangePasswordOpen(false);
                                        setCurrentPassword("");
                                        setNewPassword("");
                                        setChangePasswordError("");
                                        setChangePasswordSuccess("");
                                    }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dean's Admin Panel */}
            {user?.role === "dean" && (
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 opacity-80" />
                    <h2 className="text-amber-500 font-bold mb-4 flex items-center gap-2 text-xl">
                        <Shield className="w-6 h-6" />
                        لوحة العميد (سرية)
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleStartNewWeek}
                            disabled={saving}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
                        >
                            <PlusCircle className="w-5 h-5" />
                            {currentWeek ? "إنهاء الأسبوع الحالي وبدء أسبوع جديد" : "بدء أسبوع جديد"}
                        </button>

                        <button
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    const res = await fetch("/api/reminders/test-push", { method: "POST" });
                                    const data = await res.json();
                                    alert(data.message || "Request sent");
                                } catch (e) {
                                    console.error("Failed to send test push:", e);
                                    alert("خطأ في إرسال الإشعار التجريبي");
                                }
                                setSaving(false);
                            }}
                            disabled={saving}
                            className="bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-400 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
                        >
                            <Bell className="w-5 h-5" />
                            اختبار الإشعارات
                        </button>

                        {currentWeek && (
                            <div className="flex items-center gap-2 bg-slate-950/40 p-1 rounded-xl border border-amber-500/20">
                                <span className="text-slate-400 text-sm px-2">تغيير سري للملك:</span>
                                <select
                                    className="bg-slate-900 text-amber-500 border border-slate-700/50 rounded-lg p-2 text-sm outline-none w-32 focus:border-amber-500"
                                    value={currentWeek.isRandom ? "" : currentWeek.king || ""}
                                    onChange={async (e) => {
                                        setSaving(true);
                                        const newKing = e.target.value === "" ? null : e.target.value;
                                        await services.secretlyChangeKing(currentWeek.id, newKing);
                                        await fetchWeek();
                                        setSaving(false);
                                    }}
                                    disabled={saving}
                                >
                                    <option value="">عشوائي (من غير ملك)</option>
                                    {VALID_NAMES.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {(() => {
                            const ratingWeek = currentWeek || pastWeek;
                            if (!ratingWeek) return null;
                            return (
                                <button
                                    onClick={async () => {
                                        setSaving(true);
                                        const willBeEnabled = !ratingWeek.ratingEnabled;
                                        await services.toggleRatingEnabled(ratingWeek.id, willBeEnabled);

                                        // If we are enabling the rating, notify members
                                        if (willBeEnabled) {
                                            try {
                                                await fetch("/api/reminders/rating-unlocked", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ weekId: ratingWeek.id })
                                                });
                                            } catch (e) {
                                                console.error("Failed to notify members about unlocked rating:", e);
                                            }
                                        }

                                        await fetchWeek();
                                        setSaving(false);
                                    }}
                                    disabled={saving}
                                    className={`py-3 px-6 rounded-xl flex items-center gap-2 transition-all font-semibold ${ratingWeek.ratingEnabled
                                        ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                                        : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                                        }`}
                                >
                                    {ratingWeek.ratingEnabled ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                    {ratingWeek.ratingEnabled ? "قفل التقييم" : "فتح التقييم للأعضاء"}
                                </button>
                            );
                        })()}

                        {currentWeek && (
                            <div className="w-full bg-slate-950/40 p-4 rounded-xl border border-amber-500/20 mt-4">
                                <h3 className="text-amber-500 font-semibold mb-3">إدارة الحضور (صلاحية العميد)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {VALID_NAMES.map(name => {
                                        const isAbsent = currentWeek.absentees?.includes(name) || false;
                                        const hasResponded = currentWeek.responded?.includes(name) || false;
                                        return (
                                            <button
                                                key={name}
                                                onClick={async () => {
                                                    setSaving(true);

                                                    // Logic for Dean toggle: 
                                                    // Wait -> Attend -> Absent -> Wait
                                                    let setAbsent = false;

                                                    if (!hasResponded) {
                                                        // They haven't decided. Force them to Attending.
                                                        setAbsent = false;
                                                    } else if (!isAbsent) {
                                                        // They are attending. Force them to Absent.
                                                        setAbsent = true;
                                                    } else {
                                                        // They are absent. Force them back to Attending for now.
                                                        setAbsent = false;
                                                    }

                                                    const justCompleted = await services.toggleAttendance(currentWeek.id, name, setAbsent);

                                                    if (justCompleted) {
                                                        try {
                                                            await fetch("/api/reminders/attendance-complete", {
                                                                method: "POST",
                                                                headers: { "Content-Type": "application/json" },
                                                                body: JSON.stringify({ weekId: currentWeek.id })
                                                            });
                                                        } catch (e) {
                                                            console.error("Failed to notify members about attendance:", e);
                                                        }
                                                    }

                                                    await fetchWeek();
                                                    setSaving(false);
                                                }}
                                                disabled={saving}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${(!currentWeek.responded?.includes(name)) ? 'bg-slate-800 border-slate-700 text-slate-400 opacity-70' : isAbsent ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}
                                            >
                                                {name}: {(!currentWeek.responded?.includes(name)) ? 'بانتظار الرد ⏳' : isAbsent ? 'معتذر ❌' : 'حاضر ✅'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dean can see stats + reset codes + phone numbers */}
                    <DeanDashboard weekId={currentWeek?.id || pastWeek?.id} />
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-20">
                    <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Status Card */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* CURRENT WEEK RATING */}
                        {currentWeek && currentWeek.ratingEnabled && !hasRatedCurrentWeek && user?.name !== currentWeek.king && !(currentWeek.absentees || []).includes(user?.name || "") && (
                            <div className="mb-6">
                                <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2"><Unlock className="w-5 h-5" /> تقييم طلعة هذا الأسبوع متاح الآن</h3>
                                <RatingForm
                                    weekId={currentWeek.id}
                                    userName={user?.name || ""}
                                    onRated={() => setHasRatedCurrentWeek(true)}
                                    disabled={false}
                                />
                            </div>
                        )}

                        {/* PAST WEEK RATING (Only if past week exists and user hasn't rated) */}
                        {pastWeek && pastWeek.ratingEnabled && !hasRatedPastWeek && user?.name !== pastWeek.king && !(pastWeek.absentees || []).includes(user?.name || "") && (
                            <div className="mb-6">
                                <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2"><Unlock className="w-5 h-5" /> تقييم طلعة الأسبوع الماضي متاح</h3>
                                <RatingForm
                                    weekId={pastWeek.id}
                                    userName={user?.name || ""}
                                    onRated={() => setHasRatedPastWeek(true)}
                                    disabled={false}
                                />
                            </div>
                        )}

                        {!currentWeek ? (
                            <div className="text-center p-16 bg-slate-900/50 rounded-3xl border border-slate-800">
                                <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-2xl font-semibold text-slate-300">لا يوجد أسبوع نشط حالياً</h3>
                                <p className="text-slate-500 mt-2">ننتظر العميد لبدء الدورة الجديدة.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

                                <div className="flex items-start justify-between mb-8 relative z-10">
                                    <div>
                                        <h3 className="text-slate-400 font-medium mb-1">دورة هذا الأسبوع</h3>
                                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                            ملك الأسبوع: <span className="text-amber-400">{currentWeek.king || "عشوائي"}</span>
                                            {currentWeek.king === user?.name && (
                                                <span className="text-xs bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full border border-amber-500/30">
                                                    أنت الملك!
                                                </span>
                                            )}
                                        </h2>
                                    </div>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                                        <Calendar className="w-10 h-10 text-slate-500" />
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-400 mb-1">يوم الطلعة</p>
                                            {isKing ? (
                                                <select
                                                    value={selectedDay}
                                                    onChange={e => setSelectedDay(e.target.value as any)}
                                                    className="bg-slate-900 text-white border border-slate-700 rounded-lg p-2 outline-none w-48 focus:border-amber-500"
                                                >
                                                    <option value="الخميس">الخميس</option>
                                                    <option value="الجمعة">الجمعة</option>
                                                </select>
                                            ) : (
                                                <p className="text-xl font-semibold text-white">
                                                    {currentWeek.day || <span className="text-slate-600 font-normal">لم يحدد بعد</span>}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                                        <MapPin className="w-10 h-10 text-slate-500" />
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-400 mb-1">المطعم المختار (الميزانية أقل من 175 ريال)</p>
                                            {isKing ? (
                                                <input
                                                    type="text"
                                                    placeholder="اسم المطعم..."
                                                    value={restaurant}
                                                    onChange={e => setRestaurant(e.target.value)}
                                                    className="bg-slate-900 text-white border border-slate-700 rounded-lg p-3 outline-none w-full max-w-sm focus:border-amber-500"
                                                />
                                            ) : (
                                                <p className="text-xl font-semibold text-white">
                                                    {currentWeek.restaurant || <span className="text-slate-600 font-normal">لم يحدد بعد</span>}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Attendance Section */}
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-300">قائمة الحضور والتأكيد</h3>
                                                <p className="text-xs text-slate-500 mb-2">أكد حضورك أو اعتذارك عن الطلعة</p>
                                            </div>
                                            {!isKing && user?.name && (
                                                <button
                                                    onClick={async () => {
                                                        setSaving(true);
                                                        const isAbsent = currentWeek.absentees?.includes(user!.name) || false;
                                                        const justCompleted = await services.toggleAttendance(currentWeek.id, user!.name, !isAbsent);

                                                        if (justCompleted) {
                                                            try {
                                                                await fetch("/api/reminders/attendance-complete", {
                                                                    method: "POST",
                                                                    headers: { "Content-Type": "application/json" },
                                                                    body: JSON.stringify({ weekId: currentWeek.id })
                                                                });
                                                            } catch (e) {
                                                                console.error("Failed to notify members:", e);
                                                            }
                                                        }

                                                        await fetchWeek();
                                                        setSaving(false);
                                                    }}
                                                    disabled={saving}
                                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border shadow-sm ${currentWeek.absentees?.includes(user?.name) ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'}`}
                                                >
                                                    {currentWeek.absentees?.includes(user?.name) ? "أنا معتذر ❌" : "سأحضر ✅"}
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* Attendees Section */}
                                            <div>
                                                <p className="text-sm text-emerald-500 mb-2 font-semibold">
                                                    الحاضرين ({VALID_NAMES.filter(n => (currentWeek.responded || []).includes(n) && !(currentWeek.absentees || []).includes(n) || n === currentWeek.king).length}):
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {VALID_NAMES.filter(n => (currentWeek.responded || []).includes(n) && !(currentWeek.absentees || []).includes(n) || n === currentWeek.king).map(name => (
                                                        <span key={name} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg flex items-center gap-1">
                                                            {name} {name === currentWeek.king ? "👑" : "✅"}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Waiting Response Section */}
                                            {VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).length > 0 && (
                                                <div className="pt-2 border-t border-slate-800/50">
                                                    <p className="text-sm text-slate-400 mb-2 font-semibold">
                                                        بانتظار الرد ({VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).length}):
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).map(name => (
                                                            <span key={name} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-sm rounded-lg flex items-center gap-1 opacity-70">
                                                                {name} ⏳
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Absentees Section */}
                                            {(currentWeek.absentees || []).length > 0 && (
                                                <div className="pt-2 border-t border-slate-800/50">
                                                    <p className="text-sm text-red-500 mb-2 font-semibold">
                                                        المعتذرين ({(currentWeek.absentees || []).length}):
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(currentWeek.absentees || []).map(name => (
                                                            <span key={name} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-1">
                                                                {name} ❌
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isKing && (
                                        <div className="pt-4 border-t border-slate-800">
                                            <button
                                                onClick={handleSetChoices}
                                                disabled={saving}
                                                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all w-full md:w-auto justify-center"
                                            >
                                                {saving ? "جاري الحفظ..." : "حفظ القرارات"}
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-8">
                            <h3 className="font-semibold text-lg mb-4 text-slate-300">دستور الأسبوع</h3>
                            <ul className="space-y-3 text-sm text-slate-400">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span>يجب على الملك أن يقرر วัน الطلعة قبل يوم الأربعاء 8م. والمطعم قبل 10م.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span>الميزانية ما تزيد عن 175 ريال للشخص.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span>ممنوع اختيار نفس المطعم دورتين ورا بعض.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span>في حال المناسبات الخاصة يمكنك الاستيلاء على الاسبوع، وتتأجل الدورة.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span>تقييم أقل من 2 لدورتين متتاليتين يسقط دورك القادم.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Leaderboard Section */}
                        <Leaderboard
                            cycleNumber={currentWeek ? currentWeek.cycleNumber : (pastWeek ? pastWeek.cycleNumber : 1)}
                            isDean={user?.role === "dean"}
                            onReset={currentWeek ? async () => {
                                setSaving(true);
                                await services.resetCycleLeaderboard(currentWeek.id, currentWeek.cycleNumber + 1);
                                await fetchWeek();
                                setSaving(false);
                            } : undefined}
                        />

                        {/* Global Chronological Leaderboard */}
                        <GlobalLeaderboard />
                    </div>

                </div>
            )}
        </div>
    );
}
