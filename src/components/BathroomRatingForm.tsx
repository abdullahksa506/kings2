"use client";

import { useEffect, useState } from "react";
import { services } from "@/lib/services";
import { Send, Lock, Bath } from "lucide-react";

export default function BathroomRatingForm({ weekId, userName, restaurantName, onRated, disabled = false }: { weekId: string, userName: string, restaurantName?: string, onRated: () => void, disabled?: boolean }) {
    const [hoveredScore, setHoveredScore] = useState(0);
    const [score, setScore] = useState(0);
    const [bathroomName, setBathroomName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!restaurantName) return;
        setBathroomName((prev) => prev || `حمام ${restaurantName}`);
    }, [restaurantName]);

    const handleSubmit = async () => {
        const trimmedBathroom = bathroomName.trim();
        if (score === 0 || disabled || trimmedBathroom.length < 2) return;
        setSubmitting(true);
        try {
            await services.submitBathroomRating(weekId, userName, score, trimmedBathroom, restaurantName || null);
            setScore(0);
            setHoveredScore(0);
            onRated();
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء تقييم دورات المياه");
        } finally {
            setSubmitting(false);
        }
    };

    const EMOJIS = ["🤢", "😕", "😐", "🙂", "✨"];

    return (
        <div className={`bg-slate-900 border rounded-2xl p-6 text-center shadow-lg ${disabled ? "border-slate-800/50 opacity-60" : "border-slate-800"}`}>
            <h3 className="text-xl font-bold text-sky-400 mb-2 flex items-center justify-center gap-2">
                <Bath className="w-5 h-5" />
                حمامات هشام
            </h3>
            <p className="text-slate-400 text-sm mb-6">
                تقدر تضيف أي حمام بأي وقت وتقيمه مباشرة.
            </p>

            <div className="mb-5 text-right">
                <label className="block text-sm text-slate-300 mb-2">اسم الحمام</label>
                <input
                    value={bathroomName}
                    onChange={(e) => setBathroomName(e.target.value)}
                    maxLength={60}
                    placeholder={restaurantName ? `مثال: حمام ${restaurantName}` : "مثال: حمام الدور الثاني"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none focus:border-sky-500"
                    disabled={disabled || submitting}
                />
                <p className="text-[11px] text-slate-500 mt-1">الحد الأقصى 60 حرف</p>
            </div>

            {disabled && (
                <div className="flex items-center justify-center gap-2 mb-4 text-slate-500 text-sm">
                    <Lock className="w-4 h-4" />
                    <span>التقييم مقفل حالياً</span>
                </div>
            )}

            <div className="flex justify-center gap-2 mb-8" dir="ltr">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onMouseEnter={() => !disabled && setHoveredScore(star)}
                        onMouseLeave={() => !disabled && setHoveredScore(0)}
                        onClick={() => !disabled && setScore(star)}
                        className={`p-2 transition-all focus:outline-none rounded-2xl ${disabled ? "cursor-not-allowed" : "hover:scale-110 hover:bg-slate-800"} ${(!disabled && score === star) ? "bg-slate-800 border border-sky-500/30" : "border border-transparent"}`}
                        disabled={disabled}
                        title={`تقييم: ${star}/5`}
                    >
                        <span className={`text-4xl transition-all duration-200 ${(!disabled && (hoveredScore || score) >= star) ? "opacity-100 grayscale-0" : "opacity-40 grayscale"}`}>
                            {EMOJIS[star - 1]}
                        </span>
                    </button>
                ))}
            </div>

            <button
                onClick={handleSubmit}
                disabled={score === 0 || bathroomName.trim().length < 2 || submitting || disabled}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mx-auto"
            >
                {disabled ? "التقييم مقفل" : submitting ? "جاري الإرسال..." : "تأكيد واستمرار"}
                {disabled ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4 rotate-180" />}
            </button>
        </div>
    );
}

