"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Shield, Globe, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LogEntry {
    id: string;
    ipMasked: string;
    path: string;
    method: string;
    country: string;
    suspicious: boolean;
    createdAtMs: number;
}

interface Stats {
    totalRequests: number;
    suspiciousRequests: number;
    countries: Record<string, number>;
}

// Country code → flag emoji.
function flag(cc: string): string {
    if (!cc || cc.length !== 2 || cc === "??") return "🌐";
    const base = 0x1f1e6;
    return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
}

function timeAgo(ms: number): string {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return `${s} ث`;
    if (s < 3600) return `${Math.floor(s / 60)} د`;
    if (s < 86400) return `${Math.floor(s / 3600)} س`;
    return `${Math.floor(s / 86400)} يوم`;
}

export default function SecurityLogPanel() {
    const [open, setOpen] = useState(false);
    const [stats, setStats] = useState<Stats | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const loadStats = async () => {
        try {
            const snap = await getDoc(doc(db, "securityStats", "main"));
            if (snap.exists()) {
                const d = snap.data() as Partial<Stats>;
                setStats({
                    totalRequests: d.totalRequests ?? 0,
                    suspiciousRequests: d.suspiciousRequests ?? 0,
                    countries: d.countries ?? {},
                });
            } else {
                setStats({ totalRequests: 0, suspiciousRequests: 0, countries: {} });
            }
        } catch { /* ignore */ }
    };

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        loadStats();
        // Live feed of the most recent requests.
        const q = query(collection(db, "requestLog"), orderBy("createdAtMs", "desc"), limit(40));
        const unsub = onSnapshot(q, (snap) => {
            setLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LogEntry, "id">) })));
            setLoading(false);
        }, () => setLoading(false));
        return unsub;
    }, [open]);

    const uniqueCountries = useMemo(() => {
        if (!stats) return 0;
        return Object.keys(stats.countries).filter((c) => c && c !== "??").length;
    }, [stats]);

    const topCountries = useMemo(() => {
        if (!stats) return [];
        return Object.entries(stats.countries)
            .filter(([c]) => c && c !== "??")
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }, [stats]);

    const liveSuspicious = useMemo(() => logs.filter((l) => l.suspicious).length, [logs]);

    return (
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/25 rounded-3xl overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full p-5 flex items-center justify-between gap-3 hover:bg-emerald-500/5"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                        <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-base font-bold text-emerald-300">🛡️ سجل الأمان (الطلبات العالمية)</h3>
                        <p className="text-xs text-emerald-200/70">كل طلب يجي للموقع من أي مكان بالعالم</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-emerald-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="p-4 pt-0 space-y-4">
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <StatCard icon={<Activity className="w-4 h-4" />} label="إجمالي الطلبات" value={stats?.totalRequests ?? 0} color="cyan" />
                        <StatCard icon={<Globe className="w-4 h-4" />} label="دول مختلفة" value={uniqueCountries} color="violet" />
                        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="طلبات مشبوهة" value={stats?.suspiciousRequests ?? 0} color="rose" />
                        <StatCard icon={<Shield className="w-4 h-4" />} label="مشبوه (الأحدث)" value={liveSuspicious} color="amber" />
                    </div>

                    {/* Top countries */}
                    {topCountries.length > 0 && (
                        <div>
                            <p className="text-xs text-slate-400 font-bold mb-2">أكثر الدول</p>
                            <div className="flex flex-wrap gap-1.5">
                                {topCountries.map(([cc, n]) => (
                                    <span key={cc} className="bg-slate-800/60 border border-slate-700 rounded-full px-2.5 py-1 text-xs text-slate-200">
                                        {flag(cc)} {cc} · {n}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Live feed */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-400 font-bold">آخر الطلبات (مباشر)</p>
                            <button onClick={loadStats} className="text-slate-500 hover:text-slate-300">
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                        <div className="space-y-1.5 max-h-80 overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-6">
                                    {loading ? "يحمّل..." : "ما فيه طلبات مسجّلة بعد."}
                                </p>
                            ) : (
                                logs.map((l) => (
                                    <div
                                        key={l.id}
                                        className={`flex items-center gap-2 rounded-xl px-3 py-2 border text-xs ${
                                            l.suspicious
                                                ? "bg-rose-500/10 border-rose-500/30"
                                                : "bg-slate-900/60 border-slate-800"
                                        }`}
                                    >
                                        <span className="text-base shrink-0">{flag(l.country)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-200 font-mono truncate" dir="ltr">
                                                <span className="text-slate-500">{l.method}</span> {l.path}
                                            </p>
                                            <p className="text-[10px] text-slate-500" dir="ltr">{l.ipMasked} · {l.country}</p>
                                        </div>
                                        {l.suspicious && (
                                            <span className="shrink-0 text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded-full font-bold">
                                                مشبوه
                                            </span>
                                        )}
                                        <span className="shrink-0 text-[10px] text-slate-500">{timeAgo(l.createdAtMs)}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-600 text-center">
                        🔒 عناوين IP مخفية جزئياً للخصوصية · المشبوه = محاولات فحص معروفة (wp-admin، .env، إلخ)
                    </p>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    const colors: Record<string, string> = {
        cyan: "from-cyan-500/15 to-blue-500/10 border-cyan-500/25 text-cyan-300",
        violet: "from-violet-500/15 to-purple-500/10 border-violet-500/25 text-violet-300",
        rose: "from-rose-500/15 to-red-500/10 border-rose-500/25 text-rose-300",
        amber: "from-amber-500/15 to-orange-500/10 border-amber-500/25 text-amber-300",
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-3`}>
            <div className="flex items-center gap-1.5 mb-1 opacity-80">{icon}<span className="text-[10px]">{label}</span></div>
            <p className="text-2xl font-black">{value.toLocaleString("ar-EG")}</p>
        </div>
    );
}
