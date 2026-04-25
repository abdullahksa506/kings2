"use client";

import { useEffect, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { ReviewExperiment, services } from "@/lib/services";

function formatDate(value: any): string {
    try {
        const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "الآن";
        return date.toLocaleString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "الآن";
    }
}

export default function ReviewExperimentsFun() {
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [items, setItems] = useState<ReviewExperiment[]>([]);

    useEffect(() => {
        const unsub = services.listenToReviewExperiments((entries) => {
            setItems(entries);
        });
        return () => unsub();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const trimmed = text.trim();
        if (trimmed.length < 2) {
            setError("اكتب أي نص بسيط للتجربة.");
            return;
        }

        setSubmitting(true);
        try {
            const result = await services.submitReviewExperiment(trimmed);
            setText("");
            setSuccess(result.rewritten ? "تمت إعادة صياغة النص بنجاح!" : "تمت التجربة ونزلت للجميع.");
        } catch (e: any) {
            setError(e?.message || "تعذرت التجربة حالياً.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-fuchsia-500/15 text-fuchsia-400 p-2 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">نجربة المراجعات</h3>
                    <p className="text-xs text-slate-400">اكتب أي نص، ينعاد صياغته، وينعرض النصين للجميع للفلة.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 mb-4">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={500}
                    placeholder="اكتب شيء سريع للتجربة..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none focus:border-fuchsia-500/60"
                />

                {error && <p className="text-sm text-red-400">{error}</p>}
                {success && <p className="text-sm text-emerald-400">{success}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-60 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    {submitting ? "جاري التجربة..." : "جرب إعادة الصياغة"}
                </button>
            </form>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {items.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">ما في تجارب للحين.</p>
                ) : (
                    items.map((item) => (
                        <article key={item.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] text-slate-500">{formatDate(item.createdAt)}</span>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs text-slate-400">وش انكتب:</p>
                                <p className="text-sm text-slate-200 bg-slate-900/70 border border-slate-700 rounded-xl p-2.5">{item.originalText}</p>
                                <p className="text-xs text-fuchsia-300">إعادة الصياغة:</p>
                                <p className="text-sm text-fuchsia-100 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-2.5">{item.rewrittenText}</p>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </section>
    );
}
