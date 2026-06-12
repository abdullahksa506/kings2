"use client";

/**
 * Live Terminal Mode — a real interactive console wired to the actual app
 * state (current week, RPC). Members can read state and perform write
 * actions (attendance, rating, voting, impromptu) just by typing Arabic
 * commands.
 *
 * Stays as a parallel route (/terminal); the normal site is untouched.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession } from "@/lib/services";
import {
    runCommand,
    QUICK_CHIPS,
    TerminalContext,
    CommandResult,
} from "@/lib/terminalCommands";

interface Entry {
    cmd?: string;
    lines: string[];
    error?: boolean;
    ok?: boolean;
    ts: number;
}

export default function TerminalPage() {
    const { user } = useAuth();
    const [week, setWeek] = useState<WeekSession | null>(null);
    const [pastWeek, setPastWeek] = useState<WeekSession | null>(null);
    const [history, setHistory] = useState<Entry[]>([
        {
            lines: [
                "╔═══════════════════════════════════════╗",
                "║   عرش الخميس — تيرمنال حي              ║",
                "║   king@thursday:~$                       ║",
                "╚═══════════════════════════════════════╝",
                "",
                'اكتب أمر، أو "مساعدة" لقائمة كاملة.',
                "",
            ],
            ts: Date.now(),
        },
    ]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [hIdx, setHIdx] = useState(-1);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Subscribe to current week (real-time)
    useEffect(() => {
        const unsub = services.listenToCurrentWeek((w) => setWeek(w));
        services.getPreviousWeek().then((p) => setPastWeek(p)).catch(() => {});
        return unsub;
    }, []);

    // Auto-scroll on new output
    useEffect(() => {
        const t = setTimeout(() => {
            scrollRef.current?.scrollTo({ top: 99_999_999, behavior: "smooth" });
        }, 30);
        return () => clearTimeout(t);
    }, [history.length]);

    // Focus input on mount + when user clicks anywhere in the console
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const ctx: TerminalContext = {
        user: user ? { name: user.name, role: user.role } : null,
        week,
        pastWeek,
    };

    const execute = async (raw: string) => {
        const cmd = raw.trim();
        if (!cmd || busy) return;
        setBusy(true);
        setCmdHistory((h) => [...h, cmd]);
        setHIdx(-1);
        const result: CommandResult = await runCommand(cmd, ctx);
        if (result.clear) {
            setHistory([{ lines: ["شاشة ممسوحة. اكتب 'مساعدة' للأوامر."], ts: Date.now() }]);
        } else {
            setHistory((h) => [
                ...h,
                {
                    cmd,
                    lines: result.lines,
                    error: result.error,
                    ok: result.ok,
                    ts: Date.now(),
                },
            ]);
        }
        setInput("");
        setBusy(false);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // ArrowUp/Down through command history
        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (cmdHistory.length === 0) return;
            const next = hIdx < 0 ? cmdHistory.length - 1 : Math.max(0, hIdx - 1);
            setHIdx(next);
            setInput(cmdHistory[next] || "");
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (hIdx < 0) return;
            const next = hIdx + 1;
            if (next >= cmdHistory.length) {
                setHIdx(-1);
                setInput("");
            } else {
                setHIdx(next);
                setInput(cmdHistory[next]);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0e0a] text-green-400 font-mono flex flex-col" dir="rtl">
            {/* Sticky top bar */}
            <div className="sticky top-0 z-40 bg-[#0d130d]/95 backdrop-blur-sm border-b border-green-500/20">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="text-green-600 hover:text-green-400 p-2 rounded hover:bg-green-500/10">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-green-300 text-sm">king@thursday:~$ &nbsp;التيرمنال الحي</h1>
                            <p className="text-[10px] text-green-700">
                                {user?.name ? `مسجّل دخول: ${user.name}` : "غير مسجل دخول — معلومات فقط"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    </div>
                </div>
            </div>

            {/* Console output */}
            <div
                ref={scrollRef}
                className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 overflow-y-auto"
                onClick={() => inputRef.current?.focus()}
            >
                {history.map((e, i) => (
                    <div key={i} className="mb-3">
                        {e.cmd && (
                            <p className="text-green-300 flex gap-2">
                                <span className="text-green-600">$</span>
                                <span>{e.cmd}</span>
                            </p>
                        )}
                        {e.lines.map((line, j) => (
                            <p
                                key={j}
                                className={`whitespace-pre-wrap text-sm ${
                                    e.error ? "text-red-400" : e.ok ? "text-emerald-300" : "text-green-500"
                                }`}
                                dir="auto"
                            >
                                {line || " "}
                            </p>
                        ))}
                    </div>
                ))}
                {busy && <p className="text-green-700 text-sm animate-pulse">يشتغل...</p>}
            </div>

            {/* Quick chips */}
            <div className="max-w-4xl mx-auto w-full px-4 pb-2">
                <div className="flex flex-wrap gap-1.5">
                    {QUICK_CHIPS.map((c) => (
                        <button
                            key={c}
                            onClick={() => execute(c)}
                            disabled={busy}
                            className="text-xs border border-green-500/30 text-green-400 px-2 py-0.5 rounded hover:bg-green-500/10 disabled:opacity-40"
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input row */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    execute(input);
                }}
                className="sticky bottom-0 z-40 bg-[#0d130d]/95 backdrop-blur-sm border-t border-green-500/20"
            >
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2" dir="ltr">
                    <span className="text-green-400 font-bold select-none">$</span>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        disabled={busy}
                        placeholder="اكتب أمر..."
                        className="flex-1 bg-transparent text-green-300 outline-none placeholder:text-green-700 text-sm"
                        dir="auto"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                    />
                    <button
                        type="submit"
                        disabled={busy || !input.trim()}
                        className="text-green-400 text-xs border border-green-500/40 px-2 py-0.5 rounded hover:bg-green-500/10 disabled:opacity-40"
                    >
                        ↵
                    </button>
                </div>
            </form>
        </div>
    );
}
