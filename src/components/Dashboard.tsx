"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش الكوميك ثيم كان غامق ومافيه ظلال؟"
 * قال: "كنت أحاول أكون ساحر، طلعت بومة 🦉💀"
 * الحين الخلفية سما زرقا، الكاردات بيضا، والظلال سوداء واضحة 💥📚
 */

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { services, WeekSession, VALID_NAMES, invokeRpc, PublicUserProfile } from "@/lib/services";
import { Crown, Calendar, MapPin, CheckCircle, Shield, PlusCircle, AlertTriangle, PlayCircle, Lock, Unlock, RotateCcw, Bell, ScrollText, BookOpen, MessageCircle, Trophy, Ellipsis, Users, KeyRound, LogOut, Palette } from "lucide-react";
import { isBefore, setDay, setHours, setMinutes } from "date-fns";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import RatingForm from "./RatingForm";
const DeanDashboard = dynamic(() => import("./DeanDashboard"), { ssr: false });
const CycleManagerModal = dynamic(() => import("./CycleManagerModal"), { ssr: false });
// Leaderboards — only the "leaderboard" tab uses these.
const Leaderboard = dynamic(() => import("./Leaderboard"), { ssr: false });
const GlobalLeaderboard = dynamic(() => import("./GlobalLeaderboard"), { ssr: false });
const KingsLeaderboard = dynamic(() => import("./KingsLeaderboard"), { ssr: false });
const ConstitutionModal = dynamic(() => import("./ConstitutionModal"), { ssr: false });
// Heavy panels/games — code-split so they only load when first opened.
const HungryKingsArena = dynamic(() => import("./HungryKingsArena"), { ssr: false });
const RoyalDuelArena = dynamic(() => import("./RoyalDuelArena"), { ssr: false });
const CoupArena = dynamic(() => import("./CoupArena"), { ssr: false });
const RestaurantMapPanel = dynamic(() => import("./RestaurantMapPanel"), { ssr: false });
// Bathroom tab + secondary panels — lazy.
const BathroomRatingForm = dynamic(() => import("./BathroomRatingForm"), { ssr: false });
const BathroomRatingsDisplay = dynamic(() => import("./BathroomRatingsDisplay"), { ssr: false });
const BathroomLeaderboard = dynamic(() => import("./BathroomLeaderboard"), { ssr: false });
const SuggestionBox = dynamic(() => import("./SuggestionBox"), { ssr: false });
const ChatBoard = dynamic(() => import("./ChatBoard"), { ssr: false });
const StatisticsPanel = dynamic(() => import("./StatisticsPanel"), { ssr: false });
import SmartReminders from "./SmartReminders";
import RestaurantVotingPanel from "./RestaurantVotingPanel";
import ImpromptuMeetupCard from "./ImpromptuMeetupCard";
const OutingPlannerPanel = dynamic(() => import("./OutingPlannerPanel"), { ssr: false });
const FutureFeaturesVoting = dynamic(() => import("./FutureFeaturesVoting"), { ssr: false });
const BentoWeekView = dynamic(() => import("./BentoWeekView"), { ssr: false });
import { OrnamentalDivider, RoyalGoldFrame, CrownBadge } from "./RoyalDecor";
import { Gamepad2, Bath, UploadCloud, BarChart3, Swords, Sparkles } from "lucide-react";
const RatingsExplorer = dynamic(() => import("./RatingsExplorer"), { ssr: false });
const MemberProfilePanel = dynamic(() => import("./MemberProfilePanel"), { ssr: false });
import Link from "next/link";
import historicalWeeks from "@/data/historicalWeeks.json";
import { Timestamp, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ThemeKey =
    | "royal-amber"
    | "ocean-cyan"
    | "emerald-night"
    | "sunset-fire"
    | "rose-neon"
    | "arctic-ice"
    | "forest-olive"
    | "midnight-indigo"
    | "neon-cyber"
    | "brutalist"
    | "terminal"
    | "luxe-gold"
    | "comic-pop"
    | "aurora"
    | "bento";

const THEME_OPTIONS: {
    id: ThemeKey;
    name: string;
    appBgClass: string;
    headerGradientClass: string;
    headerIconClass: string;
    tabActiveClass: string;
    tabIndicatorClass: string;
    previewA: string;
    previewB: string;
}[] = [
        {
            id: "royal-amber",
            name: "ملكي ذهبي",
            appBgClass: "bg-slate-950",
            headerGradientClass: "from-amber-200 to-amber-500",
            headerIconClass: "text-amber-500",
            tabActiveClass: "text-amber-500",
            tabIndicatorClass: "bg-amber-500",
            previewA: "bg-amber-300",
            previewB: "bg-amber-600",
        },
        {
            id: "ocean-cyan",
            name: "موج سياني",
            appBgClass: "bg-gradient-to-b from-slate-950 via-cyan-950/40 to-slate-950",
            headerGradientClass: "from-cyan-200 to-sky-500",
            headerIconClass: "text-cyan-400",
            tabActiveClass: "text-cyan-400",
            tabIndicatorClass: "bg-cyan-400",
            previewA: "bg-cyan-300",
            previewB: "bg-sky-600",
        },
        {
            id: "emerald-night",
            name: "ليلة زمردية",
            appBgClass: "bg-gradient-to-b from-slate-950 via-emerald-950/35 to-slate-950",
            headerGradientClass: "from-emerald-200 to-emerald-500",
            headerIconClass: "text-emerald-400",
            tabActiveClass: "text-emerald-400",
            tabIndicatorClass: "bg-emerald-400",
            previewA: "bg-emerald-300",
            previewB: "bg-emerald-700",
        },
        {
            id: "sunset-fire",
            name: "غروب ناري",
            appBgClass: "bg-gradient-to-b from-slate-950 via-orange-950/35 to-slate-950",
            headerGradientClass: "from-orange-200 to-red-500",
            headerIconClass: "text-orange-400",
            tabActiveClass: "text-orange-400",
            tabIndicatorClass: "bg-orange-400",
            previewA: "bg-orange-300",
            previewB: "bg-red-600",
        },
        {
            id: "rose-neon",
            name: "وردي نيون",
            appBgClass: "bg-gradient-to-b from-slate-950 via-rose-950/35 to-slate-950",
            headerGradientClass: "from-rose-200 to-pink-500",
            headerIconClass: "text-rose-400",
            tabActiveClass: "text-rose-400",
            tabIndicatorClass: "bg-rose-400",
            previewA: "bg-rose-300",
            previewB: "bg-pink-600",
        },
        {
            id: "arctic-ice",
            name: "جليد قطبي",
            appBgClass: "bg-gradient-to-b from-slate-950 via-blue-950/30 to-slate-950",
            headerGradientClass: "from-blue-100 to-slate-200",
            headerIconClass: "text-blue-300",
            tabActiveClass: "text-blue-300",
            tabIndicatorClass: "bg-blue-300",
            previewA: "bg-blue-200",
            previewB: "bg-slate-300",
        },
        {
            id: "forest-olive",
            name: "غابة زيتونية",
            appBgClass: "bg-gradient-to-b from-slate-950 via-lime-950/25 to-slate-950",
            headerGradientClass: "from-lime-200 to-lime-500",
            headerIconClass: "text-lime-400",
            tabActiveClass: "text-lime-400",
            tabIndicatorClass: "bg-lime-400",
            previewA: "bg-lime-300",
            previewB: "bg-green-700",
        },
        {
            id: "midnight-indigo",
            name: "منتصف الليل",
            appBgClass: "bg-gradient-to-b from-slate-950 via-indigo-950/35 to-slate-950",
            headerGradientClass: "from-indigo-200 to-indigo-500",
            headerIconClass: "text-indigo-400",
            tabActiveClass: "text-indigo-400",
            tabIndicatorClass: "bg-indigo-400",
            previewA: "bg-indigo-300",
            previewB: "bg-indigo-700",
        },
        {
            id: "neon-cyber",
            name: "نيون سايبر ⚡",
            appBgClass: "bg-gradient-to-b from-black via-fuchsia-950/40 to-black",
            headerGradientClass: "from-fuchsia-300 to-cyan-400",
            headerIconClass: "text-fuchsia-400",
            tabActiveClass: "text-fuchsia-400",
            tabIndicatorClass: "bg-fuchsia-400",
            previewA: "bg-fuchsia-400",
            previewB: "bg-cyan-400",
        },
        {
            id: "brutalist",
            name: "بروتالي 🧱",
            appBgClass: "bg-gradient-to-b from-slate-950 via-yellow-950/30 to-slate-950",
            headerGradientClass: "from-yellow-200 to-yellow-400",
            headerIconClass: "text-yellow-400",
            tabActiveClass: "text-yellow-400",
            tabIndicatorClass: "bg-yellow-400",
            previewA: "bg-yellow-300",
            previewB: "bg-black",
        },
        {
            id: "terminal",
            name: "تيرمنال 💻",
            appBgClass: "bg-gradient-to-b from-black via-green-950/40 to-black",
            headerGradientClass: "from-green-200 to-green-500",
            headerIconClass: "text-green-400",
            tabActiveClass: "text-green-400",
            tabIndicatorClass: "bg-green-400",
            previewA: "bg-green-400",
            previewB: "bg-green-700",
        },
        {
            id: "luxe-gold",
            name: "فخامة ذهبية 🥂",
            appBgClass: "bg-gradient-to-b from-neutral-950 via-amber-950/30 to-neutral-950",
            headerGradientClass: "from-amber-100 to-amber-300",
            headerIconClass: "text-amber-300",
            tabActiveClass: "text-amber-300",
            tabIndicatorClass: "bg-amber-300",
            previewA: "bg-amber-200",
            previewB: "bg-neutral-900",
        },
        {
            id: "comic-pop",
            name: "كوميك مرح 💥",
            appBgClass: "bg-sky-200",
            headerGradientClass: "from-pink-600 to-red-600",
            headerIconClass: "text-pink-600",
            tabActiveClass: "text-pink-600",
            tabIndicatorClass: "bg-pink-500",
            previewA: "bg-pink-400",
            previewB: "bg-yellow-300",
        },
        {
            id: "aurora",
            name: "أورورا 🌌",
            appBgClass: "bg-gradient-to-br from-violet-950 via-fuchsia-950/40 to-cyan-950",
            headerGradientClass: "from-violet-200 via-fuchsia-300 to-cyan-300",
            headerIconClass: "text-fuchsia-300",
            tabActiveClass: "text-fuchsia-300",
            tabIndicatorClass: "bg-fuchsia-300",
            previewA: "bg-violet-400",
            previewB: "bg-cyan-300",
        },
        {
            id: "bento",
            name: "بنتو 🍱",
            appBgClass: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
            headerGradientClass: "from-amber-300 via-pink-300 to-cyan-300",
            headerIconClass: "text-amber-300",
            tabActiveClass: "text-amber-300",
            tabIndicatorClass: "bg-gradient-to-r from-amber-400 to-pink-400",
            previewA: "bg-gradient-to-br from-amber-500 to-orange-600",
            previewB: "bg-gradient-to-br from-fuchsia-500 to-purple-600",
        },
    ];

const THEME_STYLE: Record<ThemeKey, {
    atmosphereClass: string;
    accentTextClass: string;
    accentSoftClass: string;
    accentSoftHoverClass: string;
    accentBorderClass: string;
    accentSolidClass: string;
    accentSolidHoverClass: string;
    accentSpinnerClass: string;
}> = {
    "royal-amber": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(245,158,11,0.22),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(251,191,36,0.18),transparent_44%)]",
        accentTextClass: "text-amber-400",
        accentSoftClass: "bg-amber-500/20",
        accentSoftHoverClass: "hover:bg-amber-500/30",
        accentBorderClass: "border-amber-500/35",
        accentSolidClass: "bg-amber-500",
        accentSolidHoverClass: "hover:bg-amber-400",
        accentSpinnerClass: "text-amber-500",
    },
    "ocean-cyan": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.22),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(56,189,248,0.18),transparent_44%)]",
        accentTextClass: "text-cyan-300",
        accentSoftClass: "bg-cyan-500/20",
        accentSoftHoverClass: "hover:bg-cyan-500/30",
        accentBorderClass: "border-cyan-500/35",
        accentSolidClass: "bg-cyan-500",
        accentSolidHoverClass: "hover:bg-cyan-400",
        accentSpinnerClass: "text-cyan-400",
    },
    "emerald-night": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.24),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(5,150,105,0.2),transparent_44%)]",
        accentTextClass: "text-emerald-300",
        accentSoftClass: "bg-emerald-500/20",
        accentSoftHoverClass: "hover:bg-emerald-500/30",
        accentBorderClass: "border-emerald-500/35",
        accentSolidClass: "bg-emerald-500",
        accentSolidHoverClass: "hover:bg-emerald-400",
        accentSpinnerClass: "text-emerald-400",
    },
    "sunset-fire": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.23),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(239,68,68,0.2),transparent_44%)]",
        accentTextClass: "text-orange-300",
        accentSoftClass: "bg-orange-500/20",
        accentSoftHoverClass: "hover:bg-orange-500/30",
        accentBorderClass: "border-orange-500/35",
        accentSolidClass: "bg-orange-500",
        accentSolidHoverClass: "hover:bg-orange-400",
        accentSpinnerClass: "text-orange-400",
    },
    "rose-neon": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(244,63,94,0.24),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(236,72,153,0.2),transparent_44%)]",
        accentTextClass: "text-rose-300",
        accentSoftClass: "bg-rose-500/20",
        accentSoftHoverClass: "hover:bg-rose-500/30",
        accentBorderClass: "border-rose-500/35",
        accentSolidClass: "bg-rose-500",
        accentSolidHoverClass: "hover:bg-rose-400",
        accentSpinnerClass: "text-rose-400",
    },
    "arctic-ice": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(125,211,252,0.22),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(148,163,184,0.2),transparent_44%)]",
        accentTextClass: "text-blue-200",
        accentSoftClass: "bg-blue-400/20",
        accentSoftHoverClass: "hover:bg-blue-400/30",
        accentBorderClass: "border-blue-300/35",
        accentSolidClass: "bg-blue-400",
        accentSolidHoverClass: "hover:bg-blue-300",
        accentSpinnerClass: "text-blue-300",
    },
    "forest-olive": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(132,204,22,0.22),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(34,197,94,0.2),transparent_44%)]",
        accentTextClass: "text-lime-300",
        accentSoftClass: "bg-lime-500/20",
        accentSoftHoverClass: "hover:bg-lime-500/30",
        accentBorderClass: "border-lime-500/35",
        accentSolidClass: "bg-lime-500",
        accentSolidHoverClass: "hover:bg-lime-400",
        accentSpinnerClass: "text-lime-400",
    },
    "midnight-indigo": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.22),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(79,70,229,0.2),transparent_44%)]",
        accentTextClass: "text-indigo-300",
        accentSoftClass: "bg-indigo-500/20",
        accentSoftHoverClass: "hover:bg-indigo-500/30",
        accentBorderClass: "border-indigo-500/35",
        accentSolidClass: "bg-indigo-500",
        accentSolidHoverClass: "hover:bg-indigo-400",
        accentSpinnerClass: "text-indigo-400",
    },
    "neon-cyber": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(217,70,239,0.3),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.28),transparent_44%)]",
        accentTextClass: "text-fuchsia-300",
        accentSoftClass: "bg-fuchsia-500/20",
        accentSoftHoverClass: "hover:bg-fuchsia-500/30",
        accentBorderClass: "border-fuchsia-500/40",
        accentSolidClass: "bg-fuchsia-500",
        accentSolidHoverClass: "hover:bg-fuchsia-400",
        accentSpinnerClass: "text-fuchsia-400",
    },
    "brutalist": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(250,204,21,0.25),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(250,204,21,0.18),transparent_44%)]",
        accentTextClass: "text-yellow-300",
        accentSoftClass: "bg-yellow-400/20",
        accentSoftHoverClass: "hover:bg-yellow-400/30",
        accentBorderClass: "border-yellow-400/40",
        accentSolidClass: "bg-yellow-400",
        accentSolidHoverClass: "hover:bg-yellow-300",
        accentSpinnerClass: "text-yellow-400",
    },
    "terminal": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,0.25),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(22,163,74,0.2),transparent_44%)]",
        accentTextClass: "text-green-400",
        accentSoftClass: "bg-green-500/20",
        accentSoftHoverClass: "hover:bg-green-500/30",
        accentBorderClass: "border-green-500/40",
        accentSolidClass: "bg-green-500",
        accentSolidHoverClass: "hover:bg-green-400",
        accentSpinnerClass: "text-green-400",
    },
    "luxe-gold": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(252,211,77,0.22),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(180,83,9,0.18),transparent_44%)]",
        accentTextClass: "text-amber-300",
        accentSoftClass: "bg-amber-400/15",
        accentSoftHoverClass: "hover:bg-amber-400/25",
        accentBorderClass: "border-amber-400/40",
        accentSolidClass: "bg-amber-400",
        accentSolidHoverClass: "hover:bg-amber-300",
        accentSpinnerClass: "text-amber-300",
    },
    "comic-pop": {
        atmosphereClass: "bg-[radial-gradient(circle_at_15%_15%,rgba(236,72,153,0.18),transparent_38%),radial-gradient(circle_at_85%_80%,rgba(250,204,21,0.20),transparent_38%),radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.10),transparent_30%)]",
        accentTextClass: "text-pink-600",
        accentSoftClass: "bg-pink-200",
        accentSoftHoverClass: "hover:bg-pink-300",
        accentBorderClass: "border-pink-500",
        accentSolidClass: "bg-pink-500",
        accentSolidHoverClass: "hover:bg-pink-400",
        accentSpinnerClass: "text-pink-600",
    },
    "aurora": {
        atmosphereClass: "bg-[radial-gradient(circle_at_20%_10%,rgba(167,139,250,0.28),transparent_46%),radial-gradient(circle_at_85%_80%,rgba(34,211,238,0.24),transparent_44%)]",
        accentTextClass: "text-fuchsia-200",
        accentSoftClass: "bg-fuchsia-500/20",
        accentSoftHoverClass: "hover:bg-fuchsia-500/30",
        accentBorderClass: "border-fuchsia-400/40",
        accentSolidClass: "bg-gradient-to-r from-fuchsia-500 to-cyan-400",
        accentSolidHoverClass: "hover:from-fuchsia-400 hover:to-cyan-300",
        accentSpinnerClass: "text-fuchsia-300",
    },
    "bento": {
        atmosphereClass: "bg-[radial-gradient(circle_at_15%_12%,rgba(245,158,11,0.18),transparent_40%),radial-gradient(circle_at_85%_25%,rgba(217,70,239,0.16),transparent_40%),radial-gradient(circle_at_50%_88%,rgba(34,211,238,0.16),transparent_42%)]",
        accentTextClass: "text-amber-300",
        accentSoftClass: "bg-amber-500/20",
        accentSoftHoverClass: "hover:bg-amber-500/30",
        accentBorderClass: "border-amber-400/40",
        accentSolidClass: "bg-gradient-to-br from-amber-500 to-orange-600",
        accentSolidHoverClass: "hover:from-amber-400 hover:to-orange-500",
        accentSpinnerClass: "text-amber-300",
    },
};

const THEME_META_COLOR: Record<ThemeKey, string> = {
    "royal-amber": "#f59e0b",
    "ocean-cyan": "#06b6d4",
    "emerald-night": "#10b981",
    "sunset-fire": "#f97316",
    "rose-neon": "#f43f5e",
    "arctic-ice": "#60a5fa",
    "forest-olive": "#84cc16",
    "midnight-indigo": "#6366f1",
    "neon-cyber": "#d946ef",
    "brutalist": "#facc15",
    "terminal": "#22c55e",
    "luxe-gold": "#fbbf24",
    "comic-pop": "#ec4899",
    "aurora": "#a78bfa",
    "bento": "#f59e0b",
};

export default function Dashboard() {
    const WEEK_DAYS: Exclude<WeekSession["day"], null>[] = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    const { user, logout, refreshUserProfile } = useAuth();
    const [currentWeek, setCurrentWeek] = useState<WeekSession | null>(null);
    const [pastWeek, setPastWeek] = useState<WeekSession | null>(null);
    const [hasRatedCurrentWeek, setHasRatedCurrentWeek] = useState(false);
    const [hasRatedPastWeek, setHasRatedPastWeek] = useState(false);

    // Bathroom Rating State
    const [hasRatedBathroomCurrentWeek, setHasRatedBathroomCurrentWeek] = useState(false);
    const [hasRatedBathroomPastWeek, setHasRatedBathroomPastWeek] = useState(false);

    const [loading, setLoading] = useState(true);

    // Forms state
    const [selectedDay, setSelectedDay] = useState<Exclude<WeekSession["day"], null>>("الخميس");
    const [deanSelectedDay, setDeanSelectedDay] = useState<Exclude<WeekSession["day"], null>>("الخميس");
    const [restaurant, setRestaurant] = useState("");
    const [restaurantMapsUrl, setRestaurantMapsUrl] = useState("");
    const [isPlannerOpen, setIsPlannerOpen] = useState(false);
    const [tieBreakDay, setTieBreakDay] = useState<"الخميس" | "الجمعة">("الخميس");
    const [saving, setSaving] = useState(false);

    // Change Password State
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [changePasswordError, setChangePasswordError] = useState("");
    const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

    // Profile Customization State
    const [nickNameInput, setNickNameInput] = useState("");
    const [profileImageData, setProfileImageData] = useState<string | null>(null);
    const [showProfileImageInput, setShowProfileImageInput] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");

    // Constitution State
    const [isConstitutionOpen, setIsConstitutionOpen] = useState(false);

    // Mini-game State
    const [isGameOpen, setIsGameOpen] = useState(false);
    const [isDuelOpen, setIsDuelOpen] = useState(false);
    const [isCoupOpen, setIsCoupOpen] = useState(false);

    // Statistics State
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isMemberProfileOpen, setIsMemberProfileOpen] = useState(false);
    const [isCycleManagerOpen, setIsCycleManagerOpen] = useState(false);

    // Tab State
    type TabType = "week" | "leaderboard" | "bathroom" | "map" | "more";
    const [activeTab, setActiveTab] = useState<TabType>("week");
    const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("royal-amber");
    const [bentoFullView, setBentoFullView] = useState(false);
    const [publicProfilesMap, setPublicProfilesMap] = useState<Record<string, PublicUserProfile>>({});

    const fetchPastWeekOnly = async () => {
        const previous = await services.getPreviousWeek();
        if (previous) {
            setPastWeek(previous);
            if (user?.name) {
                const rated = await services.hasUserRated(previous.id, user.name);
                setHasRatedPastWeek(rated);

                const bathroomRated = await services.hasUserRatedBathroom(previous.id, user.name);
                setHasRatedBathroomPastWeek(bathroomRated);
            }
        } else {
            setPastWeek(null);
            setHasRatedPastWeek(false);
            setHasRatedBathroomPastWeek(false);
        }
    };

    const fetchWeek = async () => {
        setLoading(true);
        // We still fetch past week statically
        await fetchPastWeekOnly();

        // But we rely on real-time listener for current week
        // Note: fetchWeek will now be an initial trigger, the real-time listener handles the rest
        const week = await services.getCurrentWeek();
        if (week) {
            setCurrentWeek(week);
            if (week.day) setSelectedDay(week.day);
            if (week.day) setDeanSelectedDay(week.day);
            if (week.restaurant) setRestaurant(week.restaurant);
            if (user?.name) {
                const rated = await services.hasUserRated(week.id, user.name);
                setHasRatedCurrentWeek(rated);

                const bathroomRated = await services.hasUserRatedBathroom(week.id, user.name);
                setHasRatedBathroomCurrentWeek(bathroomRated);
            }
        } else {
            setCurrentWeek(null);
            setHasRatedCurrentWeek(false);
            setHasRatedBathroomCurrentWeek(false);
        }
        setLoading(false);
    };

    const handleManualRefresh = async () => {
        setLoading(true);
        await fetchWeek();
    };

    const { isSupported, isSubscribed, subscribeToPush, playNotificationSound, unlockNotificationSound } = usePushNotifications();
    const [subscribing, setSubscribing] = useState(false);
    const [showNotifDiagnostics, setShowNotifDiagnostics] = useState(false);
    const [notifStatus, setNotifStatus] = useState<string>("");

    useEffect(() => {
        fetchPastWeekOnly();

        // Setup real-time listener for the active week
        const unsubscribe = services.listenToCurrentWeek(async (week) => {
            if (week) {
                setCurrentWeek(week);
                if (week.day) setSelectedDay(week.day);
                if (week.day) setDeanSelectedDay(week.day);
                if (week.restaurant) setRestaurant(week.restaurant);
                if (user?.name) {
                    const rated = await services.hasUserRated(week.id, user.name);
                    setHasRatedCurrentWeek(rated);

                    const bathroomRated = await services.hasUserRatedBathroom(week.id, user.name);
                    setHasRatedBathroomCurrentWeek(bathroomRated);
                }
            } else {
                setCurrentWeek(null);
                setHasRatedCurrentWeek(false);
                setHasRatedBathroomCurrentWeek(false);
            }
            setLoading(false);
        });

        // Cleanup on unmount
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        setNickNameInput(user.nickName || user.name);
        setProfileImageData(user.profileImage || null);
        setShowProfileImageInput(typeof user.showProfileImage === "boolean" ? user.showProfileImage : true);
    }, [user?.name, user?.nickName, user?.profileImage, user?.showProfileImage]);

    useEffect(() => {
        const storedTheme = localStorage.getItem("king_theme") as ThemeKey | null;
        if (!storedTheme) return;
        if (THEME_OPTIONS.some((theme) => theme.id === storedTheme)) {
            setSelectedTheme(storedTheme);
        }
    }, []);

    useEffect(() => {
        const unsub = services.listenToPublicUserProfiles((profiles) => {
            const nextMap: Record<string, PublicUserProfile> = {};
            profiles.forEach((p) => {
                nextMap[p.userName] = p;
            });
            setPublicProfilesMap(nextMap);
        });

        return () => unsub();
    }, []);

    // Detect and log if user is using the standalone PWA 
    useEffect(() => {
        if (!user) return;

        const checkStandalone = async () => {
            // Broader detection for iOS and Android
            const isMatchMedia = window.matchMedia('(display-mode: standalone)').matches;
            const isNavigatorStandalone = (window.navigator as any).standalone === true;
            // Sometimes iOS PWA opens with no referrer or specific state
            const isIOSPWA = window.navigator.userAgent.match(/(iPad|iPhone|iPod)/) && isNavigatorStandalone;

            const isStandalone = Boolean(isMatchMedia || isNavigatorStandalone || isIOSPWA);

            try {
                await services.updateUserStandaloneStatus(user.name, isStandalone);
            } catch (e) {
                console.error("Failed to update standalone status", e);
            }
        };

        checkStandalone();

        // Record site visit
        services.recordVisit().catch(e => console.error("Failed to record visit:", e));
    }, [user]);

    const handleSubscribe = async () => {
        setSubscribing(true);
        setNotifStatus("🔄 جاري محاولة تفعيل الإشعارات...");
        setShowNotifDiagnostics(true);

        try {
            // Check permission
            const currentPermission = Notification.permission;
            if (currentPermission === "denied") {
                setNotifStatus("❌ الإذن مرفوض في المتصفح!\n\nالحل:\n1. اضغط على القفل في شريط العنوان\n2. اسمح بـ Notifications\n3. أعد تحميل الصفحة");
                setSubscribing(false);
                return;
            }

            const sub = await subscribeToPush();
            if (sub && user) {
                await services.updatePushSubscription(user.name, sub);
                setNotifStatus("✅ تم تفعيل الإشعارات بنجاح!\n\nالاشتراك محفوظ بشكل دائم في المتصفح");
            } else {
                setNotifStatus("❌ فشل تفعيل الإشعارات\n\nالأسباب المحتملة:\n• الإذن مرفوض\n• مشكلة في Service Worker\n• مشكلة في VAPID Key");
            }
        } catch (error: any) {
            setNotifStatus(`❌ خطأ: ${error.message}`);
        }

        setSubscribing(false);
    };

    const handleTestNotificationSound = async () => {
        await unlockNotificationSound();
        const played = await playNotificationSound();
        if (!played) {
            alert("تعذر تشغيل الصوت. تأكد من إعدادات الصوت/الصلاحيات ووجود الملف public/notification-voice.mp3");
        }
    };

    const resizeImageToDataUrl = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const maxSize = 320;
                    const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
                    const targetW = Math.round(img.width * ratio);
                    const targetH = Math.round(img.height * ratio);

                    const canvas = document.createElement("canvas");
                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                        reject(new Error("تعذر معالجة الصورة"));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, targetW, targetH);

                    const jpeg = canvas.toDataURL("image/jpeg", 0.85);
                    resolve(jpeg);
                };
                img.onerror = () => reject(new Error("تعذر قراءة الصورة"));
                img.src = reader.result as string;
            };
            reader.onerror = () => reject(new Error("تعذر فتح الملف"));
            reader.readAsDataURL(file);
        });
    };

    const handleProfileImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setProfileError("الملف يجب أن يكون صورة");
            return;
        }
        try {
            const dataUrl = await resizeImageToDataUrl(file);
            setProfileImageData(dataUrl);
            setProfileError("");
            setProfileSuccess("");
        } catch (e: any) {
            setProfileError(e.message || "تعذر تجهيز الصورة");
        }
    };

    const handleSaveProfileCustomization = async () => {
        if (!user?.name) return;
        setProfileError("");
        setProfileSuccess("");
        const trimmedNick = nickNameInput.trim();
        if (trimmedNick.length < 2 || trimmedNick.length > 24) {
            setProfileError("الاسم المستعار لازم يكون بين 2 و 24 حرف");
            return;
        }

        setProfileSaving(true);
        try {
            await services.updateProfileCustomization(user.name, trimmedNick, profileImageData, showProfileImageInput);
            await refreshUserProfile();
            setProfileSuccess("تم حفظ الملف الشخصي بنجاح");
        } catch (e: any) {
            setProfileError(e.message || "حدث خطأ أثناء حفظ الملف الشخصي");
        } finally {
            setProfileSaving(false);
        }
    };

    const handleSetChoices = async () => {
        if (!currentWeek || !user) return;
        setSaving(true);
        try {
            await services.setWeekChoices(currentWeek.id, selectedDay, restaurant, null);

            // Notify members (Web Push)
            try {
                await fetch("/api/reminders/decision", {
                    method: "POST",
                    headers: getReminderAuthHeaders(),
                    body: JSON.stringify({ weekId: currentWeek.id })
                });
            } catch (e) {
                console.error("Failed to notify members about the decision:", e);
            }

            await fetchWeek();
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء الحفظ");
        } finally {
            setSaving(false);
        }
    };

    const getReminderAuthHeaders = (): Record<string, string> => {
        const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
        const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
        return {
            "Content-Type": "application/json",
            "x-user-name": encodeURIComponent(name),
            "x-user-token": token,
        };
    };

    const handleToggleDayVoting = async (enabled: boolean) => {
        if (!currentWeek) return;
        setSaving(true);
        try {
            await services.toggleDayVoting(currentWeek.id, enabled, !enabled ? false : true);
            await fetchWeek();
        } catch (e: any) {
            alert(e.message || "تعذر تحديث وضع التصويت على اليوم");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitDayVote = async (day: "الخميس" | "الجمعة" | "الخميس والجمعة") => {
        if (!currentWeek || !user?.name) return;
        setSaving(true);
        try {
            await services.submitDayVote(currentWeek.id, user.name, day);
            await fetchWeek();
        } catch (e: any) {
            alert(e.message || "تعذر إرسال التصويت");
        } finally {
            setSaving(false);
        }
    };

    const handleApplyDayVoteResult = async () => {
        if (!currentWeek) return;
        setSaving(true);
        try {
            await services.applyDayVoteResult(currentWeek.id, tieBreakDay);
            await fetchWeek();
        } catch (e: any) {
            alert(e.message || "تعذر اعتماد نتيجة التصويت");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangePasswordError("");
        setChangePasswordSuccess("");
        if (!user) return;
        setChangePasswordLoading(true);

        try {
            await services.changePassword(user.name, currentPassword, newPassword);
            setChangePasswordSuccess("تم تغيير كلمة المرور بنجاح");
            setTimeout(() => {
                setIsChangePasswordOpen(false);
                setCurrentPassword("");
                setNewPassword("");
                setChangePasswordSuccess("");
            }, 2000);
        } catch (e: any) {
            setChangePasswordError(e.message || "حدث خطأ ما");
        } finally {
            setChangePasswordLoading(false);
        }
    };

    const handleStartNewWeek = async () => {
        setSaving(true);
        try {
            if (currentWeek) {
                // Complete the current one first
                await services.completeWeek(currentWeek.id);
            }

            // Determine the next king in the sequence
            let nextKing = VALID_NAMES[0];
            let isRandom = false;
            let nextCycleNumber = currentWeek ? currentWeek.cycleNumber : 1;
            let nextWeekNumber = currentWeek ? currentWeek.weekNumber + 1 : 1;

            if (currentWeek && !currentWeek.isRandom) {
                const currentIndex = VALID_NAMES.indexOf(currentWeek.king || "");
                if (currentIndex === VALID_NAMES.length - 1) {
                    // After the 6th person, the 7th week is random
                    nextKing = "أسبوع عشوائي";
                    isRandom = true;
                } else if (currentIndex !== -1) {
                    nextKing = VALID_NAMES[currentIndex + 1];
                }
            } else if (currentWeek && currentWeek.isRandom) {
                // After random week, start new cycle
                nextKing = VALID_NAMES[0];
                nextCycleNumber++;
            }

            // Note: Not selecting "أسبوع عشوائي" as actual king name in DB if random, set to null
            const finalKingName = isRandom ? null : nextKing;

            await services.startNewWeek(finalKingName, isRandom, nextCycleNumber, nextWeekNumber);
            await fetchWeek();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const isKing = currentWeek?.king === user?.name;
    const isDean = user?.role === "dean";
    const isHesham = user?.name === "هشام";
    const bathroomWeekForRating = currentWeek || pastWeek;
    const dayVotingEnabled = Boolean(currentWeek && !currentWeek.day);
    const dayVotes = (currentWeek?.dayVotes || {}) as Record<string, "الخميس" | "الجمعة" | "الخميس والجمعة">;
    const eligibleDayVoters = currentWeek
        ? VALID_NAMES.filter((name) =>
            name !== currentWeek.king &&
            (currentWeek.responded || []).includes(name) &&
            !(currentWeek.absentees || []).includes(name)
        )
        : [];
    const voteThursdayCount = eligibleDayVoters.filter((name) => dayVotes[name] === "الخميس" || dayVotes[name] === "الخميس والجمعة").length;
    const voteFridayCount = eligibleDayVoters.filter((name) => dayVotes[name] === "الجمعة" || dayVotes[name] === "الخميس والجمعة").length;
    const registeredDayVotesCount = eligibleDayVoters.filter((name) => Boolean(dayVotes[name])).length;
    const canUserVoteDay = Boolean(
        currentWeek && user?.name &&
        user.name !== currentWeek.king &&
        (currentWeek.responded || []).includes(user.name) &&
        !(currentWeek.absentees || []).includes(user.name)
    );
    const myDayVote = user?.name ? dayVotes[user.name] : undefined;

    const handleAttendanceChoice = async (isAbsent: boolean) => {
        if (!currentWeek || !user?.name) return;
        setSaving(true);
        try {
            const justCompleted = await services.toggleAttendance(currentWeek.id, user.name, isAbsent);

            if (justCompleted) {
                try {
                    await fetch("/api/reminders/attendance-complete", {
                        method: "POST",
                        headers: getReminderAuthHeaders(),
                        body: JSON.stringify({ weekId: currentWeek.id })
                    });
                } catch (e) {
                    console.error("Failed to notify members:", e);
                }
            }

            await fetchWeek();
        } catch (e: any) {
            console.error("Toggle attendance error:", e);
            alert(e.message || "حدث خطأ أثناء تحديث الحضور");
        } finally {
            setSaving(false);
        }
    };

    const handleSecretImport = async () => {
        if (!confirm("تأكيد استيراد البيانات التاريخية وتحديث السجل؟ سيتم حذف أي استيراد سابق لمنع التكرار.")) return;
        setLoading(true);
        try {
            const weeksToImport = historicalWeeks.filter(w => w.weekNumber <= 7);
            const added = await invokeRpc("importHistory", { weeksToImport });
            alert(`تم تنظيف السجل وإضافة ${added} أسابيع للسجل الشامل بنجاح! حدث الصفحة.`);
        } catch (e: any) {
            alert("خطأ: " + e.message);
        }
        setLoading(false);
    };

    const displayName = user?.nickName?.trim() || user?.name;
    const activeTheme = THEME_OPTIONS.find((theme) => theme.id === selectedTheme) || THEME_OPTIONS[0];
    const activeThemeStyle = THEME_STYLE[selectedTheme];

    const applyThemeMetaColor = (themeId: ThemeKey) => {
        if (typeof document === "undefined") return;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        meta.setAttribute("content", THEME_META_COLOR[themeId]);
    };

    const handleThemeChange = (themeId: ThemeKey) => {
        setSelectedTheme(themeId);
        localStorage.setItem("king_theme", themeId);
        applyThemeMetaColor(themeId);
    };

    useEffect(() => {
        applyThemeMetaColor(selectedTheme);
    }, [selectedTheme]);

    const renderMemberChip = (name: string, statusIcon: string, mode: "present" | "waiting" | "absent") => {
        const profile = publicProfilesMap[name];
        const avatar = profile?.profileImage || null;
        const nick = typeof profile?.nickName === "string" ? profile.nickName.trim() : "";
        const display = nick || name;
        const hasAlias = display !== name;
        const initial = display.charAt(0) || "؟";

        const tone = mode === "present"
            ? "bg-emerald-400/20 border-emerald-300/30 text-emerald-100"
            : mode === "absent"
                ? "bg-red-400/20 border-red-300/30 text-red-100"
                : "bg-slate-700/80 border-slate-500 text-slate-100";

        return (
            <span key={`${mode}-${name}`} className={`px-4 py-2.5 border text-sm rounded-xl flex items-center gap-3 min-h-14 ${tone}`}>
                <span className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-200 shrink-0">
                    {avatar ? (
                        <img src={avatar} alt={display} className="w-full h-full object-cover" />
                    ) : (
                        <span>{initial}</span>
                    )}
                </span>
                <span className="leading-tight">
                    <span className="block font-semibold text-sm">{display}</span>
                    {hasAlias && <span className="block text-[11px] font-semibold text-slate-600">{name}</span>}
                </span>
                <span>{statusIcon}</span>
            </span>
        );
    };

    return (
        <div data-theme={selectedTheme} className={`min-h-screen ${activeTheme.appBgClass} p-4 md:p-8 font-sans relative`}>
            <div className={`pointer-events-none absolute inset-0 ${activeThemeStyle.atmosphereClass}`} />
            {/* Version Badge & Secret Import */}
            <div className="fixed top-2 left-2 z-50 flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-mono select-none">v13</span>
                {user?.role === "dean" && (
                    <button onClick={handleSecretImport} className={`text-slate-700 ${activeThemeStyle.accentTextClass} transition-colors`} title="استيراد البيانات السابقة">
                        <UploadCloud className="w-3 h-3" />
                    </button>
                )}
            </div>
            <header className="flex justify-between items-center mb-10 pb-6 border-b border-slate-800">
                <div>
                    <h1 className={`text-3xl font-bold bg-gradient-to-r ${activeTheme.headerGradientClass} bg-clip-text text-transparent flex items-center gap-3`}>
                        <Crown className={`w-8 h-8 ${activeTheme.headerIconClass}`} />
                        عرش الخميس
                    </h1>
                    <p className="text-slate-400 mt-2">أهلاً بك، {displayName}</p>
                </div>
                <div className="flex gap-2 text-xs md:text-sm">
                    {isSupported && !isSubscribed && (
                        <button
                            onClick={handleSubscribe}
                            disabled={subscribing}
                            className="bg-emerald-900/30 border border-emerald-500/30 hover:bg-emerald-800/40 py-2 md:py-3 px-3 md:px-4 rounded-xl transition-all shadow-md text-emerald-400 flex items-center gap-2"
                        >
                            <Bell className="w-4 h-4" />
                            <span className="hidden md:inline">{subscribing ? "جاري التفعيل..." : "تفعيل الإشعارات"}</span>
                        </button>
                    )}
                    {showNotifDiagnostics && notifStatus && (
                        <div className="fixed top-20 right-4 bg-slate-900 border-2 border-amber-500/50 rounded-xl p-4 max-w-xs shadow-lg z-50">
                            <p className="text-sm whitespace-pre-line text-slate-200">{notifStatus}</p>
                            <button
                                onClick={() => setShowNotifDiagnostics(false)}
                                className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 px-2 rounded text-xs"
                            >
                                إغلاق
                            </button>
                        </div>
                    )}
                    <button
                        onClick={handleManualRefresh}
                        className="bg-slate-900 border border-slate-800 hover:bg-slate-800 py-2 md:py-3 px-3 rounded-xl transition-all shadow-md text-slate-300"
                        title="تحديث البيانات"
                    >
                        <RotateCcw className={`w-5 h-5 ${loading ? `animate-spin ${activeThemeStyle.accentSpinnerClass}` : ''}`} />
                    </button>
                </div>
            </header>

            {/* Change Password Modal */}
            {isChangePasswordOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <h2 className={`text-xl font-bold ${activeThemeStyle.accentTextClass} mb-4`}>تغيير كلمة المرور</h2>

                        {changePasswordError && (
                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                {changePasswordError}
                            </div>
                        )}
                        {changePasswordSuccess && (
                            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                                {changePasswordSuccess}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm text-slate-300">كلمة المرور الحالية</label>
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-slate-400 font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm text-slate-300">كلمة المرور الجديدة</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-slate-400 font-mono"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={changePasswordLoading}
                                    className={`flex-1 ${activeThemeStyle.accentSolidClass} ${activeThemeStyle.accentSolidHoverClass} text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50`}
                                >
                                    {changePasswordLoading ? "جاري..." : "حفظ"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsChangePasswordOpen(false);
                                        setCurrentPassword("");
                                        setNewPassword("");
                                        setChangePasswordError("");
                                        setChangePasswordSuccess("");
                                    }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dean's Admin Panel */}
            {user?.role === "dean" && (
                <div className={`bg-slate-900/70 border ${activeThemeStyle.accentBorderClass} rounded-2xl p-6 mb-8 relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-2 h-full ${activeThemeStyle.accentSolidClass} opacity-80`} />
                    <h2 className={`${activeThemeStyle.accentTextClass} font-bold mb-4 flex items-center gap-2 text-xl`}>
                        <Shield className="w-6 h-6" />
                        لوحة العميد (سرية)
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleStartNewWeek}
                            disabled={saving}
                            className={`${activeThemeStyle.accentSolidClass} ${activeThemeStyle.accentSolidHoverClass} text-slate-950 font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all`}
                        >
                            <PlusCircle className="w-5 h-5" />
                            {currentWeek ? "إنهاء الأسبوع الحالي وبدء أسبوع جديد" : "بدء أسبوع جديد"}
                        </button>

                        <button
                            onClick={() => setIsCycleManagerOpen(true)}
                            className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold py-2 px-4 rounded-xl text-sm flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            فتح مدير الدورات
                        </button>

                        {currentWeek && (
                            <div className="flex items-center gap-2 bg-slate-950/40 p-1 rounded-xl border border-amber-500/20">
                                <span className="text-slate-400 text-sm px-2">تغيير سري للملك:</span>
                                <select
                                    className="bg-slate-900 text-amber-500 border border-slate-700/50 rounded-lg p-2 text-sm outline-none w-32 focus:border-amber-500"
                                    value={currentWeek.isRandom ? "" : currentWeek.king || ""}
                                    onChange={async (e) => {
                                        setSaving(true);
                                        const newKing = e.target.value === "" ? null : e.target.value;
                                        await services.secretlyChangeKing(currentWeek.id, newKing);
                                        await fetchWeek();
                                        setSaving(false);
                                    }}
                                    disabled={saving}
                                >
                                    <option value="">عشوائي (من غير ملك)</option>
                                    {VALID_NAMES.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {currentWeek && (
                            <div className="w-full bg-slate-950/40 p-4 rounded-xl border border-amber-500/20 mt-4">
                                <h3 className="text-amber-500 font-semibold mb-3">تغيير يوم الطلعة (سري - عميد فقط)</h3>
                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                    <select
                                        value={deanSelectedDay}
                                        onChange={(e) => setDeanSelectedDay(e.target.value as Exclude<WeekSession["day"], null>)}
                                        className="bg-slate-900 text-amber-500 border border-slate-700/50 rounded-lg p-2 text-sm outline-none w-full sm:w-44 focus:border-amber-500"
                                        disabled={saving}
                                    >
                                        {WEEK_DAYS.map(day => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={async () => {
                                            if (!currentWeek) return;
                                            setSaving(true);
                                            try {
                                                await services.setWeekChoices(
                                                    currentWeek.id,
                                                    deanSelectedDay,
                                                    currentWeek.restaurant || null,
                                                    currentWeek.activity || null
                                                );
                                                await fetchWeek();
                                            } catch (e) {
                                                console.error(e);
                                                alert("تعذّر تغيير اليوم من لوحة العميد");
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                        disabled={saving}
                                        className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        حفظ يوم الطلعة
                                    </button>
                                </div>
                            </div>
                        )}

                        {(() => {
                            const ratingWeek = currentWeek || pastWeek;
                            if (!ratingWeek) return null;
                            return (
                                <button
                                    onClick={async () => {
                                        setSaving(true);
                                        const willBeEnabled = !ratingWeek.ratingEnabled;
                                        await services.toggleRatingEnabled(ratingWeek.id, willBeEnabled);

                                        // If we are enabling the rating, notify members
                                        if (willBeEnabled) {
                                            try {
                                                await fetch("/api/reminders/rating-unlocked", {
                                                    method: "POST",
                                                    headers: getReminderAuthHeaders(),
                                                    body: JSON.stringify({ weekId: ratingWeek.id })
                                                });
                                            } catch (e) {
                                                console.error("Failed to notify members about unlocked rating:", e);
                                            }
                                        }

                                        await fetchWeek();
                                        setSaving(false);
                                    }}
                                    disabled={saving}
                                    className={`py-3 px-6 rounded-xl flex items-center gap-2 transition-all font-semibold ${ratingWeek.ratingEnabled
                                        ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
                                        : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                                        }`}
                                >
                                    {ratingWeek.ratingEnabled ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                                    {ratingWeek.ratingEnabled ? "قفل التقييم" : "فتح التقييم للأعضاء"}
                                </button>
                            );
                        })()}

                        {currentWeek && (
                            <div className="w-full bg-slate-950/40 p-4 rounded-xl border border-amber-500/20 mt-4">
                                <h3 className="text-amber-500 font-semibold mb-3">إدارة الحضور (صلاحية العميد)</h3>
                                <div className="flex flex-wrap gap-2">
                                    {VALID_NAMES.map(name => {
                                        const isAbsent = currentWeek.absentees?.includes(name) || false;
                                        const hasResponded = currentWeek.responded?.includes(name) || false;
                                        return (
                                            <button
                                                key={name}
                                                onClick={async () => {
                                                    setSaving(true);

                                                    // Logic for Dean toggle: 
                                                    // Wait -> Attend -> Absent -> Wait
                                                    let setAbsent = false;

                                                    if (!hasResponded) {
                                                        // They haven't decided. Force them to Attending.
                                                        setAbsent = false;
                                                    } else if (!isAbsent) {
                                                        // They are attending. Force them to Absent.
                                                        setAbsent = true;
                                                    } else {
                                                        // They are absent. Force them back to Attending for now.
                                                        setAbsent = false;
                                                    }

                                                    try {
                                                        const justCompleted = await services.toggleAttendance(currentWeek.id, name, setAbsent);

                                                        if (justCompleted) {
                                                            try {
                                                                await fetch("/api/reminders/attendance-complete", {
                                                                    method: "POST",
                                                                    headers: getReminderAuthHeaders(),
                                                                    body: JSON.stringify({ weekId: currentWeek.id })
                                                                });
                                                            } catch (e) {
                                                                console.error("Failed to notify members about attendance:", e);
                                                            }
                                                        }

                                                        await fetchWeek();
                                                    } catch (e: any) {
                                                        console.error("Toggle attendance error:", e);
                                                        alert(e.message || "حدث خطأ أثناء تغيير الحضور");
                                                    } finally {
                                                        setSaving(false);
                                                    }
                                                }}
                                                disabled={saving}
                                                className={`px-4 py-3 rounded-xl text-base font-semibold transition-colors border ${(!currentWeek.responded?.includes(name)) ? 'bg-slate-800 border-slate-700 text-slate-400 opacity-70' : isAbsent ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}
                                            >
                                                {name}: {(!currentWeek.responded?.includes(name)) ? 'بانتظار الرد ⏳' : isAbsent ? 'معتذر ❌' : 'حاضر ✅'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reminders Panel */}
                    <div className="w-full bg-slate-950/40 p-4 rounded-xl border border-sky-500/20 mt-4">
                        <h3 className="text-sky-400 font-semibold mb-3 flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            إرسال التنبيهات وإشعارات الجوال
                        </h3>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={async () => {
                                    if (!confirm("هل أنت متأكد من إرسال إشعار تذكير للأعضاء الذين لم يؤكدوا حضورهم؟")) return;
                                    setSaving(true);
                                    try {
                                        const res = await fetch("/api/reminders/attendance-pending", {
                                            method: "POST",
                                            headers: getReminderAuthHeaders(),
                                            body: JSON.stringify({ weekId: currentWeek?.id })
                                        });
                                        const data = await res.json();
                                        alert(data.message || "تم إرسال الإشعارات بنجاح");
                                    } catch (e) {
                                        console.error("Failed to send pending notifications:", e);
                                        alert("خطأ في إرسال الإشعارات");
                                    }
                                    setSaving(false);
                                }}
                                disabled={saving || !currentWeek || VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).length === 0}
                                className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-500 font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Bell className="w-4 h-4" />
                                إرسال تذكير لمن لم يرد {currentWeek ? `(${VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).length})` : ''}
                            </button>

                            <button
                                onClick={async () => {
                                    if (!currentWeek) return;
                                    if (!confirm(`هل أنت متأكد من إرسال إشعار تذكير للملك (${currentWeek.king})؟`)) return;
                                    setSaving(true);
                                    try {
                                        const res = await fetch("/api/reminders/king-push", {
                                            method: "POST",
                                            headers: getReminderAuthHeaders(),
                                            body: JSON.stringify({ weekId: currentWeek.id })
                                        });
                                        const data = await res.json();
                                        alert(data.message || "تم إرسال الإشعار بنجاح");
                                    } catch (e) {
                                        console.error("Failed to send King notification:", e);
                                        alert("خطأ في إرسال الإشعار");
                                    }
                                    setSaving(false);
                                }}
                                disabled={saving || !currentWeek || !!(currentWeek.day && currentWeek.restaurant) || currentWeek.isRandom}
                                className="bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-500 font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Bell className="w-4 h-4" />
                                تذكير الملك بالاختيار
                            </button>

                            <button
                                onClick={async () => {
                                    if (!confirm("هل أنت متأكد من إرسال إشعار تذكير بالتقييم لجميع الحاضرين؟")) return;
                                    setSaving(true);
                                    try {
                                        const res = await fetch("/api/reminders/rating-unlocked", {
                                            method: "POST",
                                            headers: getReminderAuthHeaders(),
                                            body: JSON.stringify({ weekId: currentWeek?.id || pastWeek?.id })
                                        });
                                        const data = await res.json();
                                        alert(data.message || "تم إرسال الإشعارات بنجاح");
                                    } catch (e) {
                                        console.error("Failed to send rating notifications:", e);
                                        alert("خطأ في إرسال الإشعارات");
                                    }
                                    setSaving(false);
                                }}
                                disabled={saving || !(currentWeek?.ratingEnabled || pastWeek?.ratingEnabled)}
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-500 font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Bell className="w-4 h-4" />
                                تذكير الحاضرين بالتقييم
                            </button>

                            <button
                                onClick={async () => {
                                    if (!confirm("هل أنت متأكد من تأجيل الطلعة للأسبوع القادم إذا كان الحضور أقل من 3؟")) return;
                                    setSaving(true);
                                    try {
                                        const res = await fetch("/api/reminders/postpone-week", {
                                            method: "POST",
                                            headers: getReminderAuthHeaders(),
                                            body: JSON.stringify({ weekId: currentWeek?.id })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(data.message || "تم إرسال إشعار التأجيل بنجاح");
                                        } else {
                                            alert(data.message || data.error || "لم يتم إرسال الإشعار");
                                        }
                                    } catch (e: any) {
                                        console.error("Failed to send postpone notification:", e);
                                        alert(e.message || "خطأ في إرسال الإشعار");
                                    }
                                    setSaving(false);
                                }}
                                disabled={saving || !currentWeek}
                                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Bell className="w-4 h-4" />
                                تأجيل الطلعة للأسبوع القادم
                            </button>
                        </div>
                    </div>

                    {/* Dean can see stats + reset codes + phone numbers */}
                    <DeanDashboard currentWeekId={currentWeek?.id} pastWeekId={pastWeek?.id} />
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-20">
                    <div className={`w-10 h-10 border-4 border-white/20 border-t-current rounded-full animate-spin ${activeThemeStyle.accentTextClass}`} />
                </div>
            ) : (
                <div className="pb-24">

                    {/* ===== TAB: الأسبوع الحالي ===== */}
                    {activeTab === "week" && selectedTheme === "bento" && !bentoFullView && (
                        <BentoWeekView
                            currentWeek={currentWeek}
                            pastWeek={pastWeek}
                            userName={user?.name || ""}
                            onSwitchToFullView={() => setBentoFullView(true)}
                        />
                    )}

                    {activeTab === "week" && !(selectedTheme === "bento" && !bentoFullView) && (
                        <div className="space-y-5 max-w-3xl mx-auto">

                            {selectedTheme === "bento" && bentoFullView && (
                                <button
                                    onClick={() => setBentoFullView(false)}
                                    className="w-full bg-white/10 hover:bg-white/15 backdrop-blur border border-white/25 text-white rounded-2xl py-2.5 text-sm font-semibold transition-colors"
                                >
                                    ↩ ارجع لعرض البنتو 🍱
                                </button>
                            )}

                            {/* Smart Reminders — يطلع لو عضو ما حضر/ما قيّم */}
                            <SmartReminders
                                userName={user?.name || ""}
                                currentWeek={currentWeek}
                                pastWeek={pastWeek}
                                hasRatedCurrentWeek={hasRatedCurrentWeek}
                                hasRatedPastWeek={hasRatedPastWeek}
                                hasRatedBathroomCurrentWeek={hasRatedBathroomCurrentWeek}
                                hasRatedBathroomPastWeek={hasRatedBathroomPastWeek}
                            />

                            {/* أنا فاضي — لقاء مفاجئ */}
                            {user?.name && (
                                <ImpromptuMeetupCard
                                    userName={user.name}
                                    isAdmin={user.role === "dean"}
                                />
                            )}

                            {/* CURRENT WEEK RATING */}
                            {currentWeek && currentWeek.ratingEnabled && !hasRatedCurrentWeek && user?.name !== currentWeek.king && !(currentWeek.absentees || []).includes(user?.name || "") && (
                                <div className="mb-6 relative">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-emerald-400 font-bold flex items-center gap-2"><Unlock className="w-5 h-5" /> تقييم طلعة هذا الأسبوع متاح الآن</h3>
                                    </div>
                                    <RatingForm
                                        weekId={currentWeek.id}
                                        userName={user?.name || ""}
                                        restaurantName={currentWeek.restaurant}
                                        onRated={() => setHasRatedCurrentWeek(true)}
                                        disabled={false}
                                    />
                                </div>
                            )}

                            {/* PAST WEEK RATING */}
                            {pastWeek && pastWeek.ratingEnabled && !hasRatedPastWeek && user?.name !== pastWeek.king && !(pastWeek.absentees || []).includes(user?.name || "") && (
                                <div className="mb-6">
                                    <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2"><Unlock className="w-5 h-5" /> تقييم طلعة الأسبوع الماضي متاح</h3>
                                    <RatingForm
                                        weekId={pastWeek.id}
                                        userName={user?.name || ""}
                                        restaurantName={pastWeek.restaurant}
                                        onRated={() => setHasRatedPastWeek(true)}
                                        disabled={false}
                                    />
                                </div>
                            )}

                            {!currentWeek ? (
                                <div className="text-center p-10 bg-slate-900/50 rounded-3xl border border-slate-800">
                                    <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-2xl font-semibold text-slate-300">لا يوجد أسبوع نشط حالياً</h3>
                                    <p className="text-slate-500 mt-2">ننتظر العميد لبدء الدورة الجديدة.</p>
                                </div>
                            ) : (
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                                    <div className={`absolute -top-20 -right-20 w-64 h-64 ${activeThemeStyle.accentSoftClass} rounded-full blur-3xl`} />

                                    <div className="flex items-start justify-between mb-8 relative z-10">
                                        <div>
                                            <h3 className="text-slate-400 font-medium mb-1">دورة هذا الأسبوع</h3>
                                            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                                ملك الأسبوع: <span className={activeThemeStyle.accentTextClass}>{currentWeek.king || "عشوائي"}</span>
                                                {currentWeek.king === user?.name && (
                                                    <span className={`text-xs ${activeThemeStyle.accentSoftClass} ${activeThemeStyle.accentTextClass} px-3 py-1 rounded-full border ${activeThemeStyle.accentBorderClass}`}>
                                                        أنت الملك!
                                                    </span>
                                                )}
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="space-y-6 relative z-10">
                                        <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800 flex items-center gap-4">
                                            <Calendar className="w-10 h-10 text-slate-500" />
                                            <div className="flex-1">
                                                <p className="text-sm text-slate-400 mb-1">يوم الطلعة</p>
                                                {isKing ? (
                                                    <select
                                                        value={selectedDay}
                                                        onChange={e => setSelectedDay(e.target.value as Exclude<WeekSession["day"], null>)}
                                                        className="bg-slate-900 text-white border border-slate-700 rounded-lg p-2 outline-none w-48 focus:border-slate-400"
                                                    >
                                                        {(["الخميس", "الجمعة"] as Exclude<WeekSession["day"], null>[]).map(day => (
                                                            <option key={day} value={day}>{day}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <p className="text-xl font-semibold text-white">
                                                            {currentWeek.day || <span className="text-slate-600 font-normal">لم يحدد بعد</span>}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {currentWeek && (
                                            <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-800">
                                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                                    <h4 className="text-sm font-semibold text-slate-300">تصويت يوم الطلعة</h4>
                                                    {isKing && (
                                                        <button
                                                            onClick={() => handleToggleDayVoting(!dayVotingEnabled)}
                                                            disabled={saving || !!currentWeek.day}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${dayVotingEnabled
                                                                ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                                                                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"}`}
                                                        >
                                                                {dayVotingEnabled ? "التصويت مفعل" : "تفعيل التصويت"}
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                                                        <p className="text-xs text-slate-400 mb-1">الخميس</p>
                                                        <p className="text-lg font-bold text-white">{voteThursdayCount}</p>
                                                    </div>
                                                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                                                        <p className="text-xs text-slate-400 mb-1">الجمعة</p>
                                                        <p className="text-lg font-bold text-white">{voteFridayCount}</p>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-500">
                                                    المصوّتون المؤهلون: {eligibleDayVoters.length} | المشاركون في التصويت: {registeredDayVotesCount}
                                                </p>

                                                {isKing && dayVotingEnabled && !currentWeek.day && (
                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        <select
                                                            value={tieBreakDay}
                                                            onChange={(e) => setTieBreakDay(e.target.value as "الخميس" | "الجمعة")}
                                                            className="bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 text-sm outline-none"
                                                        >
                                                            <option value="الخميس">الخميس</option>
                                                            <option value="الجمعة">الجمعة</option>
                                                        </select>
                                                        <button
                                                            onClick={handleApplyDayVoteResult}
                                                            disabled={saving || (voteThursdayCount + voteFridayCount === 0)}
                                                            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                                        >
                                                            اعتماد نتيجة التصويت
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isKing && (
                                            <button
                                                onClick={() => setIsPlannerOpen(true)}
                                                className="w-full bg-gradient-to-r from-fuchsia-500/15 to-purple-500/15 hover:from-fuchsia-500/25 hover:to-purple-500/25 border border-fuchsia-500/30 text-fuchsia-300 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                محتار؟ خل المخطّط الذكي يقترح لك مطعم
                                            </button>
                                        )}

                                        <RestaurantVotingPanel
                                            currentWeek={currentWeek}
                                            userName={user?.name || ""}
                                            isKing={isKing}
                                            onRefresh={fetchWeek}
                                            restaurant={restaurant}
                                            setRestaurant={setRestaurant}
                                            mapsUrl={restaurantMapsUrl}
                                            setMapsUrl={setRestaurantMapsUrl}
                                        />

                                        {/* Attendance Section */}
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-slate-300">قائمة الحضور والتأكيد</h3>
                                                    <p className="text-xs text-slate-500 mb-2">أكد حضورك أو اعتذارك عن الطلعة</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {!isKing && user?.name && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAttendanceChoice(false)}
                                                                disabled={saving || (!(currentWeek.absentees || []).includes(user.name) && (currentWeek.responded || []).includes(user.name))}
                                                                className={`px-6 py-3 rounded-xl text-base font-semibold transition-colors border shadow-sm ${(!(currentWeek.absentees || []).includes(user.name) && (currentWeek.responded || []).includes(user.name))
                                                                    ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300 cursor-default'
                                                                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'}`}
                                                            >
                                                                حضور ✅
                                                            </button>
                                                            <button
                                                                onClick={() => handleAttendanceChoice(true)}
                                                                disabled={saving || (currentWeek.absentees || []).includes(user.name)}
                                                                className={`px-6 py-3 rounded-xl text-base font-semibold transition-colors border shadow-sm ${((currentWeek.absentees || []).includes(user.name))
                                                                    ? 'bg-red-500/25 border-red-500/40 text-red-300 cursor-default'
                                                                    : 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'}`}
                                                            >
                                                                اعتذار ❌
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {!isKing && user?.name && !currentWeek.day && (
                                                <div className="mb-4 border-t border-slate-800/60 pt-4">
                                                    <p className="text-sm text-slate-300 mb-2 font-semibold">تصويت يوم الطلعة</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => handleSubmitDayVote("الخميس")}
                                                            disabled={saving || !canUserVoteDay}
                                                            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${myDayVote === "الخميس"
                                                                ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-300"
                                                                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"}`}
                                                        >
                                                            التصويت: الخميس
                                                        </button>
                                                        <button
                                                            onClick={() => handleSubmitDayVote("الجمعة")}
                                                            disabled={saving || !canUserVoteDay}
                                                            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${myDayVote === "الجمعة"
                                                                ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-300"
                                                                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"}`}
                                                        >
                                                            التصويت: الجمعة
                                                        </button>
                                                        <button
                                                            onClick={() => handleSubmitDayVote("الخميس والجمعة")}
                                                            disabled={saving || !canUserVoteDay}
                                                            className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${myDayVote === "الخميس والجمعة"
                                                                ? "bg-emerald-500/25 border-emerald-400/40 text-emerald-300"
                                                                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"}`}
                                                        >
                                                            التصويت: الخميس والجمعة
                                                        </button>
                                                    </div>
                                                    {dayVotingEnabled && !canUserVoteDay && (
                                                        <p className="text-xs text-slate-500 mt-2">التصويت متاح فقط للحاضرين بعد تأكيد الحضور.</p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                {/* Attendees Section */}
                                                <div>
                                                    <p className="text-sm text-emerald-500 mb-2 font-semibold">
                                                        الحاضرين ({VALID_NAMES.filter(n => (currentWeek.responded || []).includes(n) && !(currentWeek.absentees || []).includes(n) || n === currentWeek.king).length}):
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {VALID_NAMES.filter(n => (currentWeek.responded || []).includes(n) && !(currentWeek.absentees || []).includes(n) || n === currentWeek.king).map(name => (
                                                            renderMemberChip(name, name === currentWeek.king ? "👑" : "✅", "present")
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Waiting Response Section */}
                                                {VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).length > 0 && (
                                                    <div className="pt-2 border-t border-slate-800/50">
                                                        <p className="text-sm text-slate-400 mb-2 font-semibold">
                                                            بانتظار الرد ({VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).length}):
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {VALID_NAMES.filter(n => !(currentWeek.responded || []).includes(n) && n !== currentWeek.king).map(name => (
                                                                renderMemberChip(name, "⏳", "waiting")
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Absentees Section */}
                                                {(currentWeek.absentees || []).length > 0 && (
                                                    <div className="pt-2 border-t border-slate-800/50">
                                                        <p className="text-sm text-red-500 mb-2 font-semibold">
                                                            المعتذرين ({(currentWeek.absentees || []).length}):
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(currentWeek.absentees || []).map(name => (
                                                                renderMemberChip(name, "❌", "absent")
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isKing && (
                                            <div className="pt-4 border-t border-slate-800">
                                                <button
                                                    onClick={handleSetChoices}
                                                    disabled={saving}
                                                    className={`${activeThemeStyle.accentSolidClass} ${activeThemeStyle.accentSolidHoverClass} text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all w-full md:w-auto justify-center`}
                                                >
                                                    {saving ? "جاري الحفظ..." : "حفظ القرارات"}
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* تصويت الميزات المستقبلية */}
                            <FutureFeaturesVoting
                                userName={user?.name || ""}
                                isDean={user?.role === "dean"}
                                accentSoftClass={activeThemeStyle.accentSoftClass}
                                accentBorderClass={activeThemeStyle.accentBorderClass}
                                accentTextClass={activeThemeStyle.accentTextClass}
                            />
                        </div>
                    )}

                    {/* ===== TAB: لوحة المتصدرين ===== */}
                    {activeTab === "leaderboard" && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            <KingsLeaderboard />
                            <Leaderboard
                                cycleNumber={currentWeek ? currentWeek.cycleNumber : (pastWeek ? pastWeek.cycleNumber : 1)}
                                isDean={user?.role === "dean"}
                                onReset={currentWeek ? async () => {
                                    setSaving(true);
                                    await services.resetCycleLeaderboard(currentWeek.id, currentWeek.cycleNumber + 1);
                                    await fetchWeek();
                                    setSaving(false);
                                } : undefined}
                            />
                            <GlobalLeaderboard />
                            <RatingsExplorer />
                        </div>
                    )}

                    {/* ===== TAB: تقييم الحمامات ===== */}
                    {activeTab === "bathroom" && (
                        <div className="space-y-4 max-w-2xl mx-auto">
                            <h2 className="text-2xl font-bold text-sky-400 flex items-center justify-center gap-2">
                                <Bath className="w-6 h-6" />
                                قسم تقييم حمامات المطاعم
                            </h2>
                            {isHesham && (
                                <BathroomRatingForm
                                    weekId={bathroomWeekForRating?.id || "general"}
                                    userName={user?.name || ""}
                                    restaurantName={bathroomWeekForRating?.restaurant || undefined}
                                    onRated={() => {
                                        setHasRatedBathroomCurrentWeek(true);
                                        setHasRatedBathroomPastWeek(true);
                                    }}
                                    disabled={false}
                                />
                            )}
                            <BathroomRatingsDisplay />
                        </div>
                    )}

                    {/* ===== TAB: خريطة المطاعم ===== */}
                    {activeTab === "map" && user?.name && (
                        <RestaurantMapPanel
                            isOpen={true}
                            embedded={true}
                            userName={user.name}
                            isAdmin={user.role === "dean"}
                        />
                    )}

                    {/* ===== TAB: المزيد ===== */}
                    {activeTab === "more" && (
                        <div className="space-y-4 max-w-2xl mx-auto">

                            {/* Theme Selector */}
                            <div className={`bg-slate-900/90 border ${activeThemeStyle.accentBorderClass} rounded-3xl p-6 shadow-xl`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`${activeThemeStyle.accentSoftClass} p-2 rounded-xl ${activeThemeStyle.accentTextClass}`}>
                                        <Palette className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">الثيمات</h3>
                                        <p className="text-xs text-slate-500">اختر اللون اللي يناسبك - يتذكره التطبيق تلقائيًا</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {THEME_OPTIONS.map((theme) => {
                                        const isActive = theme.id === selectedTheme;
                                        return (
                                            <button
                                                key={theme.id}
                                                onClick={() => handleThemeChange(theme.id)}
                                                className={`text-right rounded-2xl border p-3 transition-all ${isActive
                                                    ? `${activeThemeStyle.accentBorderClass} bg-slate-700/90 ring-1 ring-white/25`
                                                    : "border-slate-600 bg-slate-800/90 hover:bg-slate-700/90 hover:border-slate-400"}`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-slate-300"}`}>{theme.name}</span>
                                                    {isActive && <span className={`text-[10px] ${activeThemeStyle.accentTextClass}`}>مختار</span>}
                                                </div>
                                                <div className="flex gap-1">
                                                    <span className={`w-5 h-5 rounded-full ${theme.previewA}`} />
                                                    <span className={`w-5 h-5 rounded-full ${theme.previewB}`} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* رابط معرض أشكال التصميم الكاملة */}
                                <a
                                    href="/styles"
                                    className="mt-4 w-full bg-gradient-to-r from-fuchsia-500/15 to-purple-500/15 hover:from-fuchsia-500/25 hover:to-purple-500/25 border border-fuchsia-500/30 text-fuchsia-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    🎨 جرّب أشكال تصميم جديدة كلياً للموقع
                                </a>

                                {/* رابط التيرمنال الحي */}
                                <a
                                    href="/terminal"
                                    className="mt-3 w-full bg-[#0d130d] hover:bg-[#0d130d]/70 border border-green-500/40 text-green-300 font-mono py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    <span className="text-green-500">$</span>
                                    💻 افتح التيرمنال الحي (أوامر فعلية)
                                </a>
                            </div>

                            {/* Profile Customization */}
                            <div className={`bg-slate-900/90 border ${activeThemeStyle.accentBorderClass} rounded-3xl p-6 shadow-xl`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`${activeThemeStyle.accentSoftClass} p-2 rounded-xl ${activeThemeStyle.accentTextClass}`}>
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">ملفي الشخصي</h3>
                                        <p className="text-xs text-slate-500">تقدر تغيّر صورتك والاسم المستعار فقط</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-300">
                                        {profileImageData ? (
                                            <img src={profileImageData} alt="profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{(nickNameInput.trim() || user?.name || "?").charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <input
                                            value={nickNameInput}
                                            onChange={(e) => setNickNameInput(e.target.value)}
                                            maxLength={24}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-slate-400"
                                            placeholder="الاسم المستعار"
                                        />
                                        <p className="text-[11px] text-slate-500">الاسم الأساسي ثابت: {user?.name}</p>
                                    </div>
                                </div>

                                <div className="mb-3 p-3 rounded-xl border border-slate-700 bg-slate-950/70 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-slate-200 font-medium">إظهار الصورة الشخصية بجانب الاسم</p>
                                        <p className="text-[11px] text-slate-500">هذا الخيار يطبق في بورد الدردشة لكل رسائلك</p>
                                    </div>
                                    <button
                                        onClick={() => setShowProfileImageInput(prev => !prev)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${showProfileImageInput
                                            ? `${activeThemeStyle.accentSoftClass} ${activeThemeStyle.accentBorderClass} ${activeThemeStyle.accentTextClass}`
                                            : "bg-slate-800 border-slate-700 text-slate-400"}`}
                                    >
                                        {showProfileImageInput ? "مفعل" : "مخفي"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                    <label className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium py-2 px-3 rounded-xl cursor-pointer text-center transition-colors">
                                        اختيار صورة
                                        <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                                    </label>
                                    <button
                                        onClick={() => setProfileImageData(null)}
                                        className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-medium py-2 px-3 rounded-xl transition-colors"
                                    >
                                        إزالة الصورة
                                    </button>
                                </div>

                                {profileError && <p className="text-sm text-red-400 mb-2">{profileError}</p>}
                                {profileSuccess && <p className="text-sm text-emerald-400 mb-2">{profileSuccess}</p>}

                                <button
                                    onClick={handleSaveProfileCustomization}
                                    disabled={profileSaving}
                                    className={`w-full ${activeThemeStyle.accentSolidClass} ${activeThemeStyle.accentSolidHoverClass} text-slate-950 font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50`}
                                >
                                    {profileSaving ? "جاري حفظ الملف..." : "حفظ الملف الشخصي"}
                                </button>
                            </div>

                            {/* Account Actions */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white">الحساب</h3>
                                        <p className="text-xs text-slate-500">إدارة تسجيل الدخول وكلمة المرور</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setIsChangePasswordOpen(true)}
                                        className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <KeyRound className="w-5 h-5" />
                                        تغيير كلمة المرور
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        تسجيل الخروج
                                    </button>
                                </div>
                            </div>

                            {/* Statistics Button */}
                            <div className="bg-gradient-to-br from-violet-900/40 to-slate-900 border border-violet-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group cursor-pointer" onClick={() => setIsStatsOpen(true)}>
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-500" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="bg-violet-500/20 p-2 rounded-xl text-violet-400">
                                            <BarChart3 className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-xl text-white">إحصائيات</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                                        شف أرقام وإحصائيات شاملة عن الطلعات والأعضاء والمطاعم والزيارات وأكثر! 📊
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsStatsOpen(true); }}
                                        className="w-full bg-violet-500 hover:bg-violet-400 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                                    >
                                        <BarChart3 className="w-5 h-5" />
                                        عرض الإحصائيات
                                    </button>
                                </div>
                            </div>

                            {/* Member Profile Button */}
                            <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group cursor-pointer" onClick={() => setIsMemberProfileOpen(true)}>
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-500" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-xl text-white">ملفي الإحصائي</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                                        عرض إحصائياتك الشخصية بسرعة: حضورك، تقييماتك، وأداؤك كملك.
                                    </p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsMemberProfileOpen(true); }}
                                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                                    >
                                        <Users className="w-5 h-5" />
                                        فتح ملفي الإحصائي
                                    </button>
                                </div>
                            </div>

                            {/* Push Notifications Card */}
                            {isSupported && (
                                <div className={`border rounded-3xl p-6 shadow-xl ${isSubscribed ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-slate-900 border-slate-800'}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-xl ${isSubscribed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                                            <Bell className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white">إشعارات الجوال</h3>
                                            <p className={`text-xs ${isSubscribed ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {isSubscribed ? '✅ مفعلة' : '❌ غير مفعلة'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                                        {isSubscribed
                                            ? 'إذا ما توصلك إشعارات، اضغط الزر تحت عشان تجدد الاشتراك.'
                                            : 'فعّل الإشعارات عشان يوصلك كل جديد عن الطلعات والتقييمات.'}
                                    </p>
                                    <button
                                        onClick={handleSubscribe}
                                        disabled={subscribing}
                                        className={`w-full font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                                            isSubscribed
                                                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400'
                                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                                        }`}
                                    >
                                        <Bell className="w-5 h-5" />
                                        {subscribing ? 'جاري التفعيل...' : isSubscribed ? 'تجديد الاشتراك' : 'تفعيل الإشعارات'}
                                    </button>
                                </div>
                            )}

                            {/* Mini-Game Banner */}
                            <div className="bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-500" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="bg-rose-500/20 p-2 rounded-xl text-rose-400">
                                            <Swords className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-xl text-white">Duel Royale 1v1</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                                        لعبة 1 ضد 1 بأسلوب كلاش رويال: مسارين، إكسير، بطاقات، وتدمير الأبراج. مصممة للجوال بالكامل.
                                    </p>
                                    <button
                                        onClick={() => setIsDuelOpen(true)}
                                        className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                                    >
                                        <PlayCircle className="w-5 h-5 fill-current" />
                                        ادخل 1v1 الآن
                                    </button>
                                </div>
                            </div>

                            {/* Mini-Game Banner — Coup */}
                            <div className="bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all duration-500" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="bg-rose-500/20 p-2 rounded-xl text-rose-400">
                                            <Swords className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-xl text-white">Coup — انقلاب 🎭</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                                        لعبة خداع وذكاء لـ 2-4 لاعبين. ادّعِ الشخصيات، اكذب، وتحدّى خصومك — مع دردشة صوتية داخل اللعبة!
                                    </p>
                                    <button
                                        onClick={() => setIsCoupOpen(true)}
                                        className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                                    >
                                        <PlayCircle className="w-5 h-5 fill-current" />
                                        ادخل الحلبة
                                    </button>
                                </div>
                            </div>

                            {/* Mini-Game Banner */}
                            <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500">
                                            <Gamepad2 className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-xl text-white">صراع الملوك الجياع</h3>
                                    </div>
                                    <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                                        لعبة أونلاين جماعية. ادخل الحلبة، اجمع البرجر 🍔، ونافس الشباب على المركز الأول!
                                    </p>
                                    <button
                                        onClick={() => setIsGameOpen(true)}
                                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                    >
                                        <PlayCircle className="w-5 h-5 fill-current" />
                                        العب الآن
                                    </button>
                                </div>
                            </div>

                            {/* Constitution */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/20">
                                    <ScrollText className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="font-bold text-xl mb-2 text-slate-200">دستور عرش الخميس</h3>
                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    القوانين المنظمة للطلعات الأسبوعية، حقوق وواجبات ملك الخميس، وآلية التصويت وتقييم المطاعم والحضور.
                                </p>
                                <button
                                    onClick={() => setIsConstitutionOpen(true)}
                                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-amber-500 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    <BookOpen className="w-5 h-5" />
                                    قراءة الدستور الكامل
                                </button>
                            </div>

                            {/* Suggestion Box */}
                            <SuggestionBox isDean={user?.role === "dean"} />

                            {/* Chat Board */}
                            <ChatBoard userName={user?.name || ""} />

                            <div className="flex justify-center pt-2 pb-4">
                                <button
                                    onClick={handleTestNotificationSound}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                                >
                                    اختبار صوت الإشعار
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ===== BOTTOM TAB BAR ===== */}
            {!loading && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 pb-safe">
                    <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
                        {[
                            { id: "week" as TabType, icon: Calendar, label: "الأسبوع" },
                            { id: "leaderboard" as TabType, icon: Trophy, label: "المتصدرين" },
                            { id: "bathroom" as TabType, icon: Bath, label: "الحمامات" },
                            { id: "map" as TabType, icon: MapPin, label: "الخريطة" },
                            { id: "more" as TabType, icon: Ellipsis, label: "المزيد" },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[64px] ${
                                    activeTab === tab.id
                                        ? `${activeTheme.tabActiveClass} scale-105`
                                        : "text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                <tab.icon className={`w-5 h-5 transition-all ${activeTab === tab.id ? "drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" : ""}`} />
                                <span className={`text-[10px] font-medium transition-all ${activeTab === tab.id ? activeTheme.tabActiveClass : ""}`}>{tab.label}</span>
                                {activeTab === tab.id && (
                                    <div className={`absolute bottom-1 w-6 h-0.5 ${activeTheme.tabIndicatorClass} rounded-full`} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <ConstitutionModal
                isOpen={isConstitutionOpen}
                onClose={() => setIsConstitutionOpen(false)}
            />

            {
                user && (
                    <HungryKingsArena
                        isOpen={isGameOpen}
                        onClose={() => setIsGameOpen(false)}
                        userName={user.name}
                    />
                )
            }

            {
                user && (
                    <RoyalDuelArena
                        isOpen={isDuelOpen}
                        onClose={() => setIsDuelOpen(false)}
                        userName={user.name}
                    />
                )
            }

            {
                user && (
                    <CoupArena
                        isOpen={isCoupOpen}
                        onClose={() => setIsCoupOpen(false)}
                        userName={user.name}
                    />
                )
            }

            <CycleManagerModal
                isOpen={isCycleManagerOpen}
                onClose={() => setIsCycleManagerOpen(false)}
                currentCycleNumber={currentWeek?.cycleNumber || pastWeek?.cycleNumber || 1}
                onAfterSave={() => fetchWeek()}
            />

            <StatisticsPanel
                isOpen={isStatsOpen}
                onClose={() => setIsStatsOpen(false)}
            />

            <OutingPlannerPanel
                isOpen={isPlannerOpen}
                onClose={() => setIsPlannerOpen(false)}
                onPick={(name, mapsUrl) => {
                    setRestaurant(name);
                    setRestaurantMapsUrl(mapsUrl);
                }}
            />

            <MemberProfilePanel
                isOpen={isMemberProfileOpen}
                onClose={() => setIsMemberProfileOpen(false)}
                currentUserName={user?.name || ""}
            />
        </div >
    );
}
