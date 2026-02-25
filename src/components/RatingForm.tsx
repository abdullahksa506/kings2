"use client";

import { useState } from "react";
import { services } from "@/lib/services";
import { Star, Send, Lock } from "lucide-react";

export default function RatingForm({ weekId, userName, onRated, disabled = false }: { weekId: string, userName: string, onRated: () => void, disabled?: boolean }) {
    const [hoveredStar, setHoveredStar] = useState(0);
    const [score, setScore] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (score === 0 || disabled) return;
        setSubmitting(true);
        try {
            await services.submitRating(weekId, userName, score);
            onRated();
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء التقييم");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`bg-slate-900 border rounded-2xl p-6 text-center ${disabled ? "border-slate-800/50 opacity-60" : "border-slate-800"}`}>
            <h3 className="text-xl font-bold text-white mb-2">كيف كانت طلعة هذا الأسبوع؟</h3>
            <p className="text-slate-400 text-sm mb-6">تقييمك سري ولن يراه سوى عميد الدستور.</p>

            {disabled && (
                <div className="flex items-center justify-center gap-2 mb-4 text-slate-500 text-sm">
                    <Lock className="w-4 h-4" />
                    <span>التقييم مقفل حالياً — بانتظار العميد يفتحه</span>
                </div>
            )}

            <div className="flex justify-center gap-2 mb-8" dir="ltr">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onMouseEnter={() => !disabled && setHoveredStar(star)}
                        onMouseLeave={() => !disabled && setHoveredStar(0)}
                        onClick={() => !disabled && setScore(star)}
                        className={`p-1 transition-transform focus:outline-none ${disabled ? "cursor-not-allowed" : "hover:scale-110"}`}
                        disabled={disabled}
                    >
                        <Star
                            className={`w-12 h-12 transition-colors duration-200 ${!disabled && (hoveredStar || score) >= star ? "fill-amber-500 text-amber-500" : "text-slate-700"}`}
                        />
                    </button>
                ))}
            </div>

            <button
                onClick={handleSubmit}
                disabled={score === 0 || submitting || disabled}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mx-auto"
            >
                {disabled ? "التقييم مقفل" : submitting ? "جاري الإرسال..." : "إرسال التقييم"}
                {disabled ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4 rotate-180" />}
            </button>
        </div>
    );
}

