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
    }
};
