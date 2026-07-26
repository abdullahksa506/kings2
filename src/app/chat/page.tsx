"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ديسكورد ولا تشاتك؟"
 * قال: "تشاتي... ما فيه بوت يطردك لأنك كتبت رسالتين ورا بعض 😂🤖"
 */

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { services, ChatMessage, VALID_NAMES, PublicUserProfile } from "@/lib/services";
import { CHAT_CHANNELS, DEFAULT_CHANNEL } from "@/lib/chatChannels";
import { ChevronRight, Hash, Send, Loader2, Users, Crown } from "lucide-react";

function timeLabel(ms: number): string {
    return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" });
}
function dayLabel(ms: number): string {
    return new Date(ms).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Riyadh" });
}

function Avatar({ name, img, size = 40 }: { name: string; img?: string | null; size?: number }) {
    if (img) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={img} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
    }
    return (
        <div className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shrink-0"
            style={{ width: size, height: size, fontSize: size * 0.42 }}>
            {name.charAt(0) || "؟"}
        </div>
    );
}

export default function ChatPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.replace("/");
    }, [loading, user, router]);

    const [channel, setChannel] = useState(DEFAULT_CHANNEL);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(true);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, PublicUserProfile>>({});
    const scrollRef = useRef<HTMLDivElement>(null);

    // Live messages for the selected channel.
    useEffect(() => {
        setLoadingMsgs(true); setMessages([]);
        const unsub = services.listenToChannelMessages(channel, (msgs) => {
            setMessages(msgs);
            setLoadingMsgs(false);
        });
        return () => unsub();
    }, [channel]);

    // Member avatars/nicknames.
    useEffect(() => {
        const unsub = services.listenToPublicUserProfiles((list) => {
            const map: Record<string, PublicUserProfile> = {};
            list.forEach((p) => { map[p.userName] = p; });
            setProfiles(map);
        });
        return () => unsub();
    }, []);

    // Auto-scroll to the newest message.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput("");
        try {
            await services.sendChatMessage(channel, text);
        } catch {
            setInput(text); // restore on failure
        } finally {
            setSending(false);
        }
    };

    // Group consecutive messages by the same author within 5 minutes.
    const grouped = useMemo(() => {
        const out: { first: ChatMessage; rest: ChatMessage[]; showDay: boolean }[] = [];
        let prev: ChatMessage | null = null;
        for (const m of messages) {
            const ms = m.createdAt?.toMillis?.() ?? 0;
            const prevMs = prev?.createdAt?.toMillis?.() ?? 0;
            const newDay = !prev || new Date(ms + 3 * 3600000).getUTCDate() !== new Date(prevMs + 3 * 3600000).getUTCDate();
            const sameGroup = prev && prev.userName === m.userName && ms - prevMs < 5 * 60 * 1000 && !newDay;
            if (sameGroup && out.length) {
                out[out.length - 1].rest.push(m);
            } else {
                out.push({ first: m, rest: [], showDay: newDay });
            }
            prev = m;
        }
        return out;
    }, [messages]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#313338]"><Loader2 className="w-10 h-10 animate-spin text-indigo-400" /></div>;
    }
    if (!user) return null;

    const activeChannel = CHAT_CHANNELS.find((c) => c.id === channel) || CHAT_CHANNELS[0];

    return (
        <main className="h-[100dvh] flex bg-[#313338] text-slate-100 overflow-hidden" dir="rtl">
            {/* ── Channel sidebar (desktop) ── */}
            <aside className="hidden md:flex w-60 flex-col bg-[#2b2d31] shrink-0">
                <div className="h-12 px-4 flex items-center gap-2 border-b border-black/20 shadow-sm">
                    <button onClick={() => router.push("/")} className="p-1 rounded text-slate-400 hover:text-white" aria-label="رجوع">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-sm">شات ملك الخميس 👑</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-500 px-2 pt-2 pb-1 uppercase">القنوات</p>
                    {CHAT_CHANNELS.map((c) => (
                        <button key={c.id} onClick={() => setChannel(c.id)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition ${channel === c.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                            <Hash className="w-4 h-4 shrink-0" />
                            <span className="truncate">{c.label}</span>
                        </button>
                    ))}
                </div>
                <div className="h-14 bg-[#232428] px-3 flex items-center gap-2">
                    <Avatar name={user.name} img={profiles[user.name]?.profileImage} size={32} />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{profiles[user.name]?.nickName || user.name}</p>
                        <p className="text-[10px] text-emerald-400">متصل</p>
                    </div>
                </div>
            </aside>

            {/* ── Main chat area ── */}
            <section className="flex-1 flex flex-col min-w-0">
                {/* header */}
                <header className="h-12 px-4 flex items-center gap-2 border-b border-black/20 shadow-sm shrink-0">
                    <button onClick={() => router.push("/")} className="md:hidden p-1 rounded text-slate-400 hover:text-white" aria-label="رجوع">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <Hash className="w-5 h-5 text-slate-400" />
                    <span className="font-bold text-sm">{activeChannel.label}</span>
                    <span className="hidden sm:block text-xs text-slate-500 border-r border-slate-600 pr-2 mr-1">{activeChannel.desc}</span>
                </header>

                {/* mobile channel strip */}
                <div className="md:hidden flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-black/20 shrink-0">
                    {CHAT_CHANNELS.map((c) => (
                        <button key={c.id} onClick={() => setChannel(c.id)}
                            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${channel === c.id ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-300"}`}>
                            <span>{c.emoji}</span>{c.label}
                        </button>
                    ))}
                </div>

                {/* messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
                    {loadingMsgs ? (
                        <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
                    ) : grouped.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                            <div className="text-5xl mb-3">{activeChannel.emoji}</div>
                            <p className="font-bold text-slate-300">مرحباً في #{activeChannel.label}</p>
                            <p className="text-sm">كن أول من يكتب رسالة!</p>
                        </div>
                    ) : (
                        grouped.map((g) => {
                            const ms = g.first.createdAt?.toMillis?.() ?? 0;
                            const nick = g.first.nickName || g.first.userName;
                            const img = g.first.showProfileImage === false ? null : (g.first.profileImage ?? profiles[g.first.userName]?.profileImage);
                            return (
                                <div key={g.first.id}>
                                    {g.showDay && (
                                        <div className="flex items-center gap-3 my-3 text-[11px] text-slate-500">
                                            <div className="h-px bg-slate-700 flex-1" /> {dayLabel(ms)} <div className="h-px bg-slate-700 flex-1" />
                                        </div>
                                    )}
                                    <div className="flex gap-3 hover:bg-black/10 rounded px-1 -mx-1 py-0.5 group">
                                        <Avatar name={g.first.userName} img={img} size={40} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-semibold text-indigo-300 text-sm">{nick}</span>
                                                <span className="text-[10px] text-slate-500">{timeLabel(ms)}</span>
                                            </div>
                                            <p className="text-[15px] text-slate-100 whitespace-pre-wrap break-words leading-relaxed">{g.first.text}</p>
                                            {g.rest.map((r) => (
                                                <p key={r.id} className="text-[15px] text-slate-100 whitespace-pre-wrap break-words leading-relaxed">{r.text}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* input */}
                <div className="px-4 pb-4 pt-1 shrink-0">
                    <div className="flex items-end gap-2 bg-[#383a40] rounded-2xl px-3 py-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                            placeholder={`اكتب رسالة في #${activeChannel.label}...`}
                            rows={1}
                            className="flex-1 bg-transparent resize-none outline-none text-sm py-1.5 max-h-32 placeholder:text-slate-500"
                        />
                        <button onClick={send} disabled={sending || !input.trim()}
                            className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shrink-0">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Member list (desktop) ── */}
            <aside className="hidden lg:flex w-56 flex-col bg-[#2b2d31] shrink-0 p-3">
                <p className="text-[11px] font-bold text-slate-500 px-2 pb-2 uppercase flex items-center gap-1"><Users className="w-3.5 h-3.5" /> الأعضاء — {VALID_NAMES.length}</p>
                <div className="space-y-0.5">
                    {VALID_NAMES.map((name) => {
                        const p = profiles[name];
                        return (
                            <div key={name} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5">
                                <Avatar name={name} img={p?.profileImage} size={30} />
                                <span className="text-sm text-slate-300 truncate">{p?.nickName || name}</span>
                                {name === user.name && <Crown className="w-3.5 h-3.5 text-amber-400 mr-auto" />}
                            </div>
                        );
                    })}
                </div>
            </aside>
        </main>
    );
}
