import { db } from "./firebase";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    onSnapshot
} from "firebase/firestore";

// Security verification helper
export async function verifyIdentity(userName: string): Promise<boolean> {
    if (typeof window === "undefined") return false; // Verify works only on client

    try {
        const result = await invokeRpc("validateSession");
        return result?.profile?.name === userName;
    } catch {
        return false;
    }
}

export interface WeekSession {
    id: string;
    king: string | null; // null if random week
    isRandom: boolean;
    cycleNumber: number; // e.g. cycle 1 is weeks 1-6
    weekNumber: number; // overall week number
    day: "السبت" | "الأحد" | "الإثنين" | "الثلاثاء" | "الأربعاء" | "الخميس" | "الجمعة" | null;
    restaurant: string | null;
    activity: string | null;
    status: "pending" | "completed" | "skipped";
    ratingEnabled: boolean;
    dayVotingEnabled?: boolean;
    dayVotes?: Record<string, "الخميس" | "الجمعة" | "الخميس والجمعة">;
    // Restaurant Voting
    restaurantVotingMode?: "dictatorial" | "democratic";
    restaurantCandidates?: [string, string, string];
    restaurantVotes?: Record<string, string>; // userName -> restaurantName
    restaurantVotingStartedAt?: Timestamp | null;
    restaurantVotingEndedAt?: Timestamp | null;
    restaurantVotingActive?: boolean;
    restaurantVotingResult?: string | null;
    restaurantOverridden?: boolean;
    restaurantOverrideValue?: string | null;
    absentees: string[];
    responded: string[];
    createdAt: Timestamp;
}

export interface Rating {
    id: string;
    weekId: string;
    userName: string;
    score: number; // 1 to 5
    createdAt: Timestamp;
}

export interface DataIntegrityIssue {
    type: string;
    severity: "high" | "medium" | "low";
    message: string;
    weekId?: string;
}

export interface DataIntegrityReport {
    healthy: boolean;
    totalWeeks: number;
    totalRatings: number;
    pendingCount: number;
    issues: DataIntegrityIssue[];
}

export interface BathroomRating {
    id: string;
    weekId: string;
    userName: string;
    score: number; // 1 to 5
    bathroomName?: string;
    restaurantName?: string | null;
    createdAt: Timestamp;
}

export interface Suggestion {
    id: string;
    text: string;
    createdAt: Timestamp;
}

export interface ChatMessage {
    id: string;
    userName: string;
    nickName?: string;
    profileImage?: string | null;
    showProfileImage?: boolean;
    text: string;
    createdAt: Timestamp;
}

export interface PublicUserProfile {
    userName: string;
    nickName?: string;
    profileImage?: string | null;
    showProfileImage: boolean;
}

export interface FeatureFeedbackEntry {
    votes: Record<string, "yes" | "no">;
    removed: boolean;
}

export interface MemberActivityStat {
    userName: string;
    totalMinutes: number;
    totalSeconds: number;
    favoriteTab: string | null;
    favoriteTabLabel: string | null;
    lastSeenAt: Timestamp | null;
}

export interface FutureFeatureSeed {
    id: string;
    title: string;
    description: string;
    icon: string;
}

export const FUTURE_FEATURE_SEEDS: FutureFeatureSeed[] = [
    {
        id: "seasons",
        title: "نظام المواسم 🏆",
        description: "كل 3 شهور موسم جديد. بطل الموسم يحصل لقب دائم في بروفايله، وأرشيف للمواسم السابقة.",
        icon: "🏆",
    },
    {
        id: "points-store",
        title: "نقاط ومتجر افتراضي 🪙",
        description: "اكسب نقاط من الحضور والتقييم والمنافسات، وتصرفها على لون بروفايل مميز، شارة، أو فيتو على قرار الملك.",
        icon: "🪙",
    },
    {
        id: "restaurant-map",
        title: "خريطة المطاعم 📍",
        description: "خريطة تفاعلية لكل المطاعم اللي زرتوها مع تقييمها، تساعد الملك يقرر بسرعة.",
        icon: "📍",
    },
    {
        id: "group-vote",
        title: "تصويت جماعي على المطعم 🗳️",
        description: "الملك يقترح 3 مطاعم، الأعضاء يصوتون، ويُعتمد الفائز. يخفف ضغط القرار على الملك.",
        icon: "🗳️",
    },
    {
        id: "impromptu-meetup",
        title: "أنا فاضي — لقاء مفاجئ 🚨",
        description:
            "زر في الصفحة الرئيسية: 'فاضي بكير، مين معاي؟' → إشعار يطير لكل الأعضاء فوراً، وكل واحد يرد بحالته خلال 5 دقايق (فاضي / مشغول / يمكن). لو 3 أعضاء أو أكثر ردوا 'فاضي'، يبدأ تصويت سريع على مطعم بدون انتظار الأسبوع. الهدف: ننظّم المعزوفة الجماعية اللي تصير في الواتساب يومياً ونحفظ سجلها داخل الموقع. مفيدة في إجازات نهاية الأسبوع، رمضان (لقاءات السحور)، والمواعيد المفاجئة. تشتغل بالإشعارات الموجودة بدون أي إعداد جديد. سجل اللقاءات المفاجئة يضاف للإحصائيات (مين أكثر واحد يرد 'فاضي'، مين دائماً 'مشغول'، إلخ).",
        icon: "🚨",
    },
];

export interface RatingExplorerWeek {
    week: WeekSession;
    averageScore: number;
    ratings: Rating[];
}

export interface MemberProfileData {
    name: string;
    totalWeeksParticipated: number;
    attendanceRate: number;
    attendedCount: number;
    absentCount: number;
    timesAsKing: number;
    ratingsGiven: number;
    averageRatingGiven: number;
    averageWeekScoreAsKing: number;
    bestWeekAsKing: { weekId: string; restaurant: string | null; score: number } | null;
    worstWeekAsKing: { weekId: string; restaurant: string | null; score: number } | null;
    favoriteDay: "الخميس" | "الجمعة" | "تعادل";
    lastSeenOutingAt: Timestamp | null;
    restaurantRatings: { restaurant: string; score: number; weekId: string }[];
}

export const VALID_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
export const MAX_BUDGET = 175;

// ─────────────────────────────────────────────────────────────
// Single source of truth: "does this week count in competition/stats?"
// Previously every read function filtered differently (some excluded only
// isRandom, some nothing) so a single junk week (cycle 999) skewed the math.
// These three helpers unify that rule everywhere.
// ─────────────────────────────────────────────────────────────

/** Imported/organizational week that carries a pre-computed historical average. */
export function isHistoricalWeek(w: any): boolean {
    return w?.historicalAverageRating !== undefined;
}

/** Junk left by manual edits or hacks — must never enter competitive math. */
export function isJunkWeek(w: Partial<WeekSession>): boolean {
    if ((w.weekNumber ?? 0) >= 900) return true;      // 999/1000+ week-number hacks
    if ((w.cycleNumber ?? 0) <= 0) return true;        // cycle 0 / negative
    if ((w.cycleNumber ?? 0) >= 100) return true;      // cycle 100+ placeholders
    if (!w.isRandom && w.king && !VALID_NAMES.includes(w.king)) return true; // fake king
    return false;
}

/** TRUE only for real, competitive outings (excludes random, historical, junk). */
export function isCompetitiveWeek(w: any): boolean {
    return !w.isRandom && !isHistoricalWeek(w) && !isJunkWeek(w);
}

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش حاطّ تايم آوت ١٥ ثانية؟"
 * قال: "لأني تعبت أنتظر السيرفر زي ما الشعب ينتظر الملك يقرّر المطعم 😂⏳"
 * الصبر له حدود... حتى للروبوتات 🔋
 */

// Hard ceiling for any RPC call. Without this, a hung/overwhelmed server
// leaves `await fetch` pending forever — which froze the whole app on the
// loading spinner. The timeout guarantees every call resolves or rejects,
// so loading states ALWAYS clear. Manual AbortController for old-Safari/iOS.
const RPC_TIMEOUT_MS = 15000;

export async function invokeRpc(action: string, payload: any = {}) {
    const baseUrl = typeof window === "undefined" ? "http://localhost:3000" : "";
    const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") : global.localStorage.getItem("king_user_name");
    const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") : global.localStorage.getItem("king_user_token");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

    let res: Response;
    try {
        res = await fetch(`${baseUrl}/api/rpc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, payload, auth: { name, token } }),
            signal: controller.signal,
        });
    } catch (e) {
        clearTimeout(timer);
        if ((e as Error)?.name === "AbortError") {
            throw new Error("الخادم ما استجاب — تأكد من الاتصال وحاول مرة ثانية");
        }
        throw e;
    }
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || "حدث خطأ غير معروف");
    }
    return data.result;
}

/**
 * Picks the newest pending week from a list, sorting client-side so no
 * Firestore composite index is required. Falls back to weekNumber when a
 * createdAt timestamp is missing (e.g. legacy/junk docs).
 */
function pickNewestPendingWeek(weeks: WeekSession[]): WeekSession | null {
    if (weeks.length === 0) return null;
    const ms = (w: WeekSession): number => {
        const t = w.createdAt?.toMillis?.();
        if (typeof t === "number") return t;
        return (w.weekNumber ?? 0); // weak fallback for docs without createdAt
    };
    return [...weeks].sort((a, b) => ms(b) - ms(a))[0];
}

export const services = {
    // Get active week or create new one if none exists
    async getCurrentWeek(): Promise<WeekSession | null> {
        // Pick the NEWEST pending week. We sort client-side (not orderBy) so we
        // don't need a Firestore composite index. Without this, a stale pending
        // week could show up with its old attendance votes already filled in.
        const q = query(collection(db, "weeks"), where("status", "==", "pending"));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return pickNewestPendingWeek(snap.docs.map(d => ({ id: d.id, ...d.data() } as WeekSession)));
    },

    // Listen to changes in the current active week (newest pending week)
    listenToCurrentWeek(callback: (week: WeekSession | null) => void) {
        const q = query(collection(db, "weeks"), where("status", "==", "pending"));
        return onSnapshot(q, (snap) => {
            if (snap.empty) { callback(null); return; }
            callback(pickNewestPendingWeek(snap.docs.map(d => ({ id: d.id, ...d.data() } as WeekSession))));
        });
    },

    async startNewWeek(kingName: string | null, isRandom: boolean, cycleNumber: number, weekNumber: number) {
        return invokeRpc("startNewWeek", { kingName, isRandom, cycleNumber, weekNumber });
    },

    async toggleAttendance(weekId: string, userName: string, isAbsent: boolean) {
        return invokeRpc("toggleAttendance", { weekId, userName, isAbsent });
    },

    async setWeekChoices(weekId: string, day: WeekSession["day"], restaurant: string | null, activity: string | null) {
        return invokeRpc("setWeekChoices", { weekId, day, restaurant, activity });
    },

    // ── Current cycle config (auto-assigns every new outing to this cycle) ──
    listenToCurrentCycle(cb: (cycle: number) => void) {
        return onSnapshot(doc(db, "appConfig", "main"), (snap) => {
            const c = snap.exists() ? Number((snap.data() as { currentCycle?: number })?.currentCycle) : NaN;
            cb(Number.isInteger(c) && c > 0 ? c : 1);
        });
    },

    async getCurrentCycle(): Promise<number> {
        const snap = await getDoc(doc(db, "appConfig", "main"));
        const c = snap.exists() ? Number((snap.data() as { currentCycle?: number })?.currentCycle) : NaN;
        return Number.isInteger(c) && c > 0 ? c : 1;
    },

    // Sets the active cycle. applyToCurrentWeek retags the pending week too.
    async setCurrentCycle(currentCycle: number, applyToCurrentWeek = false) {
        return invokeRpc("setCurrentCycle", { currentCycle, applyToCurrentWeek });
    },

    async toggleDayVoting(weekId: string, enabled: boolean, resetVotes = false) {
        return invokeRpc("toggleDayVoting", { weekId, enabled, resetVotes });
    },

    async submitDayVote(weekId: string, userName: string, day: "الخميس" | "الجمعة" | "الخميس والجمعة") {
        return invokeRpc("submitDayVote", { weekId, userName, day });
    },

    async applyDayVoteResult(weekId: string, preferredDay?: "الخميس" | "الجمعة") {
        return invokeRpc("applyDayVoteResult", { weekId, preferredDay: preferredDay || null });
    },

    // Restaurant Voting
    async startRestaurantVoting(weekId: string, candidates: [string, string, string]) {
        return invokeRpc("startRestaurantVoting", { weekId, candidates });
    },

    async submitRestaurantVote(weekId: string, restaurant: string) {
        return invokeRpc("submitRestaurantVote", { weekId, restaurant });
    },

    async endRestaurantVoting(weekId: string) {
        return invokeRpc("endRestaurantVoting", { weekId });
    },

    async overrideRestaurantResult(weekId: string, restaurant: string) {
        return invokeRpc("overrideRestaurantResult", { weekId, restaurant });
    },

    async cancelRestaurantVoting(weekId: string) {
        return invokeRpc("cancelRestaurantVoting", { weekId });
    },

    // Secret Dean Power
    async secretlyChangeKing(weekId: string, newKingName: string | null) {
        return invokeRpc("secretlyChangeKing", { weekId, newKingName });
    },

    async toggleRatingEnabled(weekId: string, enabled: boolean) {
        return invokeRpc("toggleRatingEnabled", { weekId, enabled });
    },

    async submitRating(payload: {
        weekId: string;
        rating: number;
        reviewText?: string;
        restaurantName?: string;
    }) {
        // The backend expects `score` and `userName` in the payload.
        // `invokeRpc` automatically adds `userName` from auth context.
        const { weekId, rating, reviewText, restaurantName } = payload;
        return invokeRpc("submitRating", {
            weekId,
            score: rating, // Translate from client-facing 'rating' to backend 'score'
            reviewText,
            restaurantName,
        });
    },

    // Dean only
    async getAllRatingsForWeek(weekId: string): Promise<Rating[]> {
        const q = query(collection(db, "ratings"), where("weekId", "==", weekId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating));
    },

    // Read the whole ratings collection ONCE and group by week. Callers that need
    // ratings for many weeks use this instead of firing one query per week (N+1).
    async getRatingsGroupedByWeek(): Promise<Map<string, Rating[]>> {
        const snap = await getDocs(collection(db, "ratings"));
        const map = new Map<string, Rating[]>();
        snap.docs.forEach((d) => {
            const r = { id: d.id, ...d.data() } as Rating;
            const arr = map.get(r.weekId);
            if (arr) arr.push(r);
            else map.set(r.weekId, [r]);
        });
        return map;
    },

    listenToRatingsForWeek(weekId: string, callback: (ratings: Rating[]) => void) {
        const q = query(collection(db, "ratings"), where("weekId", "==", weekId));
        return onSnapshot(q, (snap) => {
            const ratings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating));
            callback(ratings);
        });
    },

    async hasUserRated(weekId: string, userName: string): Promise<boolean> {
        const q = query(
            collection(db, "ratings"),
            where("weekId", "==", weekId),
            where("userName", "==", userName),
            limit(1)
        );
        const snap = await getDocs(q);
        return !snap.empty;
    },

    async submitBathroomRating(
        weekId: string,
        userName: string,
        score: number,
        bathroomName?: string,
        restaurantName?: string | null
    ) {
        return invokeRpc("submitBathroomRating", { weekId, userName, score, bathroomName, restaurantName });
    },

    async getBathroomRatingsForWeek(weekId: string): Promise<BathroomRating[]> {
        const q = query(collection(db, "bathroomRatings"), where("weekId", "==", weekId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BathroomRating));
    },

    async getAllBathroomRatings(): Promise<BathroomRating[]> {
        const snap = await getDocs(collection(db, "bathroomRatings"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BathroomRating));
    },

    async hasUserRatedBathroom(weekId: string, userName: string): Promise<boolean> {
        const q = query(
            collection(db, "bathroomRatings"),
            where("weekId", "==", weekId),
            where("userName", "==", userName),
            limit(1)
        );
        const snap = await getDocs(q);
        return !snap.empty;
    },

    async completeWeek(weekId: string) {
        return invokeRpc("completeWeek", { weekId });
    },

    async uncompleteWeek(weekId: string) {
        return invokeRpc("uncompleteWeek", { weekId });
    },

    // Get previous week to check for consecutive restaurant rule
    async getPreviousWeek(): Promise<WeekSession | null> {
        const q = query(
            collection(db, "weeks"),
            where("status", "==", "completed")
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            const weeks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeekSession));
            // Sort client-side to avoid needing a composite index in Firestore for just this query
            weeks.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            return weeks[0];
        }
        return null;
    },

    async getLeaderboardData(cycleNumber: number): Promise<{ week: WeekSession, averageScore: number }[]> {
        const q = query(
            collection(db, "weeks"),
            where("status", "==", "completed"),
            where("cycleNumber", "==", cycleNumber)
        );
        const weeksSnap = await getDocs(q);
        const weeks = weeksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeekSession));

        // Unified rule: only real competitive outings (no historical, random, or junk).
        const activeWeeks = weeks.filter(isCompetitiveWeek);

        // One grouped ratings read instead of one query per week (was N+1).
        const grouped = await this.getRatingsGroupedByWeek();
        const leaderboard = activeWeeks.map((week) => {
            const ratings = grouped.get(week.id) || [];
            let averageScore = 0;
            if (ratings.length > 0) {
                averageScore = ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length;
            }
            return { week, averageScore };
        });

        // Sort by average score descending
        return leaderboard.sort((a, b) => b.averageScore - a.averageScore);
    },

    // Fetch completed weeks WITH their ratings, once. Callers that don't need the
    // raw ratings just ignore that field — this avoids the old double-fetch where
    // getRatingsExplorerData re-queried ratings for every week a second time.
    async getCompletedWeeksWithRatings(): Promise<{ week: WeekSession, averageScore: number, ratings: Rating[] }[]> {
        const q = query(
            collection(db, "weeks"),
            where("status", "==", "completed")
        );
        const snap = await getDocs(q);
        const weeks = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeekSession));

        // One grouped ratings read instead of one query per week (was N+1).
        const grouped = await this.getRatingsGroupedByWeek();
        const results = weeks.map((week) => {
            const ratings = grouped.get(week.id) || [];
            let averageScore = 0;
            if (ratings.length > 0) {
                averageScore = ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length;
            }
            return { week, averageScore, ratings };
        });

        return results.sort((a, b) => a.week.createdAt.toMillis() - b.week.createdAt.toMillis());
    },

    async getAllCompletedWeeks(): Promise<{ week: WeekSession, averageScore: number }[]> {
        const full = await this.getCompletedWeeksWithRatings();
        return full.map(({ week, averageScore }) => ({ week, averageScore }));
    },

    async getRatingsExplorerData(): Promise<RatingExplorerWeek[]> {
        // Reuse the ratings already fetched instead of querying them a second time.
        return this.getCompletedWeeksWithRatings();
    },

    async getMemberProfile(memberName: string): Promise<MemberProfileData> {
        const [allWeeksWithAvg, ratingsSnap] = await Promise.all([
            this.getAllCompletedWeeks(),
            getDocs(collection(db, "ratings")),
        ]);

        const allRatings = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Rating));
        // Only competitive outings count toward a member's attendance/participation
        // (random & junk weeks are organizational and must not pollute profiles).
        const completedWeeks = allWeeksWithAvg.map(w => w.week).filter(isCompetitiveWeek);
        const memberWeeks = completedWeeks.filter(week => {
            if (week.king === memberName) return true;
            if ((week.responded || []).includes(memberName)) return true;
            return false;
        });

        const attendedWeeks = memberWeeks.filter(week =>
            week.king === memberName || ((week.responded || []).includes(memberName) && !(week.absentees || []).includes(memberName))
        );
        const absentWeeks = memberWeeks.filter(week =>
            (week.responded || []).includes(memberName) && (week.absentees || []).includes(memberName)
        );
        const attendanceRate = memberWeeks.length > 0 ? Math.round((attendedWeeks.length / memberWeeks.length) * 100) : 0;

        const kingWeeks = allWeeksWithAvg.filter(({ week }) => week.king === memberName && week.status === "completed");
        const kingWeekScores = kingWeeks.filter(w => w.averageScore > 0);
        const averageWeekScoreAsKing = kingWeekScores.length > 0
            ? Math.round((kingWeekScores.reduce((sum, w) => sum + w.averageScore, 0) / kingWeekScores.length) * 10) / 10
            : 0;

        const bestKingWeek = kingWeekScores.length > 0
            ? [...kingWeekScores].sort((a, b) => b.averageScore - a.averageScore)[0]
            : null;
        const worstKingWeek = kingWeekScores.length > 0
            ? [...kingWeekScores].sort((a, b) => a.averageScore - b.averageScore)[0]
            : null;

        const memberGivenRatings = allRatings.filter(r => r.userName === memberName);
        const averageRatingGiven = memberGivenRatings.length > 0
            ? Math.round((memberGivenRatings.reduce((sum, r) => sum + r.score, 0) / memberGivenRatings.length) * 10) / 10
            : 0;

        const completedWeeksById = new Map(completedWeeks.map((week) => [week.id, week]));
        const restaurantRatings = memberGivenRatings
            .map((rating) => {
                const week = completedWeeksById.get(rating.weekId);
                if (!week) return null;
                return {
                    restaurant: week.restaurant || "غير محدد",
                    score: rating.score,
                    weekId: rating.weekId,
                };
            })
            .filter((item): item is { restaurant: string; score: number; weekId: string } => item !== null)
            .sort((a, b) => b.score - a.score || a.restaurant.localeCompare(b.restaurant, "ar"));

        let thursdayCount = 0;
        let fridayCount = 0;
        for (const week of memberWeeks) {
            if (week.day === "الخميس") thursdayCount++;
            if (week.day === "الجمعة") fridayCount++;
        }
        const favoriteDay: "الخميس" | "الجمعة" | "تعادل" =
            thursdayCount === fridayCount ? "تعادل" : thursdayCount > fridayCount ? "الخميس" : "الجمعة";

        const lastSeenWeek = [...attendedWeeks].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];

        return {
            name: memberName,
            totalWeeksParticipated: memberWeeks.length,
            attendanceRate,
            attendedCount: attendedWeeks.length,
            absentCount: absentWeeks.length,
            timesAsKing: kingWeeks.length,
            ratingsGiven: memberGivenRatings.length,
            averageRatingGiven,
            averageWeekScoreAsKing,
            bestWeekAsKing: bestKingWeek ? {
                weekId: bestKingWeek.week.id,
                restaurant: bestKingWeek.week.restaurant || null,
                score: Math.round(bestKingWeek.averageScore * 10) / 10
            } : null,
            worstWeekAsKing: worstKingWeek ? {
                weekId: worstKingWeek.week.id,
                restaurant: worstKingWeek.week.restaurant || null,
                score: Math.round(worstKingWeek.averageScore * 10) / 10
            } : null,
            favoriteDay,
            lastSeenOutingAt: lastSeenWeek?.createdAt || null,
            restaurantRatings,
        };
    },

    async resetCycleLeaderboard(currentWeekId: string, newCycleNumber: number) {
        return invokeRpc("resetCycleLeaderboard", { weekId: currentWeekId, newCycleNumber });
    },

    async setWeekCycle(weekId: string, cycleNumber: number) {
        return invokeRpc("setWeekCycle", { weekId, cycleNumber });
    },

    async bulkSetWeekCycle(weekIds: string[], cycleNumber: number) {
        return invokeRpc("bulkSetWeekCycle", { weekIds, cycleNumber });
    },

    // Cycle Organizer — edit any subset of a week's metadata.
    async updateWeekMeta(weekId: string, updates: {
        cycleNumber?: number;
        weekNumber?: number;
        isRandom?: boolean;
        king?: string | null;
        status?: "completed" | "pending" | "skipped";
    }) {
        return invokeRpc("updateWeekMeta", { weekId, updates });
    },

    async deleteWeekById(weekId: string) {
        return invokeRpc("deleteWeekById", { weekId });
    },

    // Dean-only read-only health scan — surfaces silent data problems.
    async checkDataIntegrity(): Promise<DataIntegrityReport> {
        return invokeRpc("checkDataIntegrity");
    },

    // Fetch ALL weeks (any status) for the organizer — raw, unfiltered.
    async getAllWeeksRaw(): Promise<WeekSession[]> {
        const snap = await getDocs(collection(db, "weeks"));
        const weeks = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeekSession));
        return weeks.sort((a, b) => {
            const am = a.createdAt?.toMillis?.() ?? 0;
            const bm = b.createdAt?.toMillis?.() ?? 0;
            return am - bm;
        });
    },

    async getAllUsers() {
        return invokeRpc("getAllUsers");
    },

    async updateUserStandaloneStatus(userName: string, isStandalone: boolean) {
        return invokeRpc("updateUserStandaloneStatus", { userName, isStandalone });
    },

    async updatePushSubscription(userName: string, subscription: any) {
        return invokeRpc("updatePushSubscription", { userName, subscription });
    },

    async getPushSubscriptions(usernames?: string[]): Promise<any[]> {
        const result = await invokeRpc("getPushSubscriptions", { usernames });
        return Array.isArray(result) ? result : [];
    },

    // --- Password Management Features ---

    async requestPasswordReset(userName: string): Promise<void> {
        await invokeRpc("requestPasswordReset", { userName });
    },
    async resetPasswordWithCode(userName: string, code: string, newPassword: string): Promise<void> {
        await invokeRpc("resetPasswordWithCode", { userName, code, newPassword });
    },

    async changePassword(userName: string, currentPassword: string, newPassword: string): Promise<void> {
        await invokeRpc("changePassword", { userName, currentPassword, newPassword });
    },

    async updateProfileCustomization(
        userName: string,
        nickName: string,
        profileImage: string | null,
        showProfileImage: boolean
    ): Promise<{ nickName: string; profileImage: string | null; showProfileImage: boolean }> {
        return invokeRpc("updateProfileCustomization", { userName, nickName, profileImage, showProfileImage });
    },

    async getUsersWithResetCodes(): Promise<{ id: string, name: string, resetCode: string }[]> {
        const result = await invokeRpc("getUsersWithResetCodes");
        return Array.isArray(result) ? result : [];
    },

    // --- Suggestions (Anonymous, Dean-only visible) ---
    async submitSuggestion(text: string) {
        return invokeRpc("submitSuggestion", { text });
    },

    async getAllSuggestions(): Promise<Suggestion[]> {
        const snap = await getDocs(collection(db, "suggestions"));
        const suggestions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
        return suggestions.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    },

    // --- Public Chat Board ---
    async sendChatMessage(userName: string, text: string) {
        return invokeRpc("sendChatMessage", { userName, text });
    },

    listenToChatMessages(callback: (messages: ChatMessage[]) => void) {
        const q = query(collection(db, "chatMessages"), orderBy("createdAt", "desc"), limit(50));
        return onSnapshot(q, (snap) => {
            const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            callback(messages);
        });
    },

    listenToPublicUserProfiles(callback: (profiles: PublicUserProfile[]) => void) {
        let stopped = false;

        const fetchProfiles = async () => {
            try {
                const result = await invokeRpc("getPublicUserProfiles");
                if (!stopped && Array.isArray(result)) {
                    callback(result as PublicUserProfile[]);
                }
            } catch (error) {
                console.error("Failed to fetch public user profiles", error);
            }
        };

        void fetchProfiles();
        const intervalId = window.setInterval(fetchProfiles, 10000);

        return () => {
            stopped = true;
            window.clearInterval(intervalId);
        };
    },

    // --- Future Feature Voting ---
    async submitFeatureVote(featureId: string, vote: "yes" | "no" | null) {
        return invokeRpc("submitFeatureVote", { featureId, vote });
    },

    async setFeatureRemoved(featureId: string, removed: boolean) {
        return invokeRpc("setFeatureRemoved", { featureId, removed });
    },

    listenToFeatureFeedback(callback: (map: Record<string, FeatureFeedbackEntry>) => void) {
        return onSnapshot(collection(db, "featureFeedback"), (snap) => {
            const next: Record<string, FeatureFeedbackEntry> = {};
            snap.forEach((doc) => {
                const data = doc.data() as any;
                next[doc.id] = {
                    votes: (data?.votes as Record<string, "yes" | "no">) || {},
                    removed: Boolean(data?.removed),
                };
            });
            callback(next);
        });
    },

    // --- Member Activity Tracking (feature suggested by هشام) ---
    async recordActivity(tab: string, seconds: number) {
        return invokeRpc("recordActivity", { tab, seconds });
    },

    /**
     * Reads /userActivity and returns per-member activity for the given month
     * (defaults to the current month). totalSeconds → minutes, and the tab
     * with the most accumulated time is the member's favourite page.
     */
    async getActivityStats(monthKey?: string): Promise<MemberActivityStat[]> {
        const month = monthKey || new Date().toISOString().slice(0, 7);
        const snap = await getDocs(collection(db, "userActivity"));

        const TAB_LABELS: Record<string, string> = {
            week: "الأسبوع",
            leaderboard: "المتصدرين",
            bathroom: "الحمامات",
            map: "الخريطة",
            more: "المزيد",
        };

        const stats: MemberActivityStat[] = [];
        snap.forEach((doc) => {
            const data = doc.data() as any;
            const userName: string = data?.userName || doc.id;
            const monthly = data?.monthly?.[month] || {};
            const totalSeconds: number = Number(monthly?.totalSeconds) || 0;
            const tabSeconds: Record<string, number> = monthly?.tabSeconds || {};

            let favoriteTab: string | null = null;
            let favoriteSeconds = 0;
            for (const [tab, secs] of Object.entries(tabSeconds)) {
                const s = Number(secs) || 0;
                if (s > favoriteSeconds) {
                    favoriteSeconds = s;
                    favoriteTab = tab;
                }
            }

            const lastSeenAt = data?.lastSeenAt instanceof Timestamp ? data.lastSeenAt : null;

            stats.push({
                userName,
                totalMinutes: Math.round(totalSeconds / 60),
                totalSeconds,
                favoriteTab,
                favoriteTabLabel: favoriteTab ? (TAB_LABELS[favoriteTab] || favoriteTab) : null,
                lastSeenAt,
            });
        });

        return stats.sort((a, b) => b.totalSeconds - a.totalSeconds);
    },

    // --- Visit Tracking ---
    async recordVisit() {
        return invokeRpc("recordVisit");
    },

    async getVisitStats(): Promise<{ total: number; today: number; thisWeek: number; thisMonth: number }> {
        const snap = await getDocs(collection(db, "siteVisits"));
        const total = snap.size;
        const today = new Date().toISOString().split("T")[0];
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

        let todayCount = 0;
        let weekCount = 0;
        let monthCount = 0;

        snap.forEach(doc => {
            const d = doc.data().date;
            if (d === today) todayCount++;
            if (d >= weekAgo) weekCount++;
            if (d >= monthStart) monthCount++;
        });

        return { total, today: todayCount, thisWeek: weekCount, thisMonth: monthCount };
    },

    // --- Comprehensive Statistics ---
    async getStatistics() {
        // 1. Get all weeks
        const weeksSnap = await getDocs(collection(db, "weeks"));
        const allWeeks = weeksSnap.docs.map(d => ({ id: d.id, ...d.data() } as WeekSession));
        // Random/junk weeks are organizational filler — fully excluded from every
        // statistic (king rankings, cycle averages, attendance math, etc.).
        // A single junk cycle (e.g. 999) used to skew maxCycle & comparisons.
        const completedWeeks = allWeeks.filter(w => w.status === "completed" && isCompetitiveWeek(w));
        const pendingWeeks = allWeeks.filter(w => w.status === "pending" && isCompetitiveWeek(w));

        // 2. Get all ratings
        const ratingsSnap = await getDocs(collection(db, "ratings"));
        const allRatings = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Rating));

        // 3. Get suggestions count
        const suggestionsSnap = await getDocs(collection(db, "suggestions"));
        const suggestionsCount = suggestionsSnap.size;

        // 4. Visit stats
        const visitStats = await this.getVisitStats();

        const sortedWeeks = [...completedWeeks].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

        const attendedCountForWeek = (week: WeekSession): number => {
            return VALID_NAMES.filter((name) => {
                if (week.king === name) return true;
                return (week.responded || []).includes(name) && !(week.absentees || []).includes(name);
            }).length;
        };

        // Calculate Week Averages
        const weekAverages: Record<string, number> = {};
        for (const week of completedWeeks) {
            const weekRt = allRatings.filter(r => r.weekId === week.id);
            if (weekRt.length > 0) {
                weekAverages[week.id] = weekRt.reduce((acc, r) => acc + r.score, 0) / weekRt.length;
            }
        }

        // --- Compute member stats ---
        const memberStats: Record<string, {
            timesAsKing: number;
            attended: number;
            absent: number;
            totalWeeks: number;
            ratingsGiven: number;
        }> = {};

        for (const name of VALID_NAMES) {
            memberStats[name] = { timesAsKing: 0, attended: 0, absent: 0, totalWeeks: 0, ratingsGiven: 0 };
        }

        for (const week of completedWeeks) {
            if (week.king && memberStats[week.king]) {
                memberStats[week.king].timesAsKing++;
            }
            for (const name of VALID_NAMES) {
                if (name === week.king) {
                    memberStats[name].attended++;
                    memberStats[name].totalWeeks++;
                } else if ((week.responded || []).includes(name)) {
                    memberStats[name].totalWeeks++;
                    if ((week.absentees || []).includes(name)) {
                        memberStats[name].absent++;
                    } else {
                        memberStats[name].attended++;
                    }
                }
            }
        }

        // Count ratings per user
        for (const rating of allRatings) {
            if (rating.userName !== "System_Import" && memberStats[rating.userName]) {
                memberStats[rating.userName].ratingsGiven++;
            }
        }

        // --- Restaurant stats ---
        const restaurantCounts: Record<string, number> = {};
        for (const week of completedWeeks) {
            if (week.restaurant) {
                restaurantCounts[week.restaurant] = (restaurantCounts[week.restaurant] || 0) + 1;
            }
        }
        const sortedRestaurants = Object.entries(restaurantCounts).sort((a, b) => b[1] - a[1]);
        const uniqueRestaurants = Object.keys(restaurantCounts).length;

        // --- Day preference stats ---
        let thursdayCount = 0;
        let fridayCount = 0;
        for (const week of completedWeeks) {
            if (week.day === "الخميس") thursdayCount++;
            else if (week.day === "الجمعة") fridayCount++;
        }

        // --- Cycle stats ---
        const maxCycle = completedWeeks.reduce((max, w) => Math.max(max, w.cycleNumber || 1), 1);

        // --- Fun facts & Detailed Ratings Stats ---
        const mostAttendant = Object.entries(memberStats).sort((a, b) => b[1].attended - a[1].attended)[0];
        const mostAbsent = Object.entries(memberStats).sort((a, b) => b[1].absent - a[1].absent)[0];
        const mostKing = Object.entries(memberStats).sort((a, b) => b[1].timesAsKing - a[1].timesAsKing)[0];
        
        const avgAttendancePerWeek = completedWeeks.length > 0
            ? VALID_NAMES.reduce((sum, name) => sum + memberStats[name].attended, 0) / completedWeeks.length
            : 0;

        // Calculate King Averages
        const kingAverageScores: Record<string, { sum: number; count: number }> = {};
        for (const week of completedWeeks) {
            if (week.king && weekAverages[week.id] !== undefined) {
                if (!kingAverageScores[week.king]) kingAverageScores[week.king] = { sum: 0, count: 0 };
                kingAverageScores[week.king].sum += weekAverages[week.id];
                kingAverageScores[week.king].count++;
            }
        }

        let highestRatedKing = null;
        let lowestRatedKing = null;
        let maxAvg = -1;
        let minAvg = 999;
        for (const [king, data] of Object.entries(kingAverageScores)) {
            if (data.count === 0) continue;
            const avg = data.sum / data.count;
            if (avg > maxAvg) { maxAvg = avg; highestRatedKing = { name: king, score: avg }; }
            if (avg < minAvg) { minAvg = avg; lowestRatedKing = { name: king, score: avg }; }
        }

        // Calculate Rater Habits
        const raterPicky: Record<string, { sum: number; count: number }> = {};
        
        for (const rating of allRatings) {
            if (rating.userName !== "System_Import") {
                if (VALID_NAMES.includes(rating.userName)) {
                    if (!raterPicky[rating.userName]) raterPicky[rating.userName] = { sum: 0, count: 0 };
                    raterPicky[rating.userName].sum += rating.score;
                    raterPicky[rating.userName].count++;
                }
            }
        }

        // Global outings average: each outing has equal weight (not each individual rating).
        const completedWeekAverages = Object.values(weekAverages);
        const globalAverageRating = completedWeekAverages.length > 0
            ? completedWeekAverages.reduce((sum, value) => sum + value, 0) / completedWeekAverages.length
            : 0;

        let mostCriticalRater = null;
        let mostGenerousRater = null;
        let minRaterAvg = 999;
        let maxRaterAvg = -1;
        for (const [name, data] of Object.entries(raterPicky)) {
            if (data.count >= 2) { // minimum 2 ratings to be judged accurately
                const avg = data.sum / data.count;
                if (avg < minRaterAvg) { minRaterAvg = avg; mostCriticalRater = { name, score: avg }; }
                if (avg > maxRaterAvg) { maxRaterAvg = avg; mostGenerousRater = { name, score: avg }; }
            }
        }

        // --- Streaks ---
        const streaks: Record<string, { current: number; max: number }> = {};
        for (const name of VALID_NAMES) {
            streaks[name] = { current: 0, max: 0 };
        }
        for (const week of sortedWeeks) {
            for (const name of VALID_NAMES) {
                const wasPresent = name === week.king || 
                    ((week.responded || []).includes(name) && !(week.absentees || []).includes(name));
                if (wasPresent) {
                    streaks[name].current++;
                    streaks[name].max = Math.max(streaks[name].max, streaks[name].current);
                } else {
                    streaks[name].current = 0;
                }
            }
        }

        const longestStreak = Object.entries(streaks).sort((a, b) => b[1].max - a[1].max)[0];

        // --- First and last outing dates ---
        const firstOuting = sortedWeeks.length > 0 ? sortedWeeks[0] : null;
        const lastOuting = sortedWeeks.length > 0 ? sortedWeeks[sortedWeeks.length - 1] : null;

        // --- Days since first outing ---
        const daysSinceFirst = firstOuting 
            ? Math.floor((Date.now() - firstOuting.createdAt.toMillis()) / (1000 * 60 * 60 * 24))
            : 0;

        // --- Time windows ---
        const last4Weeks = sortedWeeks.slice(-4);
        const previous4Weeks = sortedWeeks.slice(-8, -4);
        const last8Weeks = sortedWeeks.slice(-8);

        const buildWindowStats = (weeks: WeekSession[]) => {
            if (weeks.length === 0) {
                return {
                    outings: 0,
                    avgAttendance: 0,
                    avgRating: 0,
                    attendanceRate: 0,
                };
            }

            const attendanceCounts = weeks.map((w) => attendedCountForWeek(w));
            const avgAttendance = attendanceCounts.reduce((s, n) => s + n, 0) / weeks.length;
            const avgRating = weeks.length > 0
                ? weeks.reduce((sum, w) => sum + (weekAverages[w.id] || 0), 0) / weeks.length
                : 0;
            const attendanceRate = (avgAttendance / VALID_NAMES.length) * 100;

            return {
                outings: weeks.length,
                avgAttendance: Math.round(avgAttendance * 10) / 10,
                avgRating: Math.round(avgRating * 10) / 10,
                attendanceRate: Math.round(attendanceRate),
            };
        };

        const timeWindows = {
            last4: buildWindowStats(last4Weeks),
            last8: buildWindowStats(last8Weeks),
            season: buildWindowStats(sortedWeeks),
        };

        // --- Member trends (recent vs previous 4) ---
        const memberTrends: Record<string, {
            recentAttendanceRate: number;
            previousAttendanceRate: number;
            attendanceDelta: number;
            recentGivenRating: number;
            previousGivenRating: number;
            ratingDelta: number;
        }> = {};

        const calcMemberAttendanceRate = (weeks: WeekSession[], name: string) => {
            if (weeks.length === 0) return 0;
            let considered = 0;
            let attended = 0;
            for (const week of weeks) {
                const involved = week.king === name || (week.responded || []).includes(name);
                if (!involved) continue;
                considered++;
                const present = week.king === name || ((week.responded || []).includes(name) && !(week.absentees || []).includes(name));
                if (present) attended++;
            }
            if (considered === 0) return 0;
            return Math.round((attended / considered) * 100);
        };

        const calcMemberGivenRating = (weeks: WeekSession[], name: string) => {
            if (weeks.length === 0) return 0;
            const weekIds = new Set(weeks.map((w) => w.id));
            const given = allRatings.filter((r) => r.userName === name && weekIds.has(r.weekId));
            if (given.length === 0) return 0;
            const avg = given.reduce((sum, r) => sum + r.score, 0) / given.length;
            return Math.round(avg * 10) / 10;
        };

        for (const name of VALID_NAMES) {
            const recentAttendanceRate = calcMemberAttendanceRate(last4Weeks, name);
            const previousAttendanceRate = calcMemberAttendanceRate(previous4Weeks, name);
            const recentGivenRating = calcMemberGivenRating(last4Weeks, name);
            const previousGivenRating = calcMemberGivenRating(previous4Weeks, name);
            memberTrends[name] = {
                recentAttendanceRate,
                previousAttendanceRate,
                attendanceDelta: recentAttendanceRate - previousAttendanceRate,
                recentGivenRating,
                previousGivenRating,
                ratingDelta: Math.round((recentGivenRating - previousGivenRating) * 10) / 10,
            };
        }

        // --- Restaurant intelligence ---
        const restaurantStatsMap: Record<string, { count: number; total: number; scores: number[] }> = {};
        for (const week of sortedWeeks) {
            const name = week.restaurant || "غير محدد";
            const score = weekAverages[week.id] || 0;
            if (!restaurantStatsMap[name]) restaurantStatsMap[name] = { count: 0, total: 0, scores: [] };
            restaurantStatsMap[name].count++;
            restaurantStatsMap[name].total += score;
            restaurantStatsMap[name].scores.push(score);
        }

        const calcStdDev = (arr: number[]) => {
            if (arr.length < 2) return 0;
            const mean = arr.reduce((s, n) => s + n, 0) / arr.length;
            const variance = arr.reduce((s, n) => s + (n - mean) ** 2, 0) / arr.length;
            return Math.sqrt(variance);
        };

        const restaurantIntelligence = Object.entries(restaurantStatsMap)
            .map(([restaurant, info]) => {
                const avgScore = info.count > 0 ? info.total / info.count : 0;
                const stability = calcStdDev(info.scores);
                return {
                    restaurant,
                    count: info.count,
                    avgScore: Math.round(avgScore * 10) / 10,
                    stability: Math.round(stability * 100) / 100,
                };
            })
            .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count);

        const retryCandidates = restaurantIntelligence
            .filter((r) => r.count >= 2 && r.avgScore >= 3.8)
            .slice(0, 3);

        const worstCandidates = [...restaurantIntelligence]
            .filter((r) => r.count >= 2)
            .sort((a, b) => a.avgScore - b.avgScore)
            .slice(0, 3);

        // --- King decision analytics ---
        const kingDecisionMap: Record<string, {
            outings: number;
            scoreSum: number;
            attendanceSum: number;
            thursdayOutings: number;
            fridayOutings: number;
            thursdayScoreSum: number;
            fridayScoreSum: number;
            thursdayAttendanceSum: number;
            fridayAttendanceSum: number;
        }> = {};

        for (const name of VALID_NAMES) {
            kingDecisionMap[name] = {
                outings: 0,
                scoreSum: 0,
                attendanceSum: 0,
                thursdayOutings: 0,
                fridayOutings: 0,
                thursdayScoreSum: 0,
                fridayScoreSum: 0,
                thursdayAttendanceSum: 0,
                fridayAttendanceSum: 0,
            };
        }

        for (const week of sortedWeeks) {
            if (!week.king || !kingDecisionMap[week.king]) continue;
            const k = kingDecisionMap[week.king];
            const attendance = attendedCountForWeek(week);
            const score = weekAverages[week.id] || 0;
            k.outings++;
            k.scoreSum += score;
            k.attendanceSum += attendance;
            if (week.day === "الخميس") {
                k.thursdayOutings++;
                k.thursdayScoreSum += score;
                k.thursdayAttendanceSum += attendance;
            }
            if (week.day === "الجمعة") {
                k.fridayOutings++;
                k.fridayScoreSum += score;
                k.fridayAttendanceSum += attendance;
            }
        }

        const kingDecisionAnalytics = Object.entries(kingDecisionMap)
            .map(([king, data]) => ({
                king,
                outings: data.outings,
                avgScore: data.outings > 0 ? Math.round((data.scoreSum / data.outings) * 10) / 10 : 0,
                avgAttendance: data.outings > 0 ? Math.round((data.attendanceSum / data.outings) * 10) / 10 : 0,
                thursdayOutings: data.thursdayOutings,
                fridayOutings: data.fridayOutings,
                thursdayAvgScore: data.thursdayOutings > 0 ? Math.round((data.thursdayScoreSum / data.thursdayOutings) * 10) / 10 : 0,
                fridayAvgScore: data.fridayOutings > 0 ? Math.round((data.fridayScoreSum / data.fridayOutings) * 10) / 10 : 0,
                thursdayAvgAttendance: data.thursdayOutings > 0 ? Math.round((data.thursdayAttendanceSum / data.thursdayOutings) * 10) / 10 : 0,
                fridayAvgAttendance: data.fridayOutings > 0 ? Math.round((data.fridayAttendanceSum / data.fridayOutings) * 10) / 10 : 0,
            }))
            .sort((a, b) => b.avgScore - a.avgScore);

        // --- Cycle health ---
        const responseRates = sortedWeeks.map((w) => {
            const required = VALID_NAMES.length - (w.king ? 1 : 0);
            const responded = (w.responded || []).length;
            if (required <= 0) return 1;
            return Math.min(1, responded / required);
        });
        const avgResponseRate = responseRates.length > 0
            ? (responseRates.reduce((s, n) => s + n, 0) / responseRates.length) * 100
            : 0;
        const fullyRespondedWeeks = sortedWeeks.filter((w) => {
            const required = VALID_NAMES.length - (w.king ? 1 : 0);
            return (w.responded || []).length >= required;
        }).length;

        const cycleHealth = {
            averageResponseCompletion: Math.round(avgResponseRate),
            fullyRespondedWeeks,
            totalCompletedWeeks: sortedWeeks.length,
            fullyRespondedRate: sortedWeeks.length > 0 ? Math.round((fullyRespondedWeeks / sortedWeeks.length) * 100) : 0,
        };

        // --- Comparisons ---
        const latestWeek = sortedWeeks.length > 0 ? sortedWeeks[sortedWeeks.length - 1] : null;
        const prevWeek = sortedWeeks.length > 1 ? sortedWeeks[sortedWeeks.length - 2] : null;

        const byCycle: Record<number, WeekSession[]> = {};
        for (const week of sortedWeeks) {
            const cycle = week.cycleNumber || 1;
            if (!byCycle[cycle]) byCycle[cycle] = [];
            byCycle[cycle].push(week);
        }
        const cycles = Object.keys(byCycle).map(Number).sort((a, b) => a - b);
        const currentCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null;
        const previousCycle = cycles.length > 1 ? cycles[cycles.length - 2] : null;

        const cycleAggregate = (cycleNumber: number | null) => {
            if (cycleNumber === null || !byCycle[cycleNumber]) return { outings: 0, avgRating: 0, avgAttendance: 0 };
            const weeks = byCycle[cycleNumber];
            if (weeks.length === 0) return { outings: 0, avgRating: 0, avgAttendance: 0 };
            const avgRating = weeks.reduce((s, w) => s + (weekAverages[w.id] || 0), 0) / weeks.length;
            const avgAttendance = weeks.reduce((s, w) => s + attendedCountForWeek(w), 0) / weeks.length;
            return {
                outings: weeks.length,
                avgRating: Math.round(avgRating * 10) / 10,
                avgAttendance: Math.round(avgAttendance * 10) / 10,
            };
        };

        const currentCycleAgg = cycleAggregate(currentCycle);
        const previousCycleAgg = cycleAggregate(previousCycle);

        const comparisons = {
            lastWeekVsPrevious: latestWeek && prevWeek ? {
                attendanceDelta: attendedCountForWeek(latestWeek) - attendedCountForWeek(prevWeek),
                ratingDelta: Math.round(((weekAverages[latestWeek.id] || 0) - (weekAverages[prevWeek.id] || 0)) * 10) / 10,
            } : null,
            currentVsPreviousCycle: currentCycle && previousCycle ? {
                currentCycle,
                previousCycle,
                attendanceDelta: Math.round((currentCycleAgg.avgAttendance - previousCycleAgg.avgAttendance) * 10) / 10,
                ratingDelta: Math.round((currentCycleAgg.avgRating - previousCycleAgg.avgRating) * 10) / 10,
            } : null,
        };

        // --- Prediction (simple heuristic) ---
        const currentWeek = pendingWeeks.length > 0 ? pendingWeeks[0] : null;
        const dayHistorical = {
            thursdayAttendanceAvg: thursdayCount > 0
                ? Math.round((sortedWeeks.filter(w => w.day === "الخميس").reduce((s, w) => s + attendedCountForWeek(w), 0) / thursdayCount) * 10) / 10
                : 0,
            fridayAttendanceAvg: fridayCount > 0
                ? Math.round((sortedWeeks.filter(w => w.day === "الجمعة").reduce((s, w) => s + attendedCountForWeek(w), 0) / fridayCount) * 10) / 10
                : 0,
        };

        let prediction: { expectedAttendance: number; expectedRating: number; confidence: "low" | "medium" | "high" } | null = null;
        if (currentWeek) {
            let expectedAttendance = Math.round(avgAttendancePerWeek * 10) / 10;
            let expectedRating = Math.round(globalAverageRating * 10) / 10;
            let confidence: "low" | "medium" | "high" = "low";

            if (currentWeek.day === "الخميس" && dayHistorical.thursdayAttendanceAvg > 0) expectedAttendance = dayHistorical.thursdayAttendanceAvg;
            if (currentWeek.day === "الجمعة" && dayHistorical.fridayAttendanceAvg > 0) expectedAttendance = dayHistorical.fridayAttendanceAvg;

            if (currentWeek.king) {
                const kingData = kingDecisionAnalytics.find((k) => k.king === currentWeek.king);
                if (kingData && kingData.outings >= 2) {
                    expectedRating = kingData.avgScore;
                    expectedAttendance = Math.round(((expectedAttendance + kingData.avgAttendance) / 2) * 10) / 10;
                    confidence = kingData.outings >= 4 ? "high" : "medium";
                } else {
                    confidence = "medium";
                }
            }

            prediction = { expectedAttendance, expectedRating, confidence };
        }

        // --- Smart insights ---
        const insights: string[] = [];
        if (timeWindows.last4.outings > 0 && timeWindows.last8.outings > 0) {
            const attendanceShift = timeWindows.last4.avgAttendance - timeWindows.last8.avgAttendance;
            if (attendanceShift >= 0.6) insights.push(`الحضور آخر 4 طلعات أعلى من المتوسط العام بـ ${attendanceShift.toFixed(1)} شخص`);
            if (attendanceShift <= -0.6) insights.push(`الحضور آخر 4 طلعات أقل من المتوسط العام بـ ${Math.abs(attendanceShift).toFixed(1)} شخص`);
        }
        if (comparisons.lastWeekVsPrevious) {
            const d = comparisons.lastWeekVsPrevious;
            if (d.ratingDelta >= 0.4) insights.push(`تقييم آخر طلعة تحسّن عن اللي قبلها بـ ${d.ratingDelta.toFixed(1)} نجمة`);
            if (d.ratingDelta <= -0.4) insights.push(`تقييم آخر طلعة انخفض عن اللي قبلها بـ ${Math.abs(d.ratingDelta).toFixed(1)} نجمة`);
        }
        if (retryCandidates.length > 0) {
            insights.push(`أفضل إعادة تجربة مقترحة: ${retryCandidates[0].restaurant} بمتوسط ${retryCandidates[0].avgScore}⭐`);
        }
        if (worstCandidates.length > 0) {
            insights.push(`مطعم يحتاج مراجعة قبل التكرار: ${worstCandidates[0].restaurant} بمتوسط ${worstCandidates[0].avgScore}⭐`);
        }
        if (cycleHealth.fullyRespondedRate < 70) {
            insights.push(`نسبة اكتمال ردود الحضور ${cycleHealth.fullyRespondedRate}% فقط، يفضّل زيادة التذكيرات المبكرة`);
        }
        if (prediction) {
            insights.push(`توقع الطلعة الحالية: حضور ${prediction.expectedAttendance} أشخاص وتقييم ${prediction.expectedRating}⭐ (ثقة ${prediction.confidence})`);
        }

        // --- Weekly trend series (for charts) ---
        const weeklyTrend = sortedWeeks.map((week) => ({
            weekId: week.id,
            weekNumber: week.weekNumber,
            cycleNumber: week.cycleNumber,
            day: week.day,
            restaurant: week.restaurant,
            king: week.king,
            avgRating: weekAverages[week.id] !== undefined
                ? Math.round(weekAverages[week.id] * 10) / 10
                : null,
            attendance: attendedCountForWeek(week),
        }));

        return {
            visitStats,
            totalOutings: completedWeeks.length,
            currentWeekActive: pendingWeeks.length > 0,
            totalCycles: maxCycle,
            memberStats,
            weeklyTrend,
            sortedRestaurants,
            uniqueRestaurants,
            thursdayCount,
            fridayCount,
            suggestionsCount,
            avgAttendancePerWeek: Math.round(avgAttendancePerWeek * 10) / 10,
            funFacts: {
                mostAttendant: mostAttendant ? { name: mostAttendant[0], count: mostAttendant[1].attended } : null,
                mostAbsent: mostAbsent ? { name: mostAbsent[0], count: mostAbsent[1].absent } : null,
                mostKing: mostKing ? { name: mostKing[0], count: mostKing[1].timesAsKing } : null,
                longestStreak: longestStreak ? { name: longestStreak[0], streak: longestStreak[1].max } : null,
                highestRatedKing: highestRatedKing ? { name: highestRatedKing.name, score: Math.round(highestRatedKing.score * 10) / 10 } : null,
                lowestRatedKing: lowestRatedKing && lowestRatedKing.name !== highestRatedKing?.name ? { name: lowestRatedKing.name, score: Math.round(lowestRatedKing.score * 10) / 10 } : null,
                mostCriticalRater: mostCriticalRater ? { name: mostCriticalRater.name, score: Math.round(mostCriticalRater.score * 10) / 10 } : null,
                mostGenerousRater: mostGenerousRater && mostGenerousRater.name !== mostCriticalRater?.name ? { name: mostGenerousRater.name, score: Math.round(mostGenerousRater.score * 10) / 10 } : null,
                globalAverageRating: Math.round(globalAverageRating * 10) / 10
            },
            streaks,
            daysSinceFirst,
            firstOutingDate: firstOuting?.createdAt || null,
            lastOutingDate: lastOuting?.createdAt || null,
            timeWindows,
            memberTrends,
            restaurantIntelligence: {
                ranked: restaurantIntelligence,
                retryCandidates,
                avoidCandidates: worstCandidates,
            },
            kingDecisionAnalytics,
            cycleHealth,
            comparisons,
            prediction,
            insights,
        };
    },

    async createTestUser() {
        return invokeRpc("createTestUser");
    },

    async createTestWeek() {
        return invokeRpc("createTestWeek");
    },
};
