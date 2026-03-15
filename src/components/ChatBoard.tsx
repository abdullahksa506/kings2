"use client";

import { useState, useEffect, useRef } from "react";
import { services, ChatMessage } from "@/lib/services";
import { Send, MessageCircle } from "lucide-react";

export default function ChatBoard({ userName }: { userName: string }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = services.listenToChatMessages((msgs) => {
            setMessages(msgs);
        });
        return () => unsub();
    }, []);

    const handleSend = async () => {
        if (!text.trim()) return;
        setSending(true);
        try {
            await services.sendChatMessage(userName, text.trim());
            setText("");
        } catch (e) {
            console.error(e);
            alert("حدث خطأ في إرسال الرسالة");
        }
        setSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp?.toDate) return "";
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "الآن";
        if (minutes < 60) return `${minutes} د`;
        if (hours < 24) return `${hours} س`;
        return `${days} ي`;
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800/50 p-4 border-b border-slate-700/50 flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
                    <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-white">بورد الدردشة</h3>
                    <p className="text-xs text-slate-500">دردشة عامة بين الشباب</p>
                </div>
            </div>

            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-3 flex flex-col-reverse">
                {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-slate-600 text-sm">لا توجد رسائل بعد... كن أول من يكتب!</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.userName === userName ? "items-end" : "items-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                    msg.userName === userName
                                        ? "bg-amber-600/20 border border-amber-500/30 rounded-br-md"
                                        : "bg-slate-800 border border-slate-700 rounded-bl-md"
                                }`}
                            >
                                {msg.userName !== userName && (
                                    <p className="text-xs font-semibold text-amber-400 mb-1">{msg.userName}</p>
                                )}
                                <p className="text-sm text-slate-200 leading-relaxed break-words">{msg.text}</p>
                            </div>
                            <span className="text-[10px] text-slate-600 mt-1 px-1">{formatTime(msg.createdAt)}</span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-800 flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب رسالة..."
                    maxLength={300}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500 placeholder:text-slate-600"
                />
                <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="bg-amber-600 hover:bg-amber-500 text-white p-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Send className="w-4 h-4 rotate-180" />
                </button>
            </div>
        </div>
    );
}
