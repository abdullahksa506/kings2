"use client";

import { useEffect, useRef, useState } from "react";
import { PrankConfig } from "@/lib/prankServices";

interface PrankEffectsProps {
    config: PrankConfig;
}

// Intensity tuning
const TEXT_GLITCH_INTERVALS: Record<string, number> = {
    light: 180_000,   // every 3 minutes
    medium: 90_000,   // every 1.5 minutes
    scary: 30_000,    // every 30 seconds
};
const SCREEN_GLITCH_CHANCE: Record<string, number> = {
    light: 0.005,     // 0.5% of clicks
    medium: 0.015,    // 1.5%
    scary: 0.04,      // 4%
};
const REPLACEMENTS_LIGHT = ["نعرفك", "نراك", "هنا 👁"];
const REPLACEMENTS_MEDIUM = ["نعرفك 👁", "نراك دائماً", "بيت تل أبيب", "نسيت تقفل"];
const REPLACEMENTS_SCARY = ["نشوفك", "ورائك 👻", "البيت يطاردك", "تذكر تل أبيب 🇮🇱", "نعرف كل شي", "آخر مرة شفناك..."];

/**
 * Global prank effects:
 *  1) Text glitch — periodically swaps the user's own name in DOM text nodes
 *  2) Screen glitch — random flash + whisper on a small percentage of clicks
 *
 * Mounted high in the React tree once per logged-in user. Does nothing if
 * `config.enabled` is false. All effects clean up after themselves.
 */
export default function PrankEffects({ config }: PrankEffectsProps) {
    const [flash, setFlash] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // === 1) Text glitch ===
    useEffect(() => {
        if (!config.enabled || !config.textGlitch || !config.userName) return;

        const interval = TEXT_GLITCH_INTERVALS[config.intensity] || 180_000;
        const pool =
            config.intensity === "scary"
                ? REPLACEMENTS_SCARY
                : config.intensity === "medium"
                    ? REPLACEMENTS_MEDIUM
                    : REPLACEMENTS_LIGHT;

        const tick = () => {
            try {
                const target = config.userName;
                if (!target) return;
                const replacement = pool[Math.floor(Math.random() * pool.length)];
                // Walk all text nodes that contain the user's name
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
                    acceptNode: (node) =>
                        node.textContent && node.textContent.includes(target)
                            ? NodeFilter.FILTER_ACCEPT
                            : NodeFilter.FILTER_REJECT,
                });
                const matches: Text[] = [];
                let n: Node | null;
                while ((n = walker.nextNode())) matches.push(n as Text);
                if (matches.length === 0) return;
                // Pick up to 2 random matches; remember original; revert after 900ms
                const sample = matches.sort(() => Math.random() - 0.5).slice(0, 2);
                const reverts: Array<() => void> = [];
                for (const node of sample) {
                    const original = node.textContent || "";
                    node.textContent = original.replace(target, replacement);
                    reverts.push(() => {
                        try { node.textContent = original; } catch { /* node removed */ }
                    });
                }
                setTimeout(() => reverts.forEach((r) => r()), 900);
            } catch {
                /* ignore — DOM races are fine */
            }
        };

        // Jittered first run + interval
        const firstDelay = 20_000 + Math.random() * 30_000;
        const firstTimer = setTimeout(() => {
            tick();
            const id = setInterval(tick, interval);
            (firstTimer as unknown as { __id: number }).__id = id as unknown as number;
        }, firstDelay);

        return () => {
            const id = (firstTimer as unknown as { __id?: number }).__id;
            if (id) clearInterval(id);
            clearTimeout(firstTimer);
        };
    }, [config.enabled, config.textGlitch, config.intensity, config.userName]);

    // === 2) Screen glitch (random click flash + whisper) ===
    useEffect(() => {
        if (!config.enabled || !config.screenGlitch) return;
        const chance = SCREEN_GLITCH_CHANCE[config.intensity] || 0.005;

        const onClick = () => {
            if (Math.random() > chance) return;
            setFlash(true);
            setTimeout(() => setFlash(false), 280);
            // Whisper using WebAudio — short low-pitched click + descending pitch.
            // No external file. Just enough to startle.
            try {
                const Ctx =
                    window.AudioContext ||
                    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                if (!Ctx) return;
                if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
                const ctx = audioCtxRef.current;
                if (ctx.state === "suspended") ctx.resume().catch(() => {});
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(180, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.25);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc.connect(gain).connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.27);
            } catch {
                /* ignore audio errors */
            }
        };

        window.addEventListener("click", onClick, { passive: true });
        return () => window.removeEventListener("click", onClick);
    }, [config.enabled, config.screenGlitch, config.intensity]);

    if (!config.enabled) return null;

    return (
        <>
            {/* Red-tint flash overlay */}
            {flash && (
                <div
                    className="fixed inset-0 z-[9999] pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle at 50% 50%, rgba(139,0,0,0.55) 0%, rgba(0,0,0,0.85) 90%)",
                        animation: "prankFlash 280ms ease-out forwards",
                    }}
                >
                    {/* Eyes peeking from black */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[280px] leading-none opacity-90 select-none">👁👁</div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes prankFlash {
                    0% { opacity: 0; }
                    20% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </>
    );
}
