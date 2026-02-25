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
    Timestamp
} from "firebase/firestore";

export interface WeekSession {
    id: string;
    king: string | null; // null if random week
    isRandom: boolean;
    cycleNumber: number; // e.g. cycle 1 is weeks 1-6
    weekNumber: number; // overall week number
    day: "الخميس" | "الجمعة" | null;
    restaurant: string | null;
    activity: string | null;
    status: "pending" | "completed" | "skipped";
    ratingEnabled: boolean;
    createdAt: Timestamp;
}

export interface Rating {
    id: string;
    weekId: string;
    userName: string;
    score: number; // 1 to 5
    createdAt: Timestamp;
}

export const VALID_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
export const MAX_BUDGET = 175;

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

    async startNewWeek(kingName: string | null, isRandom: boolean, cycleNumber: number, weekNumber: number) {
        const newWeekRef = doc(collection(db, "weeks"));
        const newWeek: Omit<WeekSession, "id"> = {
            king: kingName,
            isRandom,
            cycleNumber,
            weekNumber,
            day: null,
            restaurant: null,
            activity: null,
            status: "pending",
            ratingEnabled: false,
            createdAt: Timestamp.now()
        };
        await setDoc(newWeekRef, newWeek);
        return { id: newWeekRef.id, ...newWeek };
    },

    async setWeekChoices(weekId: string, day: "الخميس" | "الجمعة" | null, restaurant: string | null, activity: string | null) {
        // Note: Wed 8pm/10pm constraints will be validated in the UI before calling this, 
        // or we can add server-timestamp validation here.
        const weekRef = doc(db, "weeks", weekId);
        await updateDoc(weekRef, {
            day,
            restaurant,
            activity
        });
    },

    // Secret Dean Power
    async secretlyChangeKing(weekId: string, newKingName: string | null) {
        const weekRef = doc(db, "weeks", weekId);
        await updateDoc(weekRef, {
            king: newKingName,
            isRandom: newKingName === null
        });
    },

    async toggleRatingEnabled(weekId: string, enabled: boolean) {
        const weekRef = doc(db, "weeks", weekId);
        await updateDoc(weekRef, { ratingEnabled: enabled });
    },

    async submitRating(weekId: string, userName: string, score: number) {
        if (score < 1 || score > 5) throw new Error("Invalid score");
        const docRef = await addDoc(collection(db, "ratings"), {
            weekId,
            userName,
            score,
            createdAt: Timestamp.now()
        });
        return docRef.id;
    },

    // Dean only
    async getAllRatingsForWeek(weekId: string): Promise<Rating[]> {
        const q = query(collection(db, "ratings"), where("weekId", "==", weekId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating));
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

    async completeWeek(weekId: string) {
        const weekRef = doc(db, "weeks", weekId);
        await updateDoc(weekRef, { status: "completed" });
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

        const leaderboard = await Promise.all(weeks.map(async (week) => {
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

    async resetCycleLeaderboard(currentWeekId: string, newCycleNumber: number) {
        const weekRef = doc(db, "weeks", currentWeekId);
        await updateDoc(weekRef, { cycleNumber: newCycleNumber });
    },

    async getAllUsers() {
        const snap = await getDocs(collection(db, "users"));
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    },

    async updateUserPhone(userName: string, phone: string) {
        const userRef = doc(db, "users", userName);
        await updateDoc(userRef, { phoneNumber: phone });
    },

    async updatePushSubscription(userName: string, subscription: any) {
        const userRef = doc(db, "users", userName);
        await updateDoc(userRef, { pushSubscription: JSON.stringify(subscription) });
    },

    async getPushSubscriptions(usernames?: string[]): Promise<any[]> {
        let q = collection(db, "users") as any;
        if (usernames && usernames.length > 0) {
            q = query(collection(db, "users"), where("__name__", "in", usernames));
        }

        const snap = await getDocs(q);
        const subs: any[] = [];
        snap.forEach(doc => {
            const data = doc.data();
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
        if (!VALID_NAMES.includes(userName)) throw new Error("اسم غير مصرح به");

        const userRef = doc(db, "users", userName);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error("المستخدم غير مسجل بعد");
        }

        // Generate a 4-digit code
        const code = Math.floor(1000 + Math.random() * 9000).toString();

        await updateDoc(userRef, { resetCode: code, resetCodeTimestamp: Date.now() });
    },

    async resetPasswordWithCode(userName: string, code: string, newPassword: string): Promise<void> {
        if (!VALID_NAMES.includes(userName)) throw new Error("اسم غير مصرح به");

        const userRef = doc(db, "users", userName);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error("المستخدم غير مسجل بعد");
        }

        const data = userDoc.data();
        if (data.resetCode !== code) {
            throw new Error("رمز الاسترجاع خاطئ");
        }

        // Check if code is expired (15 minutes)
        const FIFTEEN_MINUTES = 15 * 60 * 1000;
        if (data.resetCodeTimestamp && (Date.now() - data.resetCodeTimestamp > FIFTEEN_MINUTES)) {
            await updateDoc(userRef, { resetCode: null, resetCodeTimestamp: null });
            throw new Error("انتهت صلاحية كود الاسترجاع. اطلب كود جديد.");
        }

        await updateDoc(userRef, {
            password: newPassword,
            resetCode: null,
            resetCodeTimestamp: null
        });
    },

    async changePassword(userName: string, currentPassword: string, newPassword: string): Promise<void> {
        if (!VALID_NAMES.includes(userName)) throw new Error("اسم غير مصرح به");

        const userRef = doc(db, "users", userName);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            throw new Error("المستخدم غير موجود");
        }

        const data = userDoc.data();
        if (data.password !== currentPassword) {
            throw new Error("كلمة المرور الحالية خاطئة");
        }

        await updateDoc(userRef, { password: newPassword });
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
    }
};
