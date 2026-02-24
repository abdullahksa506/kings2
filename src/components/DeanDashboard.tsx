"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, Rating, VALID_NAMES } from "@/lib/services";
import { Star, ShieldAlert, BarChart3, KeyRound, Users, CheckCircle2 } from "lucide-react";

export default function DeanDashboard({ weekId }: { weekId?: string }) {
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [resetRequests, setResetRequests] = useState<{ id: string, name: string, resetCode: string }[]>([]);
    const [registeredNames, setRegisteredNames] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (weekId && weekId.length > 0) {
                    const fetchedRatings = await services.getAllRatingsForWeek(weekId);
                    setRatings(fetchedRatings);
                }

                const reqs = await services.getUsersWithResetCodes();
                setResetRequests(reqs);

                const allUsers = await services.getAllUsers();
                setRegisteredNames(allUsers.map((u: any) => u.name || u.id));
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchData();
    }, [weekId]);

    if (loading) return <div className="text-amber-500 font-mono text-sm animate-pulse">جاري جلب التقييمات السرية...</div>;

    const average = ratings.length > 0 ? ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length : 0;

    return (
        <div className="mt-6 pt-6 border-t border-amber-900/50">
            <h3 className="text-lg font-bold text-amber-500 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                تفاصيل تصويت الأسبوع (سرية للغاية)
            </h3>

            {ratings.length === 0 ? (
                <p className="text-slate-500 text-sm pb-4">لا يوجد تقييمات لهذا الأسبوع حتى الآن.</p>
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
        </div>
    );
}

