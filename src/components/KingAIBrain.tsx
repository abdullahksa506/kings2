"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, ExternalLink, Brain } from "lucide-react";
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
    { icon: "🍔", q: "متى آخر مرة طلعنا برغر؟" },
    { icon: "🏆", q: "مين أحسن ملك من ناحية التقييم؟" },
    { icon: "✨", q: "اقترح لنا ٣ مطاعم جديدة بميزانيتنا" },
    { icon: "📊", q: "اكتب ملخص للدورة الحالية" },
    { icon: "🤔", q: "اقترح مطعم يحب طلال يجربه" },
    { icon: "🚨", q: "وش أكثر مطعم زرناه؟" },
    { icon: "📅", q: "مين أكثر واحد يحضر؟" },
    { icon: "🎲", q: "فاجئنا باقتراح فيه نوع أكل ما جربناه" },
];

export default function KingAIBrain({ userName, getAuthHeaders }: KingAIBrainProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            scrollRef.current?.scrollTo({ top: 99_999_999, behavior: "smooth" });
        }, 50);
        return () => clearTimeout(t);
    }, [messages.length, busy]);

    const send = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || busy) return;
        if (msg.length > 500) {
            toast.error("الرسالة طويلة (تحت ٥٠٠ حرف)");
            return;
        }
        setBusy(true);
        const userMsg: Message = { role: "user", text: msg, ts: Date.now() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
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
            if (!res.ok) {
                throw new Error(json?.error || "خطأ");
            }
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

    return (
        <div className="max-w-2xl mx-auto h-[calc(100dvh-9rem)] flex flex-col" dir="rtl">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl mb-4 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-5 shadow-2xl">
                <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-cyan-400/30 rounded-full blur-3xl" />
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                        <Brain className="w-9 h-9 text-white drop-shadow-lg" />
                    </div>
                    <div className="flex-1 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black drop-shadow-lg">King AI Brain</h1>
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <p className="text-sm text-white/85">دماغ ذكي يعرف كل تاريخ الجلسة 👑</p>
                        {usage && (
                            <p className="text-[11px] text-white/75 mt-1">
                                {usage.used}/{usage.limit} سؤال اليوم
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1"
            >
                {messages.length === 0 && (
                    <div className="space-y-4">
                        <div className="bg-slate-900/70 border border-violet-500/20 rounded-2xl p-4 text-center">
                            <Brain className="w-12 h-12 text-violet-400 mx-auto mb-2" />
                            <p className="text-white font-bold text-base">مرحباً {userName}! 👋</p>
                            <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                                اسألني عن أي شي يخص الجلسة — المطاعم، الطلعات، الأعضاء، التصويتات، أو دور لك على مطعم جديد.
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold mb-2">💡 أسئلة سريعة:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {QUICK_PROMPTS.map((p) => (
                                    <button
                                        key={p.q}
                                        onClick={() => send(p.q)}
                                        disabled={busy}
                                        className="text-right bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-200 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        <span className="mr-1.5">{p.icon}</span>
                                        {p.q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <MessageBubble key={i} msg={m} userName={userName} />
                ))}

                {busy && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/60 border border-violet-500/30 rounded-2xl rounded-tr-md max-w-fit">
                        <span className="inline-block w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="inline-block w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="inline-block w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        <span className="text-xs text-violet-300 mr-1">يفكر...</span>
                    </div>
                )}
            </div>

            {/* Input bar */}
            <div className="mt-3 bg-slate-900/80 backdrop-blur border border-violet-500/30 rounded-2xl p-2 shadow-xl">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="اكتب سؤالك..."
                        rows={1}
                        maxLength={500}
                        disabled={busy}
                        className="flex-1 bg-transparent text-white text-sm outline-none resize-none px-3 py-2 placeholder:text-slate-500 max-h-32"
                    />
                    <button
                        onClick={() => send()}
                        disabled={busy || !input.trim()}
                        className="shrink-0 bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl active:scale-90 transition-all shadow-lg"
                        aria-label="إرسال"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-1">
                    {input.length}/500 · Enter للإرسال · Shift+Enter لسطر جديد
                </p>
            </div>
        </div>
    );
}

function MessageBubble({ msg, userName }: { msg: Message; userName: string }) {
    const isUser = msg.role === "user";
    if (isUser) {
        return (
            <div className="flex justify-end">
                <div className="bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[85%] shadow-lg">
                    <p className="text-[10px] text-white/70 font-bold mb-0.5">{userName}</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex justify-start">
            <div className="bg-slate-900/80 border border-violet-500/30 backdrop-blur text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[90%] shadow-lg">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <Brain className="w-3.5 h-3.5 text-violet-400" />
                    <p className="text-[10px] text-violet-300 font-bold">King AI Brain</p>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-700/50 space-y-1.5">
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
