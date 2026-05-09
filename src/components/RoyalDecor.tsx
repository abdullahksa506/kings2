"use client";

import { ReactNode } from "react";

/**
 * Reusable royal visual primitives:
 * - Ornamental SVG dividers and corner ornaments
 * - Double-bordered gold frame wrapper for "important" cards
 * - Throne podium top placement helper
 */

interface OrnamentalDividerProps {
    accentClass?: string;
    centerLabel?: string;
}

export function OrnamentalDivider({
    accentClass = "text-amber-400/70",
    centerLabel,
}: OrnamentalDividerProps) {
    return (
        <div className={`flex items-center gap-3 ${accentClass}`} aria-hidden="true">
            <span className="flex-1 h-px bg-gradient-to-l from-current to-transparent opacity-60" />
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M12 3 L15 9 L21 12 L15 15 L12 21 L9 15 L3 12 L9 9 Z" />
            </svg>
            {centerLabel ? (
                <span className="text-xs font-semibold">
                    {centerLabel}
                </span>
            ) : null}
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M12 3 L15 9 L21 12 L15 15 L12 21 L9 15 L3 12 L9 9 Z" />
            </svg>
            <span className="flex-1 h-px bg-gradient-to-r from-current to-transparent opacity-60" />
        </div>
    );
}

interface RoyalCornerOrnamentsProps {
    color?: string;
    size?: number;
    opacity?: number;
}

export function RoyalCornerOrnaments({
    color = "#f59e0b",
    size = 36,
    opacity = 0.85,
}: RoyalCornerOrnamentsProps) {
    const Curl = (
        <svg
            viewBox="0 0 40 40"
            width={size}
            height={size}
            fill="none"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
            style={{ opacity }}
        >
            <path d="M2 12 Q2 2 12 2 L20 2" />
            <path d="M6 14 Q6 6 14 6" />
            <circle cx="14" cy="6" r="1.4" fill={color} stroke="none" />
        </svg>
    );

    return (
        <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-2 right-2 transform">
                {Curl}
            </div>
            <div className="absolute top-2 left-2 transform scale-x-[-1]">
                {Curl}
            </div>
            <div className="absolute bottom-2 right-2 transform scale-y-[-1]">
                {Curl}
            </div>
            <div className="absolute bottom-2 left-2 transform scale-x-[-1] scale-y-[-1]">
                {Curl}
            </div>
        </div>
    );
}

interface RoyalGoldFrameProps {
    children: ReactNode;
    className?: string;
    showCorners?: boolean;
    cornerColor?: string;
}

export function RoyalGoldFrame({
    children,
    className = "",
    showCorners = true,
    cornerColor,
}: RoyalGoldFrameProps) {
    return (
        <div className={`relative ${className}`}>
            {/* Outer gold gradient halo */}
            <div className="pointer-events-none absolute -inset-px rounded-[inherit] bg-[linear-gradient(135deg,rgba(251,191,36,0.55),rgba(120,53,15,0.15)_45%,rgba(251,191,36,0.55))] opacity-60" />
            {/* Inner subtle border */}
            <div className="pointer-events-none absolute inset-[2px] rounded-[inherit] border border-amber-400/15" />
            {showCorners && <RoyalCornerOrnaments color={cornerColor} />}
            <div className="relative">{children}</div>
        </div>
    );
}

interface CrownBadgeProps {
    label: string;
    className?: string;
}

export function CrownBadge({ label, className = "" }: CrownBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/30 via-amber-400/30 to-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-semibold shadow-[0_0_15px_rgba(245,158,11,0.25)] ${className}`}
        >
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                <path d="M12 2 L15 8 L21 7 L19 13 L21 18 L15 17 L12 22 L9 17 L3 18 L5 13 L3 7 L9 8 Z" />
            </svg>
            {label}
        </span>
    );
}
