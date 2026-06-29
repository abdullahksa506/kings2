"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { VALID_NAMES } from "@/lib/services";

interface WhisperPanelProps {
    userName: string;
    getAuthHeaders: () => Record<string, string>;
}

const MAX_MESSAGE = 200;

export default function WhisperPanel({ userName, getAuthHeaders }: WhisperPanelProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [remainingMs, setRemainingMs] = useState(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Other members (you can't whisper to yourself).
    const others = VALID_NAMES.filter((n) => n !== userName);

    // Fetch the current cooldown on mount.
    useEffect(() => {
        fetch("/api/whisper/send", { headers: getAuthHeaders() })
            .then((r) => r.json())
            .then((j) => { if (typeof j.remainingMs === "number") setRemainingMs(j.remainingMs); })
            .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Countdown tick.
    useEffect(() => {
        if (remainingMs <= 0) {
            if (tickRef.current) clearInterval(tickRef.current);
            return;
        }
        tickRef.current = setInterval(() => {
            setRemainingMs((ms) => Math.max(0, ms - 1000));
        }, 1000);
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [remainingMs > 0]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = (name: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    const selectAll = () => {
        setSelected((prev) => (prev.size === others.length ? new Set() : new Set(others)));
    };

    const send = async () => {
        if (busy || remainingMs > 0) return;
        if (selected.size === 0) { toast.error("اختر مين تهمس له"); return; }
        if (!message.trim()) { toast.error("اكتب الهمسة"); return; }
        setBusy(true);
        try {
            const res = await fetch("/api/whisper/send", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ recipients: [...selected], message: message.trim() }),
            });
            const json = await res.json();
            if (res.status === 429) {
                setRemainingMs(json.waitMs || 0);
                toast.error(json.error || "لسا ما مرّت النص ساعة");
                return;
            }
            if (!res.ok) throw new Error(json?.error || "خطأ");
            toast.success(json.message || "تم الإرسال 🤫");
            setMessage("");
            setSelected(new Set());
            setRemainingMs(json.nextAvailableMs ? json.nextAvailableMs - Date.now() : 30 * 60 * 1000);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "ما قدرنا نرسل");
        } finally {
            setBusy(false);
        }
    };

    const fmtCooldown = (ms: number) => {
        const total = Math.ceil(ms / 1000);
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    return (
        <div className="bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/30 rounded-3xl p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
                    🤫
                </div>
                <div>
                    <h3 className="text-lg font-black text-white">نظام الهمس</h3>
                    <p className="text-xs text-slate-400">أرسل إشعار سرّي لأي شخص أو مجموعة — همسة كل نص ساعة</p>
                </div>
            </div>

            {/* Recipients */}
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> مين تهمس له؟
                </p>
                <button onClick={selectAll} className="text-[11px] text-indigo-300 hover:text-indigo-200 font-bold">
                    {selected.size === others.length ? "إلغاء الكل" : "الكل"}
                </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
                {others.map((n) => {
                    const on = selected.has(n);
                    return (
                        <button
                            key={n}
                            onClick={() => toggle(n)}
                            className={`relative py-2.5 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                                on
                                    ? "bg-indigo-500 text-white border-indigo-400"
                                    : "bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800"
                            }`}
                        >
                            {on && <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5" />}
                            {n}
                        </button>
                    );
                })}
            </div>

            {/* Message */}
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب همستك..."
                rows={2}
                maxLength={MAX_MESSAGE}
                dir="rtl"
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-white text-sm outline-none resize-none transition-colors mb-2"
            />
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-600">{message.length}/{MAX_MESSAGE}</span>
                {remainingMs > 0 ? (
                    <div className="flex-1 text-center bg-slate-800/60 border border-slate-700 rounded-xl py-2.5 text-amber-400 text-sm font-bold">
                        ⏳ تقدر تهمس بعد {fmtCooldown(remainingMs)}
                    </div>
                ) : (
                    <button
                        onClick={send}
                        disabled={busy || selected.size === 0 || !message.trim()}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <Send className="w-4 h-4" />
                        {busy ? "يُرسل..." : `اهمس ${selected.size > 0 ? `(${selected.size})` : ""}`}
                    </button>
                )}
            </div>
            <p className="text-[10px] text-slate-600 mt-2 text-center">
                همسة وحدة كل نص ساعة — محمي من جهة الخادم 🔒
            </p>
        </div>
    );
}
