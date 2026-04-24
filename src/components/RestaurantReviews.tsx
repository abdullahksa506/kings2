"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote, Send, ShieldCheck } from "lucide-react";
import { RestaurantReview, services } from "@/lib/services";

function formatReviewDate(value: any): string {
    try {
        const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "الآن";
        return date.toLocaleString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "الآن";
    }
}

export default function RestaurantReviews() {
    const [restaurantName, setRestaurantName] = useState("");
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [reviews, setReviews] = useState<RestaurantReview[]>([]);

    useEffect(() => {
        const unsub = services.listenToRestaurantReviews((items) => {
            setReviews(items);
        });
        return () => unsub();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const trimmedRestaurant = restaurantName.trim();
        const trimmedText = text.trim();
        if (trimmedRestaurant.length < 2) {
            setError("اكتب اسم مطعم صالح.");
            return;
        }
        if (trimmedText.length < 10) {
            setError("اكتب مراجعة أوضح (10 أحرف على الأقل).");
            return;
        }

        setSubmitting(true);
        try {
            const result = await services.submitRestaurantReview(trimmedRestaurant, trimmedText);
            setRestaurantName("");
            setText("");
            setSuccess(result.note || "تم إرسال المراجعة بنجاح بشكل سري.");
        } catch (e: any) {
            setError(e?.message || "تعذر إرسال المراجعة الآن.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
                <div className="bg-cyan-500/15 text-cyan-400 p-2 rounded-xl">
                    <MessageSquareQuote className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-xl text-white">المراجعات</h3>
                    <p className="text-xs text-slate-400">اختيارية بالكامل. الهوية محمية والمراجعة تنعرض بدون اسمك.</p>
                </div>
            </div>

            <div className="mb-4 p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                <p>المراجعة تمر على إعادة صياغة تلقائية للمغربية بنفس المعنى قبل النشر لزيادة الخصوصية.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mb-5">
                <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    maxLength={80}
                    placeholder="اسم المطعم"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-cyan-500/60"
                />
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={800}
                    rows={4}
                    placeholder="اكتب مراجعتك هنا (اختياري لكن مفيد)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-cyan-500/60 resize-y"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}
                {success && <p className="text-sm text-emerald-400">{success}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    {submitting ? "جاري الإرسال..." : "إرسال مراجعة سرية"}
                </button>
            </form>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {reviews.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">لا توجد مراجعات بعد.</p>
                ) : (
                    reviews.map((review) => (
                        <article key={review.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-cyan-300">{review.restaurantName}</h4>
                                <span className="text-[11px] text-slate-500">{formatReviewDate(review.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed">{review.text}</p>
                        </article>
                    ))
                )}
            </div>
        </div>
    );
}
