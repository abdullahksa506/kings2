import { db } from "./firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    Timestamp,
    onSnapshot
} from "firebase/firestore";
import { hashPassword, isHashed } from "./hash";

// Security verification helper
export async function verifyIdentity(userName: string): Promise<boolean> {
    if (typeof window === "undefined") return false; // Verify works only on client
    
    const storedToken = localStorage.getItem("king_user_token");
    if (!storedToken) return false;

    const userRef = doc(db, "users", userName);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    const dbPass = typeof userData.password === "string" ? userData.password : "";
    const token = typeof storedToken === "string" ? storedToken : "";
    if (dbPass === token) return true;
    const isHex64 = (s: string) => s.length === 64 && /^[a-f0-9]+$/i.test(s);
    if (isHex64(dbPass) && isHex64(token)) return dbPass.toLowerCase() === token.toLowerCase();
    return false;
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

export interface BathroomRating {
    id: string;
    weekId: string;
    userName: string;
    score: number; // 1 to 5
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
    text: string;
    createdAt: Timestamp;
}

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
}

export const VALID_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
export const MAX_BUDGET = 175;

export async function invokeRpc(action: string, payload: any = {}) {
    if (typeof window === "undefined") return null;
    const name = localStorage.getItem("king_user_name");
    const token = localStorage.getItem("king_user_token");

    const res = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload, auth: { name, token } })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || "حدث خطأ غير معروف");
    }
    return data.result;
}

export const services = {
    // Get active week or create new one if none exists
    async getCurrentWeek(): Promise<WeekSession | null> {
        const q = query(
            collection(db, "weeks"),
            where("status", "==", "pending"),
            limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            return { id: snap.docs[0].id, ...snap.docs[0].data() } as WeekSession;
        }
        return null;
    },

    // Listen to changes in the current active week
    listenToCurrentWeek(callback: (week: WeekSession | null) => void) {
        const q = query(
            collection(db, "weeks"),
            where("status", "==", "pending"),
            limit(1)
        );
        return onSnapshot(q, (snap) => {
            if (!snap.empty) {
                callback({ id: snap.docs[0].id, ...snap.docs[0].data() } as WeekSession);
            } else {
                callback(null);
            }
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

    // Secret Dean Power
    async secretlyChangeKing(weekId: string, newKingName: string | null) {
        return invokeRpc("secretlyChangeKing", { weekId, newKingName });
    },

    async toggleRatingEnabled(weekId: string, enabled: boolean) {
        return invokeRpc("toggleRatingEnabled", { weekId, enabled });
    },

    async submitRating(weekId: string, userName: string, score: number) {
        return invokeRpc("submitRating", { weekId, userName, score });
    },

    // Dean only
    async getAllRatingsForWeek(weekId: string): Promise<Rating[]> {
        const q = query(collection(db, "ratings"), where("weekId", "==", weekId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating));
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

    async submitBathroomRating(weekId: string, userName: string, score: number) {
        return invokeRpc("submitBathroomRating", { weekId, userName, score });
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

        // Filter out explicitly imported historical weeks from the active cycle leaderboard
        const activeWeeks = weeks.filter((w: any) => w.historicalAverageRating === undefined);

        const leaderboard = await Promise.all(activeWeeks.map(async (week) => {
            const ratings = await this.getAllRatingsForWeek(week.id);
            let averageScore = 0;
            if (ratings.length > 0) {
                averageScore = ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length;
            }
            return { week, averageScore };
        }));

        // Sort by average score descending
        return leaderboard.sort((a, b) => b.averageScore - a.averageScore);
    },

    async getAllCompletedWeeks(): Promise<{ week: WeekSession, averageScore: number }[]> {
        const q = query(
            collection(db, "weeks"),
            where("status", "==", "completed")
        );
        const snap = await getDocs(q);
        const weeks = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeekSession));

        const results = await Promise.all(weeks.map(async (week) => {
            const ratings = await this.getAllRatingsForWeek(week.id);
            let averageScore = 0;
            if (ratings.length > 0) {
                averageScore = ratings.reduce((acc, curr) => acc + curr.score, 0) / ratings.length;
            }
            return { week, averageScore };
        }));

        return results.sort((a, b) => a.week.createdAt.toMillis() - b.week.createdAt.toMillis());
    },

    async getRatingsExplorerData(): Promise<RatingExplorerWeek[]> {
        const completed = await this.getAllCompletedWeeks();
        const withRatings = await Promise.all(completed.map(async ({ week, averageScore }) => {
            const ratings = await this.getAllRatingsForWeek(week.id);
            return { week, averageScore, ratings };
        }));
        return withRatings;
    },

    async getMemberProfile(memberName: string): Promise<MemberProfileData> {
        const [allWeeksWithAvg, ratingsSnap] = await Promise.all([
            this.getAllCompletedWeeks(),
            getDocs(collection(db, "ratings")),
        ]);

        const allRatings = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Rating));
        const completedWeeks = allWeeksWithAvg.map(w => w.week);
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
        };
    },

    async resetCycleLeaderboard(currentWeekId: string, newCycleNumber: number) {
        return invokeRpc("resetCycleLeaderboard", { weekId: currentWeekId, newCycleNumber });
    },

    async getAllUsers() {
        const snap = await getDocs(collection(db, "users"));
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    },

    async updateUserStandaloneStatus(userName: string, isStandalone: boolean) {
        return invokeRpc("updateUserStandaloneStatus", { userName, isStandalone });
    },

    async updatePushSubscription(userName: string, subscription: any) {
        return invokeRpc("updatePushSubscription", { userName, subscription });
    },

    async getPushSubscriptions(usernames?: string[]): Promise<any[]> {
        let q = collection(db, "users") as any;
        if (usernames && usernames.length > 0) {
            q = query(collection(db, "users"), where("__name__", "in", usernames));
        }

        const snap = await getDocs(q);
        const subs: any[] = [];
        snap.forEach(doc => {
            const data = doc.data() as any;
            if (data.pushSubscription) {
                try {
                    subs.push(JSON.parse(data.pushSubscription));
                } catch (e) {
                    console.error("Failed to parse push subscription for user:", doc.id);
                }
            }
        });
        return subs;
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

    async getUsersWithResetCodes(): Promise<{ id: string, name: string, resetCode: string }[]> {
        const usersSnap = await getDocs(collection(db, "users"));
        const requests: { id: string, name: string, resetCode: string }[] = [];
        const now = Date.now();
        const FIFTEEN_MINUTES = 15 * 60 * 1000;

        for (const d of usersSnap.docs) {
            const data = d.data();
            if (data.resetCode) {
                const timestamp = data.resetCodeTimestamp;
                if (timestamp && (now - timestamp > FIFTEEN_MINUTES)) {
                    // Expired - clear from Firestore
                    await updateDoc(doc(db, "users", d.id), { resetCode: null, resetCodeTimestamp: null });
                } else {
                    requests.push({
                        id: d.id,
                        name: data.name || d.id,
                        resetCode: data.resetCode
                    });
                }
            }
        }

        return requests;
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
        const completedWeeks = allWeeks.filter(w => w.status === "completed");
        const pendingWeeks = allWeeks.filter(w => w.status === "pending");

        // 2. Get all ratings
        const ratingsSnap = await getDocs(collection(db, "ratings"));
        const allRatings = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Rating));

        // 3. Get chat messages count
        const chatSnap = await getDocs(collection(db, "chatMessages"));
        const chatCount = chatSnap.size;
        
        // 4. Get suggestions count
        const suggestionsSnap = await getDocs(collection(db, "suggestions"));
        const suggestionsCount = suggestionsSnap.size;

        // 5. Visit stats
        const visitStats = await this.getVisitStats();

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

        // Calculate Week Averages
        const weekAverages: Record<string, number> = {};
        for (const week of completedWeeks) {
            const weekRt = allRatings.filter(r => r.weekId === week.id);
            if (weekRt.length > 0) {
                weekAverages[week.id] = weekRt.reduce((acc, r) => acc + r.score, 0) / weekRt.length;
            }
        }

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
        const sortedWeeks = [...completedWeeks].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
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

        // --- Chat activity per user ---
        const chatPerUser: Record<string, number> = {};
        chatSnap.forEach(d => {
            const name = d.data().userName;
            if (name) chatPerUser[name] = (chatPerUser[name] || 0) + 1;
        });
        const mostChatActive = Object.entries(chatPerUser).sort((a, b) => b[1] - a[1])[0];

        // --- First and last outing dates ---
        const firstOuting = sortedWeeks.length > 0 ? sortedWeeks[0] : null;
        const lastOuting = sortedWeeks.length > 0 ? sortedWeeks[sortedWeeks.length - 1] : null;

        // --- Days since first outing ---
        const daysSinceFirst = firstOuting 
            ? Math.floor((Date.now() - firstOuting.createdAt.toMillis()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
            visitStats,
            totalOutings: completedWeeks.length,
            currentWeekActive: pendingWeeks.length > 0,
            totalCycles: maxCycle,
            memberStats,
            sortedRestaurants,
            uniqueRestaurants,
            thursdayCount,
            fridayCount,
            chatCount,
            suggestionsCount,
            avgAttendancePerWeek: Math.round(avgAttendancePerWeek * 10) / 10,
            funFacts: {
                mostAttendant: mostAttendant ? { name: mostAttendant[0], count: mostAttendant[1].attended } : null,
                mostAbsent: mostAbsent ? { name: mostAbsent[0], count: mostAbsent[1].absent } : null,
                mostKing: mostKing ? { name: mostKing[0], count: mostKing[1].timesAsKing } : null,
                longestStreak: longestStreak ? { name: longestStreak[0], streak: longestStreak[1].max } : null,
                mostChatActive: mostChatActive ? { name: mostChatActive[0], count: mostChatActive[1] } : null,
                highestRatedKing: highestRatedKing ? { name: highestRatedKing.name, score: Math.round(highestRatedKing.score * 10) / 10 } : null,
                lowestRatedKing: lowestRatedKing && lowestRatedKing.name !== highestRatedKing?.name ? { name: lowestRatedKing.name, score: Math.round(lowestRatedKing.score * 10) / 10 } : null,
                mostCriticalRater: mostCriticalRater ? { name: mostCriticalRater.name, score: Math.round(mostCriticalRater.score * 10) / 10 } : null,
                mostGenerousRater: mostGenerousRater && mostGenerousRater.name !== mostCriticalRater?.name ? { name: mostGenerousRater.name, score: Math.round(mostGenerousRater.score * 10) / 10 } : null,
                globalAverageRating: Math.round(globalAverageRating * 10) / 10
            },
            streaks,
            chatPerUser,
            daysSinceFirst,
            firstOutingDate: firstOuting?.createdAt || null,
            lastOutingDate: lastOuting?.createdAt || null,
        };
    }
};
