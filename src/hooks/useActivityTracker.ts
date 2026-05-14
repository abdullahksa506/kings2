"use client";

import { useEffect, useRef } from "react";
import { invokeRpc } from "@/lib/services";

type TabId = "week" | "leaderboard" | "bathroom" | "more";

/**
 * Tracks how long the logged-in member keeps the app open and which tab
 * they spend the most time on. Friend-suggested feature (هشام).
 *
 * Approach:
 * - A 1s ticker accumulates time into the *current* tab's bucket, but only
 *   while the tab is visible (document.visibilityState === "visible").
 * - Buckets are flushed to the server every FLUSH_INTERVAL, and immediately
 *   on visibilitychange→hidden / pagehide so we don't lose the tail.
 * - Each flush is a tiny RPC: { tab, seconds }. The server increments
 *   per-month, per-tab counters in /userActivity/{userName}.
 */

const TICK_MS = 1000;
const FLUSH_INTERVAL_MS = 60 * 1000;
// Ignore absurd gaps (e.g., laptop sleep) — never attribute more than this
// to a single tick batch.
const MAX_REASONABLE_GAP_MS = 5 * 60 * 1000;

export function useActivityTracker(activeTab: TabId, userName: string | undefined) {
    // Pending (un-flushed) seconds per tab.
    const bucketsRef = useRef<Record<TabId, number>>({
        week: 0,
        leaderboard: 0,
        bathroom: 0,
        more: 0,
    });
    const activeTabRef = useRef<TabId>(activeTab);
    const lastTickRef = useRef<number>(Date.now());

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    useEffect(() => {
        if (!userName) return;

        const flush = async () => {
            const buckets = bucketsRef.current;
            const entries = (Object.keys(buckets) as TabId[])
                .map((tab) => ({ tab, seconds: Math.round(buckets[tab]) }))
                .filter((e) => e.seconds > 0);

            if (entries.length === 0) return;

            // Reset immediately so concurrent ticks accumulate fresh time.
            bucketsRef.current = { week: 0, leaderboard: 0, bathroom: 0, more: 0 };

            for (const entry of entries) {
                try {
                    await invokeRpc("recordActivity", entry);
                } catch (e) {
                    // On failure, put the time back so it isn't lost.
                    bucketsRef.current[entry.tab] += entry.seconds;
                    console.warn("recordActivity flush failed:", e);
                }
            }
        };

        const tick = () => {
            const now = Date.now();
            const elapsed = now - lastTickRef.current;
            lastTickRef.current = now;

            if (
                document.visibilityState === "visible" &&
                elapsed > 0 &&
                elapsed < MAX_REASONABLE_GAP_MS
            ) {
                bucketsRef.current[activeTabRef.current] += elapsed / 1000;
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                tick(); // capture the tail
                void flush();
            } else {
                // Reset the clock so the hidden gap isn't counted.
                lastTickRef.current = Date.now();
            }
        };

        const onPageHide = () => {
            tick();
            void flush();
        };

        lastTickRef.current = Date.now();
        const tickInterval = window.setInterval(tick, TICK_MS);
        const flushInterval = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("pagehide", onPageHide);

        return () => {
            window.clearInterval(tickInterval);
            window.clearInterval(flushInterval);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("pagehide", onPageHide);
            // Best-effort final flush on unmount.
            tick();
            void flush();
        };
    }, [userName]);
}
