import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';
import { hashPassword } from "@/lib/hash";

const VALID_NAMES_RPC = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
const WEEK_DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;
const STANDARD_OUTING_DAYS = ["الخميس", "الجمعة"] as const;
const Timestamp = admin.firestore.Timestamp;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, payload, auth } = body;

        // Skip auth check for public actions
        const publicActions = ["register", "requestPasswordReset", "resetPasswordWithCode", "login_upgrade", "recordVisit", "importHistory"];
        
        let userDocData: any = null;
        let authName = auth?.name;
        
        if (!publicActions.includes(action)) {
            if (!auth || !auth.name || !auth.token) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const userRef = adminDb.collection("users").doc(auth.name);
            const userSnap = await userRef.get();
            if (!userSnap.exists || userSnap.data()?.password !== auth.token) {
                return NextResponse.json({ error: "Unauthorized - Invalid Token" }, { status: 401 });
            }
            userDocData = userSnap.data();
        }

        const isAdmin = authName === "شوكا";

        switch (action) {
            // --- WEEKS ---
            case "startNewWeek":
                if (!isAdmin) throw new Error("Dean only");
                const newWeekRef = adminDb.collection("weeks").doc();
                const newWeek = {
                    king: payload.kingName,
                    isRandom: payload.isRandom,
                    cycleNumber: payload.cycleNumber,
                    weekNumber: payload.weekNumber,
                    day: null,
                    restaurant: null,
                    activity: null,
                    status: "pending",
                    ratingEnabled: false,
                    absentees: [],
                    responded: [],
                    createdAt: Timestamp.now()
                };
                await newWeekRef.set(newWeek);
                return NextResponse.json({ result: { id: newWeekRef.id, ...newWeek } });

            case "toggleAttendance":
                if (authName !== payload.userName && !isAdmin) throw new Error("Can only change your own attendance");
                const weekRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekSnap = await weekRef.get();
                if (!weekSnap.exists) throw new Error("Week not found");
                
                let { absentees = [], responded = [] } = weekSnap.data() as any;
                
                if (payload.isAbsent && !absentees.includes(payload.userName)) absentees.push(payload.userName);
                else if (!payload.isAbsent) absentees = absentees.filter((n: string) => n !== payload.userName);

                if (!responded.includes(payload.userName)) responded.push(payload.userName);

                await weekRef.update({ absentees, responded });
                
                const requiredCount = VALID_NAMES_RPC.length - 1;
                const justCompleted = responded.length >= requiredCount && ((weekSnap.data() as any).responded || []).length < requiredCount;
                return NextResponse.json({ result: justCompleted });

            case "setWeekChoices":
                const weekChoicesRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekChoicesSnap = await weekChoicesRef.get();
                if (!weekChoicesSnap.exists || (weekChoicesSnap.data() as any).king !== authName) {
                    if (!isAdmin) throw new Error("Only the King can make choices");
                }
                if (payload.day !== null && !WEEK_DAYS.includes(payload.day)) {
                    throw new Error("Invalid day");
                }
                // Only Dean can choose any day. Others are limited to Thursday/Friday.
                if (!isAdmin && payload.day !== null && !STANDARD_OUTING_DAYS.includes(payload.day)) {
                    throw new Error("Only the Dean can pick a non-standard day");
                }
                await weekChoicesRef.update({ day: payload.day, restaurant: payload.restaurant, activity: payload.activity });
                return NextResponse.json({ result: true });

            case "secretlyChangeKing":
            case "toggleRatingEnabled":
            case "completeWeek":
            case "resetCycleLeaderboard":
                if (!isAdmin) throw new Error("Dean only");
                const adminWeekRef = adminDb.collection("weeks").doc(payload.weekId);
                if (action === "secretlyChangeKing") await adminWeekRef.update({ king: payload.newKingName, isRandom: payload.newKingName === null });
                if (action === "toggleRatingEnabled") await adminWeekRef.update({ ratingEnabled: payload.enabled });
                if (action === "completeWeek") await adminWeekRef.update({ status: "completed" });
                if (action === "resetCycleLeaderboard") await adminWeekRef.update({ cycleNumber: payload.newCycleNumber });
                return NextResponse.json({ result: true });

            // --- RATINGS ---
            case "submitRating":
            case "submitBathroomRating":
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                if (payload.score < 1 || payload.score > 5) throw new Error("Invalid score");
                const collName = action === "submitRating" ? "ratings" : "bathroomRatings";
                const ratingRef = await adminDb.collection(collName).add({
                    weekId: payload.weekId,
                    userName: payload.userName,
                    score: payload.score,
                    createdAt: Timestamp.now()
                });
                return NextResponse.json({ result: ratingRef.id });

            // --- USERS & AUTH ---
            case "updateUserStandaloneStatus":
            case "updatePushSubscription":
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                const uRef = adminDb.collection("users").doc(payload.userName);
                if (action === "updateUserStandaloneStatus") await uRef.update({ isStandalone: payload.isStandalone });
                if (action === "updatePushSubscription") await uRef.update({ pushSubscription: JSON.stringify(payload.subscription) });
                return NextResponse.json({ result: true });

            case "requestPasswordReset":
                if (!VALID_NAMES_RPC.includes(payload.userName)) throw new Error("اسم غير مصرح به");
                const prRef = adminDb.collection("users").doc(payload.userName);
                const prSnap = await prRef.get();
                if (!prSnap.exists) throw new Error("المستخدم غير مسجل بعد");
                const code = Math.floor(1000 + Math.random() * 9000).toString();
                await prRef.update({ resetCode: code, resetCodeTimestamp: Date.now() });
                return NextResponse.json({ result: true });

            case "resetPasswordWithCode":
                if (!VALID_NAMES_RPC.includes(payload.userName)) throw new Error("اسم غير مصرح به");
                const rpRef = adminDb.collection("users").doc(payload.userName);
                const rpSnap = await rpRef.get();
                if (!rpSnap.exists) throw new Error("المستخدم غير مسجل");
                if ((rpSnap.data() as any).resetCode !== payload.code) throw new Error("رمز الاسترجاع خاطئ");
                if (Date.now() - (rpSnap.data() as any).resetCodeTimestamp > 15 * 60 * 1000) {
                    await rpRef.update({ resetCode: null, resetCodeTimestamp: null });
                    throw new Error("انتهت صلاحية الكود");
                }
                await rpRef.update({ password: await hashPassword(payload.newPassword), resetCode: null, resetCodeTimestamp: null });
                return NextResponse.json({ result: true });

            case "changePassword":
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                const cpRef = adminDb.collection("users").doc(payload.userName);
                const cpSnap = await cpRef.get();
                let validCp = false;
                if ((cpSnap.data() as any).password === payload.currentPassword) validCp = true;
                else if ((cpSnap.data() as any).password === await hashPassword(payload.currentPassword)) validCp = true;
                if (!validCp) throw new Error("كلمة المرور الحالية خاطئة");
                await cpRef.update({ password: await hashPassword(payload.newPassword) });
                return NextResponse.json({ result: true });
                
            case "register":
                if (!VALID_NAMES_RPC.includes(payload.name)) throw new Error("اسم غير مصرح به");
                const regRef = adminDb.collection("users").doc(payload.name);
                const regSnap = await regRef.get();
                if (regSnap.exists) throw new Error("المستخدم مسجل مسبقاً");
                const role = payload.name === "شوكا" ? "dean" : "user";
                const hp = await hashPassword(payload.password);
                await regRef.set({ name: payload.name, password: hp, role, registered: true });
                return NextResponse.json({ result: { name: payload.name, role, registered: true, token: hp } });

            case "login_upgrade": // Upgrades plain text to hashed on login
                const updRef = adminDb.collection("users").doc(payload.userName);
                const newHp = await hashPassword(payload.password);
                await updRef.update({ password: newHp });
                return NextResponse.json({ result: newHp });

            case "revokeDeanDevice":
                if (!isAdmin) throw new Error("Dean only");
                const deanRef = adminDb.collection("users").doc("شوكا");
                const deanDoc = await deanRef.get();
                if (!deanDoc.exists) return NextResponse.json({ result: true });
                
                let trustedDevices = (deanDoc.data() as any).trustedDevices || [];
                trustedDevices = trustedDevices.filter((d: any) => d.id !== payload.deviceId);
                await deanRef.update({ trustedDevices });
                return NextResponse.json({ result: true });

            // --- OTHERS ---
            case "submitSuggestion":
                await adminDb.collection("suggestions").add({ text: payload.text, createdAt: Timestamp.now() });
                return NextResponse.json({ result: true });

            case "sendChatMessage":
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                await adminDb.collection("chatMessages").add({ userName: payload.userName, text: payload.text, createdAt: Timestamp.now() });
                return NextResponse.json({ result: true });

            case "recordVisit":
                const today = new Date().toISOString().split("T")[0];
                await adminDb.collection("siteVisits").add({ date: today, timestamp: Timestamp.now() });
                return NextResponse.json({ result: true });
                
            case "importHistory":
                if (payload.deanPasscode !== "عبدالله") throw new Error("Unauthorized");
                const { weeksToImport } = payload;
                // Cleanup existing
                const wSnap = await adminDb.collection("weeks").get();
                for (const d of wSnap.docs) if (d.id.startsWith("history_week_")) await adminDb.collection("weeks").doc(d.id).delete();
                const rSnap = await adminDb.collection("ratings").get();
                for (const r of rSnap.docs) if (r.id.startsWith("rating_history_week_")) await adminDb.collection("ratings").doc(r.id).delete();
                // Import new
                let added = 0;
                for (const w of weeksToImport) {
                    const cAt = Timestamp.fromDate(new Date(`2025-01-0${w.weekNumber}T00:00:00Z`));
                    await adminDb.collection("weeks").doc(w.id).set({ ...w, createdAt: cAt });
                    await adminDb.collection("ratings").doc(`rating_${w.id}`).set({ weekId: w.id, userName: "System_Import", score: w.historicalAverageRating, createdAt: cAt });
                    added++;
                }
                return NextResponse.json({ result: added });

            default:
                return NextResponse.json({ error: "Unknown action" }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
