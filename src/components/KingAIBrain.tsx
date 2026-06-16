"use client";

import { useEffect, useRef, useState } from "react";
import { Send, ExternalLink, Brain, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
    role: "user" | "model";
    text: string;
    sources?: { uri?: string; title?: string }[];
    ts: number;
}

interface KingAIBrainProps {
    userName: string;
    getAuthHeaders: () => Record<string, string>;
}

const QUICK_PROMPTS = [
    "متى آخر مرة طلعنا برغر؟",
    "مين أحسن ملك من ناحية التقييم؟",
    "اقترح ٣ مطاعم جديدة بميزانيتنا",
    "اكتب ملخص للدورة الحالية",
    "اقترح مطعم يحب طلال يجربه",
    "وش أكثر مطعم زرناه؟",
    "مين أكثر واحد يحضر؟",
    "فاجئنا باقتراح نوع أكل ما جربناه",
];

export default function KingAIBrain({ userName, getAuthHeaders }: KingAIBrainProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);
        return () => clearTimeout(t);
    }, [messages.length, busy]);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 140) + "px";
    }, [input]);

    const send = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || busy) return;
        if (msg.length > 500) {
            toast.error("الرسالة طويلة (تحت ٥٠٠ حرف)");
            return;
        }
        setBusy(true);
        setMessages((prev) => [...prev, { role: "user", text: msg, ts: Date.now() }]);
        setInput("");

        try {
            const res = await fetch("/api/king-ai/chat", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    message: msg,
                    history: messages.map((m) => ({ role: m.role, text: m.text })),
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            setMessages((prev) => [
                ...prev,
                {
                    role: "model",
                    text: json.answer || "—",
                    sources: json.sources || [],
                    ts: Date.now(),
                },
            ]);
            if (json.usage) setUsage(json.usage);
        } catch (e) {
            const errMsg = e instanceof Error ? e.message : "خطأ غير متوقع";
            setMessages((prev) => [
                ...prev,
                { role: "model", text: `⚠️ ${errMsg}`, ts: Date.now() },
            ]);
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const clearChat = () => {
        if (messages.length === 0) return;
        if (confirm("مسح المحادثة كاملة؟")) setMessages([]);
    };

    return (
        <div className="max-w-3xl mx-auto pb-32" dir="rtl">
            {/* Hero card */}
            <div className="bg-gradient-to-br from-violet-950/40 via-fuchsia-950/30 to-pink-950/30 border border-violet-500/20 rounded-3xl p-5 mb-5 flex items-center gap-4">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/40">
                    <Brain className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-lg leading-tight">دماغ ذكي لجلستكم</p>
                    <p className="text-slate-300 text-xs mt-1">
                        يعرف كل تاريخكم ويقدر يبحث في قوقل عن مطاعم جديدة.
                        {usage && <span className="text-violet-300 mr-2">· {usage.used}/{usage.limit} اليوم</span>}
                    </p>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={clearChat}
                        className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-colors"
                        aria-label="مسح المحادثة"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Empty state or messages */}
            {messages.length === 0 ? (
                <div>
                    <p className="text-slate-400 text-xs font-bold mb-3 px-1">جرّب سؤال:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {QUICK_PROMPTS.map((q) => (
                            <button
                                key={q}
                                onClick={() => send(q)}
                                disabled={busy}
                                className="text-right bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-violet-500/40 rounded-xl px-4 py-3 text-sm text-slate-200 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {messages.map((m, i) => (
                        <MessageBubble key={i} msg={m} userName={userName} />
                    ))}
                    {busy && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/70 border border-violet-500/30 rounded-2xl rounded-tr-md w-fit">
                            <span className="inline-block w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="inline-block w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="inline-block w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            )}

            {/* Fixed input — pinned to bottom of viewport. The standalone page
                has no tab bar so this sits flush at the bottom. */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 pb-safe">
                <div className="max-w-3xl mx-auto px-4 py-3">
                    <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 focus-within:border-violet-500/50 rounded-2xl px-3 py-2 transition-colors">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="اكتب سؤالك..."
                            rows={1}
                            maxLength={500}
                            disabled={busy}
                            dir="rtl"
                            className="flex-1 bg-transparent text-white text-sm outline-none resize-none py-2 placeholder:text-slate-500"
                            style={{ maxHeight: 140 }}
                        />
                        <button
                            onClick={() => send()}
                            disabled={busy || !input.trim()}
                            className="shrink-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl active:scale-90 transition-all"
                            aria-label="إرسال"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    {input.length > 0 && (
                        <p className="text-[10px] text-slate-600 text-center mt-1.5">{input.length}/500</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function MessageBubble({ msg, userName }: { msg: Message; userName: string }) {
    const isUser = msg.role === "user";
    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%] shadow-lg">
                    <p className="text-[10px] text-white/70 font-bold mb-0.5">{userName}</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl rounded-bl-sm px-4 py-3 max-w-[90%] shadow-lg">
                <div className="flex items-center gap-1.5 mb-2">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                    <p className="text-[10px] text-violet-300 font-bold">King AI Brain</p>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-100">{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-bold">المصادر:</p>
                        {msg.sources.slice(0, 4).map((s, i) => (
                            <a
                                key={i}
                                href={s.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 truncate"
                            >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{s.title || s.uri}</span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
