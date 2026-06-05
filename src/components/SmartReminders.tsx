"use client";

import { useMemo } from "react";
import { AlertCircle, Bell, Calendar, Crown, Lock, MessageSquare, Star, Vote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WeekSession } from "@/lib/services";

type Severity = "high" | "medium" | "low";

interface ReminderItem {
    id: string;
    severity: Severity;
    icon: LucideIcon;
    title: string;
    body: string;
}

interface SmartRemindersProps {
    userName: string;
    currentWeek: WeekSession | null;
    pastWeek: WeekSession | null;
    hasRatedCurrentWeek: boolean;
    hasRatedPastWeek: boolean;
    hasRatedBathroomCurrentWeek: boolean;
    hasRatedBathroomPastWeek: boolean;
}

const ARABIC_DAYS: Record<number, "السبت" | "الأحد" | "الإثنين" | "الثلاثاء" | "الأربعاء" | "الخميس" | "الجمعة"> = {
    0: "الأحد",
    1: "الإثنين",
    2: "الثلاثاء",
    3: "الأربعاء",
    4: "الخميس",
    5: "الجمعة",
    6: "السبت",
};

const SEVERITY_STYLES: Record<Severity, { container: string; icon: string; title: string }> = {
    high: {
        container: "bg-red-500/10 border-red-500/30",
        icon: "text-red-400 bg-red-500/20",
        title: "text-red-200",
    },
    medium: {
        container: "bg-amber-500/10 border-amber-500/30",
        icon: "text-amber-400 bg-amber-500/20",
        title: "text-amber-200",
    },
    low: {
        container: "bg-sky-500/10 border-sky-500/30",
        icon: "text-sky-400 bg-sky-500/20",
        title: "text-sky-200",
    },
};

export default function SmartReminders({
    userName,
    currentWeek,
    pastWeek,
    hasRatedCurrentWeek,
    hasRatedPastWeek,
    hasRatedBathroomCurrentWeek,
    hasRatedBathroomPastWeek,
}: SmartRemindersProps) {
    const reminders = useMemo<ReminderItem[]>(() => {
        const items: ReminderItem[] = [];
        if (!userName) return items;

        const todayName = ARABIC_DAYS[new Date().getDay()];

        if (currentWeek) {
            const isKing = currentWeek.king === userName;
            const responded = (currentWeek.responded || []).includes(userName);
            const isAbsent = (currentWeek.absentees || []).includes(userName);
            const dayVotes = (currentWeek.dayVotes || {}) as Record<string, string>;
            const hasVotedDay = Boolean(dayVotes[userName]);

            if (isKing && !currentWeek.day) {
                items.push({
                    id: "king-no-day",
                    severity: "high",
                    icon: Crown,
                    title: "أنت ملك هذا الأسبوع 👑",
                    body: "ما حددت يوم الطلعة بعد. ادخل وقرر الخميس أو الجمعة.",
                });
            }
            if (isKing && !currentWeek.restaurant) {
                items.push({
                    id: "king-no-restaurant",
                    severity: "high",
                    icon: Crown,
                    title: "ينقصك اختيار المطعم 🍽️",
                    body: "بصفتك الملك، حدد المطعم عشان نقدر نتحرك.",
                });
            }

            if (!isKing && !responded) {
                items.push({
                    id: "no-attendance-response",
                    severity: "high",
                    icon: AlertCircle,
                    title: "ما أكدت حضورك بعد ⏳",
                    body: "أكد حضورك أو اعتذارك من بطاقة الأسبوع تحت.",
                });
            }

            if (
                !isKing &&
                responded &&
                !isAbsent &&
                !currentWeek.day &&
                currentWeek.dayVotingEnabled !== false &&
                !hasVotedDay
            ) {
                items.push({
                    id: "day-vote-pending",
                    severity: "medium",
                    icon: Calendar,
                    title: "صوّت على يوم الطلعة 🗳️",
                    body: "فيه تصويت مفتوح على اليوم. رأيك يفرق.",
                });
            }

            // Restaurant voting reminders
            const restaurantVotes = (currentWeek.restaurantVotes || {}) as Record<string, string>;
            const hasVotedRestaurant = Boolean(restaurantVotes[userName]);

            if (
                !isKing &&
                currentWeek.restaurantVotingActive &&
                !hasVotedRestaurant
            ) {
                items.push({
                    id: "restaurant-vote-pending",
                    severity: "high",
                    icon: Vote,
                    title: "صوّت على المطعم! 🗳️",
                    body: "التصويت الديموقراطي مفتوح. اختر مطعمك المفضل.",
                });
            }

            if (
                currentWeek.day &&
                currentWeek.day === todayName &&
                !isAbsent &&
                (responded || isKing)
            ) {
                items.push({
                    id: "today-is-outing",
                    severity: "high",
                    icon: Bell,
                    title: "اليوم يوم الطلعة! 🎉",
                    body: `طلعتكم اليوم${currentWeek.restaurant ? ` في ${currentWeek.restaurant}` : ""}. لا تتأخر.`,
                });
            }

            if (
                currentWeek.ratingEnabled &&
                !hasRatedCurrentWeek &&
                !isKing &&
                !isAbsent &&
                responded
            ) {
                items.push({
                    id: "current-rating-pending",
                    severity: "medium",
                    icon: Star,
                    title: "تقييم هذا الأسبوع متاح ⭐",
                    body: "ما قيّمت بعد. التقييم سري وأقل من دقيقة.",
                });
            }

            if (
                currentWeek.ratingEnabled &&
                !hasRatedBathroomCurrentWeek &&
                !isKing &&
                !isAbsent &&
                responded
            ) {
                items.push({
                    id: "current-bathroom-pending",
                    severity: "low",
                    icon: Star,
                    title: "تقييم الحمام متاح 🚻",
                    body: "ساهم في تقييم الحمام لهذا الأسبوع.",
                });
            }
        } else {
            items.push({
                id: "no-active-week",
                severity: "low",
                icon: Lock,
                title: "ما فيه أسبوع نشط حاليًا",
                body: "ننتظر العميد يبدأ الدورة الجديدة.",
            });
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
                items.push({
                    id: "past-rating-pending",
                    severity: "medium",
                    icon: MessageSquare,
                    title: "ما قيّمت طلعة الأسبوع الماضي 📝",
                    body: "تقييمك مهم — يساعد في ذكاء اختيار المطاعم.",
                });
            }

            if (
                pastWeek.ratingEnabled &&
                !hasRatedBathroomPastWeek &&
                !isKingPast &&
                !isAbsentPast &&
                respondedPast
            ) {
                items.push({
                    id: "past-bathroom-pending",
                    severity: "low",
                    icon: MessageSquare,
                    title: "تقييم حمام الأسبوع الماضي متاح",
                    body: "خذ ثانيتين وقيّم الحمام.",
                });
            }
        }

        const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
        items.sort((a, b) => order[a.severity] - order[b.severity]);
        return items.slice(0, 3);
    }, [
        userName,
        currentWeek,
        pastWeek,
        hasRatedCurrentWeek,
        hasRatedPastWeek,
        hasRatedBathroomCurrentWeek,
        hasRatedBathroomPastWeek,
    ]);

    if (reminders.length === 0) return null;

    return (
        <div className="space-y-2">
            {reminders.map((reminder) => {
                const styles = SEVERITY_STYLES[reminder.severity];
                const Icon = reminder.icon;
                return (
                    <div
                        key={reminder.id}
                        className={`flex items-start gap-3 p-3 rounded-2xl border ${styles.container}`}
                    >
                        <div className={`p-2 rounded-xl ${styles.icon} flex-shrink-0`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${styles.title}`}>{reminder.title}</p>
                            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                                {reminder.body}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
