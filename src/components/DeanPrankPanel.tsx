"use client";

import { useEffect, useState } from "react";
import { Skull, Send, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { VALID_NAMES } from "@/lib/services";
import {
    PrankConfig,
    PrankIntensity,
    getAllPrankConfigs,
    updatePrankConfig,
    triggerPhantomPush,
    DEFAULT_CONFIG,
} from "@/lib/prankServices";

interface DeanPrankPanelProps {
    deanName: string;
}

const INTENSITY_LABELS: Record<PrankIntensity, string> = {
    light: "😶 خفيف",
    medium: "😬 متوسط",
    scary: "💀 مرعب",
};

export default function DeanPrankPanel({ deanName }: DeanPrankPanelProps) {
    const [configs, setConfigs] = useState<Record<string, PrankConfig>>({});
    const [expanded, setExpanded] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const refresh = async () => {
        try {
            const list = await getAllPrankConfigs();
            const map: Record<string, PrankConfig> = {};
            for (const n of VALID_NAMES) {
                map[n] = { userName: n, ...DEFAULT_CONFIG };
            }
            for (const c of list) map[c.userName] = c;
            setConfigs(map);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (open) refresh();
    }, [open]);

    const cfgFor = (name: string): PrankConfig =>
        configs[name] || { userName: name, ...DEFAULT_CONFIG };

    const setField = async (
        name: string,
        field: keyof Omit<PrankConfig, "userName" | "updatedAtMs">,
        value: PrankConfig[keyof PrankConfig],
    ) => {
        if (busy) return;
        setBusy(name);
        const current = cfgFor(name);
        // Optimistic
        setConfigs((prev) => ({ ...prev, [name]: { ...current, [field]: value } }));
        try {
            // When enabling master for the first time, ALSO persist all
            // visible defaults — otherwise the server reads them as undefined
            // and the effects don't actually trigger.
            if (field === "enabled" && value === true) {
                await updatePrankConfig(name, {
                    enabled: true,
                    intensity: current.intensity,
                    textGlitch: current.textGlitch,
                    aiWhispers: current.aiWhispers,
                    phantomPush: current.phantomPush,
                    leaderboardIllusion: current.leaderboardIllusion,
                    screenGlitch: current.screenGlitch,
                });
            } else {
                await updatePrankConfig(name, { [field]: value });
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "خطأ");
            await refresh();
        } finally {
            setBusy(null);
        }
    };

    const phantomNow = async (name: string) => {
        if (busy || name === deanName) return;
        setBusy(`phantom-${name}`);
        try {
            await triggerPhantomPush(name);
            toast.success(`👻 إشعار وصل لـ ${name}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "ما وصل");
        } finally {
            setBusy(null);
        }
    };

    // Hide panel if dean is not displayed
    return (
        <div className="bg-gradient-to-br from-purple-950/40 to-rose-950/40 border-2 border-rose-500/30 rounded-3xl overflow-hidden mb-4">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full p-5 flex items-center justify-between gap-3 hover:bg-rose-500/5"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40">
                        <Skull className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="text-right">
                        <h3 className="text-base font-bold text-rose-300">🎭 Prank Mode</h3>
                        <p className="text-xs text-rose-200/70">سرّي — للعميد فقط</p>
                    </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-rose-300 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="p-5 pt-0 space-y-3">
                    {VALID_NAMES.filter((n) => n !== deanName).map((name) => {
                        const c = cfgFor(name);
                        const isExpanded = expanded === name;
                        const activeCount = [
                            c.textGlitch,
                            c.aiWhispers,
                            c.phantomPush,
                            c.leaderboardIllusion,
                            c.screenGlitch,
                        ].filter(Boolean).length;
                        return (
                            <div
                                key={name}
                                className={`rounded-2xl border transition-colors ${
                                    c.enabled
                                        ? "bg-rose-500/10 border-rose-500/40"
                                        : "bg-slate-900/50 border-slate-700"
                                }`}
                            >
                                <div className="p-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-white text-sm">
                                            {name} {c.enabled && "💀"}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {c.enabled
                                                ? `${activeCount}/5 مفعّل · ${INTENSITY_LABELS[c.intensity]}`
                                                : "ساكن"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Master switch */}
                                        <button
                                            onClick={() => setField(name, "enabled", !c.enabled)}
                                            disabled={busy === name}
                                            className={`relative w-12 h-7 rounded-full transition-colors ${
                                                c.enabled ? "bg-rose-500" : "bg-slate-700"
                                            }`}
                                        >
                                            <div
                                                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${
                                                    c.enabled ? "right-0.5" : "left-0.5"
                                                }`}
                                            />
                                        </button>
                                        <button
                                            onClick={() => setExpanded(isExpanded ? null : name)}
                                            className="text-xs text-rose-300 px-2 py-1 rounded hover:bg-rose-500/20"
                                        >
                                            {isExpanded ? "إغلاق" : "تفاصيل"}
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-3 pt-0 space-y-2.5">
                                        {/* Intensity */}
                                        <div>
                                            <p className="text-xs text-slate-400 mb-1.5">الشدة</p>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {(["light", "medium", "scary"] as PrankIntensity[]).map((lvl) => (
                                                    <button
                                                        key={lvl}
                                                        onClick={() => setField(name, "intensity", lvl)}
                                                        className={`text-xs py-1.5 rounded-lg border transition-all ${
                                                            c.intensity === lvl
                                                                ? "bg-rose-500 text-white border-rose-400"
                                                                : "bg-slate-900 text-slate-300 border-slate-700"
                                                        }`}
                                                    >
                                                        {INTENSITY_LABELS[lvl]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Toggles */}
                                        <div className="space-y-1.5">
                                            <ToggleRow
                                                label="🔤 تبديل اسمه في النصوص"
                                                hint="يستبدل بـ 'نعرفك' / 'نراك' لثانية"
                                                checked={c.textGlitch}
                                                onChange={(v) => setField(name, "textGlitch", v)}
                                            />
                                            <ToggleRow
                                                label="🧠 همسات AI"
                                                hint="King AI Brain يدخل جمل غريبة في ردوده"
                                                checked={c.aiWhispers}
                                                onChange={(v) => setField(name, "aiWhispers", v)}
                                            />
                                            <ToggleRow
                                                label="👻 إشعارات شبحية"
                                                hint="رسائل push غامضة"
                                                checked={c.phantomPush}
                                                onChange={(v) => setField(name, "phantomPush", v)}
                                            />
                                            <ToggleRow
                                                label="📉 لوحة الترتيب المسحورة"
                                                hint="نقاطه تنزل بصرياً (الأرقام الحقيقية ما تتغير)"
                                                checked={c.leaderboardIllusion}
                                                onChange={(v) => setField(name, "leaderboardIllusion", v)}
                                            />
                                            <ToggleRow
                                                label="💥 ومضات الشاشة"
                                                hint="فلاش أحمر + همس عند نقرات عشوائية"
                                                checked={c.screenGlitch}
                                                onChange={(v) => setField(name, "screenGlitch", v)}
                                            />
                                        </div>

                                        {/* Manual phantom push */}
                                        <button
                                            onClick={() => phantomNow(name)}
                                            disabled={busy === `phantom-${name}`}
                                            className="w-full mt-2 flex items-center justify-center gap-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold py-2 rounded-xl active:scale-95 disabled:opacity-50"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                            {busy === `phantom-${name}` ? "يُرسل..." : `أرسل إشعار شبحي الآن إلى ${name} 👻`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ToggleRow({
    label,
    hint,
    checked,
    onChange,
}: {
    label: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{label}</p>
                <p className="text-[10px] text-slate-500">{hint}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                    checked ? "bg-rose-500" : "bg-slate-700"
                }`}
            >
                <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        checked ? "right-0.5" : "left-0.5"
                    }`}
                />
            </button>
        </div>
    );
}
