"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, Rating } from "@/lib/services";
import { Star, ShieldAlert, BarChart3, KeyRound } from "lucide-react";

export default function DeanDashboard({ weekId }: { weekId: string }) {
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [users, setUsers] = useState<{ id: string, name: string, phoneNumber?: string }[]>([]);
    const [resetRequests, setResetRequests] = useState<{ id: string, name: string, resetCode: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingPhone, setSavingPhone] = useState<string | null>(null);

    useEffect(() => {
        const fetchRatings = async () => {
            setLoading(true);
            try {
                if (weekId) {
                    const fetchedRatings = await services.getAllRatingsForWeek(weekId);
                    setRatings(fetchedRatings);
                }
                const allUsers = await services.getAllUsers();
                setUsers(allUsers);

                const reqs = await services.getUsersWithResetCodes();
                setResetRequests(reqs);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchRatings();
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

            {/* Phone Numbers Management Section */}
            <div className="mt-8 pt-6 border-t border-amber-900/50">
                <h3 className="text-lg font-bold text-amber-500 mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    أرقام الجوالات (لتنبيهات الواتساب)
                </h3>
                <div className="space-y-3">
                    {users.map(u => (
                        <div key={u.id} className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                            <span className="text-slate-300 min-w-[100px]">{u.name}</span>
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="+9665..."
                                    className="bg-slate-950 text-white border border-slate-700 rounded-md px-3 py-1.5 text-sm outline-none flex-1 focus:border-amber-500"
                                    value={u.phoneNumber || ""}
                                    onChange={(e) => {
                                        setUsers(prev => prev.map(user => user.id === u.id ? { ...user, phoneNumber: e.target.value } : user));
                                    }}
                                />
                                <button
                                    onClick={async () => {
                                        setSavingPhone(u.id);
                                        await services.updateUserPhone(u.id, u.phoneNumber || "");
                                        setSavingPhone(null);
                                    }}
                                    disabled={savingPhone === u.id}
                                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs px-4 rounded-md transition-colors"
                                >
                                    {savingPhone === u.id ? "..." : "حفظ"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                    ملاحظة: يجب إدخال الرقم بالصيغة الدولية (+966) لتصله رسايل التذكير عبر واتساب.
                </p>
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
