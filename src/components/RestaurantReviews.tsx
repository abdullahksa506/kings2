"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote, ShieldCheck } from "lucide-react";
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
    const [reviews, setReviews] = useState<RestaurantReview[]>([]);

    useEffect(() => {
        const unsub = services.listenToRestaurantReviews((items) => {
            setReviews(items);
        });
        return () => unsub();
    }, []);

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
                <p>المراجعة الأساسية تكتب فقط وقت التقييم، وهنا تظهر النتائج على شكل قائمة بعد إعادة الصياغة.</p>
            </div>

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
