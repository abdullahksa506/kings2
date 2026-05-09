"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Calendar, Star, AlertCircle, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WeekSession } from "@/lib/services";

interface ContextualFABProps {
    userName: string;
    activeTab: string;
    currentWeek: WeekSession | null;
    pastWeek: WeekSession | null;
    hasRatedCurrentWeek: boolean;
    hasRatedPastWeek: boolean;
    onConfirmAttendance: () => void;
    /** Switch tab; used for actions that live in another tab (e.g., bathroom rating). */
    onNavigate: (tab: string) => void;
}

interface FABAction {
    id: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    color: string;
}

export default function ContextualFAB({
    userName,
    activeTab,
    currentWeek,
    pastWeek,
    hasRatedCurrentWeek,
    hasRatedPastWeek,
    onConfirmAttendance,
    onNavigate,
}: ContextualFABProps) {
    const action = useMemo<FABAction | null>(() => {
        if (!userName) return null;
        if (activeTab !== "week") return null;

        if (currentWeek) {
            const isKing = currentWeek.king === userName;
            const responded = (currentWeek.responded || []).includes(userName);
            const isAbsent = (currentWeek.absentees || []).includes(userName);

            // King hasn't decided yet → highlight decision
            if (isKing && (!currentWeek.day || !currentWeek.restaurant)) {
                return {
                    id: "king-decide",
                    label: "حدد قراراتك",
                    icon: Crown,
                    color: "from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/30",
                    onClick: () => {
                        scrollToId("king-decisions");
                    },
                };
            }

            // Member hasn't responded → quickest action: confirm attendance
            if (!isKing && !responded) {
                return {
                    id: "confirm-attendance",
                    label: "أكد حضورك",
                    icon: AlertCircle,
                    color: "from-red-500 to-red-400 text-white shadow-red-500/30",
                    onClick: onConfirmAttendance,
                };
            }

            // Today is the outing day → notify
            const today = arabicDayName(new Date());
            if (
                currentWeek.day === today &&
                !isAbsent &&
                (responded || isKing)
            ) {
                return {
                    id: "outing-today",
                    label: "اليوم يوم الطلعة!",
                    icon: Bell,
                    color: "from-emerald-500 to-emerald-400 text-slate-950 shadow-emerald-500/30",
                    onClick: () => {
                        scrollToId("week-card-top");
                    },
                };
            }

            // Rating available, not rated → push to rate
            if (
                currentWeek.ratingEnabled &&
                !hasRatedCurrentWeek &&
                !isKing &&
                !isAbsent &&
                responded
            ) {
                return {
                    id: "rate-current",
                    label: "قيّم الطلعة",
                    icon: Star,
                    color: "from-violet-500 to-violet-400 text-white shadow-violet-500/30",
                    onClick: () => {
                        scrollToId("rating-form");
                    },
                };
            }
        }

        if (pastWeek) {
            const isKingPast = pastWeek.king === userName;
            const isAbsentPast = (pastWeek.absentees || []).includes(userName);
            const respondedPast = (pastWeek.responded || []).includes(userName);
            if (
                pastWeek.ratingEnabled &&
                !hasRatedPastWeek &&
                !isKingPast &&
                !isAbsentPast &&
                respondedPast
            ) {
                return {
                    id: "rate-past",
                    label: "قيّم الأسبوع الماضي",
                    icon: Star,
                    color: "from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/30",
                    onClick: () => scrollToId("rating-form"),
                };
            }
        }

        return null;
    }, [
        userName,
        activeTab,
        currentWeek,
        pastWeek,
        hasRatedCurrentWeek,
        hasRatedPastWeek,
        onConfirmAttendance,
        onNavigate,
    ]);

    return (
        <AnimatePresence>
            {action && (
                <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 30, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.85 }}
                    transition={{ type: "spring", damping: 22, stiffness: 280 }}
                    onClick={action.onClick}
                    className={`fixed left-1/2 -translate-x-1/2 bottom-20 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full font-bold bg-gradient-to-r shadow-2xl active:scale-95 transition-transform ${action.color}`}
                    style={{ paddingInlineStart: "1.25rem", paddingInlineEnd: "1.25rem" }}
                >
                    <action.icon className="w-5 h-5" />
                    <span className="text-sm">{action.label}</span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}

const ARABIC_DAYS: Record<number, string> = {
    0: "الأحد",
    1: "الإثنين",
    2: "الثلاثاء",
    3: "الأربعاء",
    4: "الخميس",
    5: "الجمعة",
    6: "السبت",
};

function arabicDayName(date: Date): string {
    return ARABIC_DAYS[date.getDay()];
}

function scrollToId(id: string) {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
}
