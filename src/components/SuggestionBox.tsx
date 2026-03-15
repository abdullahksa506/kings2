"use client";

import { useState } from "react";
import { services, Suggestion } from "@/lib/services";
import { Send, Eye, Lightbulb, CheckCircle2 } from "lucide-react";

export default function SuggestionBox({ isDean }: { isDean: boolean }) {
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Dean view
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setSubmitting(true);
        try {
            await services.submitSuggestion(text.trim());
            setText("");
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 4000);
        } catch (e) {
            console.error(e);
            alert("حدث خطأ");
        }
        setSubmitting(false);
    };

    const loadSuggestions = async () => {
        setLoadingSuggestions(true);
        setShowSuggestions(true);
        try {
            const data = await services.getAllSuggestions();
            setSuggestions(data);
        } catch (e) {
            console.error(e);
        }
        setLoadingSuggestions(false);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500/20 p-2 rounded-xl text-purple-400">
                    <Lightbulb className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-xl text-white">صندوق الاقتراحات</h3>
                    <p className="text-xs text-slate-500">اقتراحك سري ولا يظهر اسمك</p>
                </div>
            </div>

            {submitted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-emerald-400 font-bold text-lg mb-1">شكراً لك!</p>
                    <p className="text-slate-400 text-sm">تم استلام اقتراحك وسيتم النظر فيه من قبل العميد 🙏</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="اكتب اقتراحك هنا... (سري تماماً)"
                        rows={3}
                        maxLength={500}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-purple-500 resize-none placeholder:text-slate-600"
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-600">{text.length}/500</span>
                        <button
                            onClick={handleSubmit}
                            disabled={!text.trim() || submitting}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Send className="w-4 h-4 rotate-180" />
                            {submitting ? "جاري الإرسال..." : "إرسال"}
                        </button>
                    </div>
                </div>
            )}

            {/* Dean Section */}
            {isDean && (
                <div className="mt-6 pt-4 border-t border-purple-500/20">
                    <button
                        onClick={loadSuggestions}
                        className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Eye className="w-4 h-4" />
                        {showSuggestions ? "تحديث الاقتراحات" : "عرض الاقتراحات (العميد فقط)"}
                    </button>
                    {showSuggestions && (
                        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                            {loadingSuggestions ? (
                                <div className="flex justify-center p-4">
                                    <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                </div>
                            ) : suggestions.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">لا توجد اقتراحات بعد</p>
                            ) : (
                                suggestions.map(s => (
                                    <div key={s.id} className="bg-slate-950 border border-purple-500/10 rounded-xl p-4">
                                        <p className="text-slate-300 text-sm leading-relaxed">{s.text}</p>
                                        <p className="text-xs text-slate-600 mt-2">
                                            {s.createdAt?.toDate?.() ? s.createdAt.toDate().toLocaleDateString("ar-SA") : ""}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
