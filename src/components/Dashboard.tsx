"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, VALID_NAMES } from "@/lib/services";
import { Crown, Calendar, MapPin, CheckCircle, Shield, PlusCircle, AlertTriangle, PlayCircle, Lock, Unlock, RotateCcw } from "lucide-react";
import { isBefore, setDay, setHours, setMinutes } from "date-fns";
import RatingForm from "./RatingForm";
import DeanDashboard from "./DeanDashboard";
import Leaderboard from "./Leaderboard";
import GlobalLeaderboard from "./GlobalLeaderboard";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [currentWeek, setCurrentWeek] = useState<WeekSession | null>(null);
    const [hasRatedCurrentWeek, setHasRatedCurrentWeek] = useState(false);
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

    const fetchWeek = async () => {
        setLoading(true);
        const week = await services.getCurrentWeek();
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

        setLoading(false);
    };

    useEffect(() => {
        fetchWeek();
    }, [user]);

    const handleSetChoices = async () => {
        if (!currentWeek || !user) return;
        setSaving(true);
        try {
            await services.setWeekChoices(currentWeek.id, selectedDay, restaurant, null);
            await fetchWeek();
            toast.success("تم حفظ القرارات بنجاح");
        } catch (e) {
            console.error(e);
            toast.error("حدث خطأ أثناء الحفظ");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setChangePasswordLoading(true);

        try {
            await services.changePassword(user.name, currentPassword, newPassword);
            toast.success("تم تغيير كلمة المرور بنجاح");
            setIsChangePasswordOpen(false);
            setCurrentPassword("");
            setNewPassword("");
        } catch (e: any) {
            toast.error(e.message || "حدث خطأ ما");
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
            toast.success(currentWeek ? "تم إنهاء الأسبوع وبدء أسبوع جديد!" : "تم بدء الدورة بنجاح!");
        } catch (e) {
            console.error(e);
            toast.error("حدث خطأ أثناء بدء الأسبوع الجديد");
        } finally {
            setSaving(false);
        }
    };

    const isKing = currentWeek?.king === user?.name;

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans relative">
            {/* Version Badge */}
            <div className="fixed top-2 left-2 z-50 text-[10px] text-slate-600 font-mono select-none">v7</div>
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-800">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Crown className="w-8 h-8 text-amber-500" />
                        عرش الخميس
                    </h1>
                    <p className="text-slate-400 mt-2">أهلاً بك، {user?.name}</p>
                </div>
                <div className="flex gap-2 text-xs md:text-sm">
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
            <AnimatePresence>
                {isChangePasswordOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                            <h2 className="text-xl font-bold text-amber-500 mb-4">تغيير كلمة المرور</h2>

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
                                        }}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

                        {currentWeek && (
                            <div className="flex items-center gap-2 bg-slate-950/40 p-1 rounded-xl border border-amber-500/20">
                                <span className="text-slate-400 text-sm px-2">تغيير سري للملك:</span>
                                <select
                                    className="bg-slate-900 text-amber-500 border border-slate-700/50 rounded-lg p-2 text-sm outline-none w-32 focus:border-amber-500"
                                    value={currentWeek.isRandom ? "" : currentWeek.king || ""}
                                    onChange={async (e) => {
                                        setSaving(true);
                                        const newKing = e.target.value === "" ? null : e.target.value;
                                        try {
                                            await services.secretlyChangeKing(currentWeek.id, newKing);
                                            await fetchWeek();
                                            toast.success("تم تغيير الملك بنجاح");
                                        } catch (err) {
                                            toast.error("حدث خطأ أثناء تغيير الملك");
                                        } finally {
                                            setSaving(false);
                                        }
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

                        {currentWeek && (
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        await services.toggleRatingEnabled(currentWeek.id, !currentWeek.ratingEnabled);
                                        await fetchWeek();
                                        toast.success(currentWeek.ratingEnabled ? "تم قفل التقييم" : "تم فتح التقييم بنجاح");
                                    } catch (err) {
                                        toast.error("حدث خطأ أثناء تغيير حالة التقييم");
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className={`py-3 px-6 rounded-xl flex items-center gap-2 transition-all font-semibold ${currentWeek.ratingEnabled
                                    ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                                    : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                                    }`}
                            >
                                {currentWeek.ratingEnabled ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                {currentWeek.ratingEnabled ? "قفل التقييم" : "فتح التقييم للأعضاء"}
                            </button>
                        )}
                    </div>

                    {/* Dean can see stats + reset codes + phone numbers */}
                    <DeanDashboard weekId={currentWeek?.id} />
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full animate-pulse">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 h-80 flex flex-col gap-6">
                            <div className="h-8 w-48 bg-slate-800 rounded-lg"></div>
                            <div className="h-12 w-64 bg-slate-800 rounded-xl"></div>
                            <div className="space-y-4 flex-1">
                                <div className="h-20 w-full bg-slate-950/50 rounded-2xl border border-slate-800"></div>
                                <div className="h-20 w-full bg-slate-950/50 rounded-2xl border border-slate-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-64">
                            <div className="h-6 w-32 bg-slate-800 rounded-lg mb-6"></div>
                            <div className="space-y-4">
                                <div className="h-4 w-full bg-slate-800 rounded"></div>
                                <div className="h-4 w-5/6 bg-slate-800 rounded"></div>
                                <div className="h-4 w-4/6 bg-slate-800 rounded"></div>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-80">
                            <div className="h-6 w-40 bg-slate-800 rounded-lg mb-6"></div>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-16 w-full bg-slate-800/50 rounded-2xl border border-slate-800/60"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Status Card */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* CURRENT WEEK RATING (Only if current week exists and user hasn't rated and is not the king) */}
                        {currentWeek && !hasRatedCurrentWeek && user?.name !== currentWeek.king && (
                            <RatingForm
                                weekId={currentWeek.id}
                                userName={user?.name || ""}
                                onRated={() => setHasRatedCurrentWeek(true)}
                                disabled={!currentWeek.ratingEnabled}
                            />
                        )}

                        {!currentWeek ? (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center p-16 bg-slate-900/50 rounded-3xl border border-slate-800">
                                <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-2xl font-semibold text-slate-300">لا يوجد أسبوع نشط حالياً</h3>
                                <p className="text-slate-500 mt-2">ننتظر العميد لبدء الدورة الجديدة.</p>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
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
                            </motion.div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl sticky top-8">
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
                        </motion.div>

                        {/* Leaderboard Section */}
                        <Leaderboard
                            cycleNumber={currentWeek ? currentWeek.cycleNumber : 1}
                            isDean={user?.role === "dean"}
                            onReset={currentWeek ? async () => {
                                setSaving(true);
                                try {
                                    await services.resetCycleLeaderboard(currentWeek.id, currentWeek.cycleNumber + 1);
                                    await fetchWeek();
                                    toast.success("تم تصفير الدورة بنجاح");
                                } catch (err) {
                                    toast.error("حدث خطأ أثناء التصفير");
                                } finally {
                                    setSaving(false);
                                }
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
