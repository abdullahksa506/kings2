"use client";

import { useEffect, useRef } from "react";

interface UseTabSwipeOptions {
    /** Ordered list of tab ids; left-to-right in array represents the natural "next" direction. */
    tabs: string[];
    activeTab: string;
    onChange: (next: string) => void;
    /** Minimum horizontal travel (px) for it to count as a swipe. */
    minDistance?: number;
    /** Maximum vertical wobble (px) — anything above this is treated as a vertical scroll. */
    maxVertical?: number;
    /** Minimum velocity (px/ms) to count as a flick. */
    minVelocity?: number;
}

/**
 * Lightweight horizontal swipe navigation between tabs. Attaches passive
 * touch listeners to the document body. Skips when the gesture starts
 * inside an element with the `data-no-swipe` attribute (e.g., bottom
 * sheets, charts, scrollable rows).
 */
export function useTabSwipe({
    tabs,
    activeTab,
    onChange,
    minDistance = 70,
    maxVertical = 60,
    minVelocity = 0.35,
}: UseTabSwipeOptions) {
    const stateRef = useRef<{
        startX: number;
        startY: number;
        startTime: number;
        valid: boolean;
    } | null>(null);

    useEffect(() => {
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest("[data-no-swipe]")) {
                stateRef.current = null;
                return;
            }
            // Skip if touch starts on horizontally scrollable elements
            if (target?.closest("input,textarea,select,[role='dialog']")) {
                stateRef.current = null;
                return;
            }
            const t = e.touches[0];
            stateRef.current = {
                startX: t.clientX,
                startY: t.clientY,
                startTime: Date.now(),
                valid: true,
            };
        };

        const onTouchEnd = (e: TouchEvent) => {
            const state = stateRef.current;
            stateRef.current = null;
            if (!state || !state.valid) return;
            const t = e.changedTouches[0];
            if (!t) return;

            const dx = t.clientX - state.startX;
            const dy = Math.abs(t.clientY - state.startY);
            const dt = Math.max(1, Date.now() - state.startTime);
            const velocity = Math.abs(dx) / dt;

            if (dy > maxVertical) return;
            if (Math.abs(dx) < minDistance && velocity < minVelocity) return;

            const idx = tabs.indexOf(activeTab);
            if (idx === -1) return;

            // RTL: swipe right (positive dx) → previous tab; swipe left → next tab.
            // In Arabic UI both directions feel natural when tabs visually go right→left.
            const direction = dx < 0 ? +1 : -1;
            const nextIdx = idx + direction;
            if (nextIdx < 0 || nextIdx >= tabs.length) return;

            onChange(tabs[nextIdx]);
        };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchend", onTouchEnd);
        };
    }, [tabs, activeTab, onChange, minDistance, maxVertical, minVelocity]);
}
