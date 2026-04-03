import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';
import { hashPassword } from "@/lib/hash";

const VALID_NAMES_RPC = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
const WEEK_DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;
const STANDARD_OUTING_DAYS = ["الخميس", "الجمعة"] as const;
const Timestamp = admin.firestore.Timestamp;

function asTrimmedString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeAuthProfile(name: string, data: any) {
    return {
        name,
        role: data?.role,
        registered: Boolean(data?.registered),
        phoneNumber: typeof data?.phoneNumber === "string" ? data.phoneNumber : undefined,
        nickName: typeof data?.nickName === "string" ? data.nickName : undefined,
        profileImage: typeof data?.profileImage === "string" ? data.profileImage : null,
        showProfileImage: typeof data?.showProfileImage === "boolean" ? data.showProfileImage : true,
    };
}

/** يطابق التوكن مع كلمة المرور المخزنة (SHA-256 hex قد يختلف حرف كبير/صغير بين العميل والخادم) */
function authPasswordMatches(dbPassword: unknown, clientToken: unknown): boolean {
    if (typeof dbPassword !== "string" || typeof clientToken !== "string") return false;
    if (dbPassword === clientToken) return true;
    const isHex64 = (s: string) => s.length === 64 && /^[a-f0-9]+$/i.test(s);
    if (isHex64(dbPassword) && isHex64(clientToken)) {
        return dbPassword.toLowerCase() === clientToken.toLowerCase();
    }
    return false;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, payload, auth } = body;

        // Skip auth check for public actions
        const publicActions = [
            "register",
            "requestPasswordReset",
            "resetPasswordWithCode",
            "login_upgrade",
            "recordVisit",
            "importHistory",
            "login",
            "getRegisteredNamesCount",
            "getPublicUserProfiles"
        ];
        
        let userDocData: any = null;
        let authName = auth?.name;
        
        if (!publicActions.includes(action)) {
            if (!auth || !auth.name || !auth.token) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const userRef = adminDb.collection("users").doc(auth.name);
            const userSnap = await userRef.get();
            if (!userSnap.exists || !authPasswordMatches(userSnap.data()?.password, auth.token)) {
                return NextResponse.json({ error: "Unauthorized - Invalid Token" }, { status: 401 });
            }
            userDocData = userSnap.data();
        }

        const isAdmin = authName === "شوكا";

        const normalizeNickName = (value: unknown, fallback: string): string => {
            if (typeof value !== "string") return fallback;
            const cleaned = value.trim().replace(/\s+/g, " ");
            return cleaned || fallback;
        };

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
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                if (!Number.isInteger(payload.score) || payload.score < 1 || payload.score > 5) throw new Error("Invalid score");
                if (typeof payload.weekId !== "string" || !payload.weekId.trim()) throw new Error("Invalid week");

                const submitWeekRef = adminDb.collection("weeks").doc(payload.weekId);
                const submitWeekSnap = await submitWeekRef.get();
                if (!submitWeekSnap.exists) throw new Error("Week not found");

                const submitWeekData = submitWeekSnap.data() as any;
                if (!submitWeekData?.ratingEnabled) throw new Error("التقييم غير مفتوح حالياً");
                if (submitWeekData?.king === payload.userName) throw new Error("الملك لا يصوّت لنفسه");
                if ((submitWeekData?.absentees || []).includes(payload.userName)) throw new Error("لا يمكن للغائب التصويت");
                if (!(submitWeekData?.responded || []).includes(payload.userName)) throw new Error("يجب تسجيل الحضور أولاً");

                const existingRatingSnap = await adminDb
                    .collection("ratings")
                    .where("weekId", "==", payload.weekId)
                    .where("userName", "==", payload.userName)
                    .limit(1)
                    .get();
                if (!existingRatingSnap.empty) throw new Error("تم إرسال تقييمك مسبقاً");

                const ratingRef = await adminDb.collection("ratings").add({
                    weekId: payload.weekId,
                    userName: payload.userName,
                    score: payload.score,
                    createdAt: Timestamp.now()
                });
                return NextResponse.json({ result: ratingRef.id });

            case "submitBathroomRating":
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                if (!Number.isInteger(payload.score) || payload.score < 1 || payload.score > 5) throw new Error("Invalid score");

                const bathroomWeekId = typeof payload.weekId === "string" && payload.weekId.trim()
                    ? payload.weekId.trim()
                    : "general";

                const existingBathroomRatingSnap = await adminDb
                    .collection("bathroomRatings")
                    .where("weekId", "==", bathroomWeekId)
                    .where("userName", "==", payload.userName)
                    .limit(1)
                    .get();
                if (!existingBathroomRatingSnap.empty) throw new Error("تم إرسال تقييم الحمام مسبقاً");

                const normalizedBathroomName = normalizeNickName(
                    payload.bathroomName,
                    typeof payload.restaurantName === "string" && payload.restaurantName.trim()
                        ? `حمام ${payload.restaurantName.trim()}`
                        : "حمام غير مسمى"
                );

                if (normalizedBathroomName.length > 60) {
                    throw new Error("اسم الحمام طويل جدًا");
                }

                const bathroomRef = await adminDb.collection("bathroomRatings").add({
                    weekId: bathroomWeekId,
                    userName: payload.userName,
                    score: payload.score,
                    bathroomName: normalizedBathroomName,
                    restaurantName: typeof payload.restaurantName === "string" && payload.restaurantName.trim()
                        ? payload.restaurantName.trim()
                        : null,
                    createdAt: Timestamp.now()
                });
                return NextResponse.json({ result: bathroomRef.id });

            case "login":
                if (!VALID_NAMES_RPC.includes(payload.name)) throw new Error("اسم غير مصرح به");
                if (typeof payload.password !== "string" || !payload.password) throw new Error("كلمة المرور مطلوبة");

                const loginRef = adminDb.collection("users").doc(payload.name);
                const loginSnap = await loginRef.get();
                if (!loginSnap.exists) throw new Error("المستخدم غير مسجل بعد");

                const loginData = loginSnap.data() as any;
                const storedPassword = typeof loginData?.password === "string" ? loginData.password : "";
                if (!storedPassword) throw new Error("بيانات الحساب ناقصة. تواصل مع العميد.");

                const hashedInput = await hashPassword(payload.password);
                let tokenToStore = "";

                if (storedPassword === payload.password) {
                    tokenToStore = hashedInput;
                    await loginRef.update({ password: tokenToStore });
                    loginData.password = tokenToStore;
                } else if (authPasswordMatches(storedPassword, hashedInput)) {
                    tokenToStore = storedPassword;
                } else {
                    throw new Error("كلمة المرور غير صحيحة");
                }

                return NextResponse.json({
                    result: {
                        profile: normalizeAuthProfile(payload.name, loginData),
                        token: tokenToStore,
                    }
                });

            case "validateSession":
                if (!authName || !userDocData) throw new Error("Unauthorized");
                return NextResponse.json({
                    result: {
                        profile: normalizeAuthProfile(authName, userDocData),
                        token: typeof userDocData.password === "string" ? userDocData.password : null,
                    }
                });

            case "getMyProfile":
                if (!authName || !userDocData) throw new Error("Unauthorized");
                return NextResponse.json({ result: normalizeAuthProfile(authName, userDocData) });

            case "getRegisteredNamesCount":
                const registeredUsersSnap = await adminDb
                    .collection("users")
                    .where("registered", "==", true)
                    .get();
                return NextResponse.json({ result: registeredUsersSnap.size });

            case "getPublicUserProfiles":
                const publicUsersSnap = await adminDb.collection("users").get();
                return NextResponse.json({
                    result: publicUsersSnap.docs.map((d) => {
                        const data = d.data() as any;
                        return {
                            userName: d.id,
                            nickName: typeof data.nickName === "string" ? data.nickName : d.id,
                            profileImage: typeof data.profileImage === "string" ? data.profileImage : null,
                            showProfileImage: typeof data.showProfileImage === "boolean" ? data.showProfileImage : true,
                        };
                    })
                });

            case "getAllUsers":
                if (!isAdmin) throw new Error("Dean only");
                const allUsersSnap = await adminDb.collection("users").get();
                return NextResponse.json({
                    result: allUsersSnap.docs.map((d) => {
                        const data = d.data() as any;
                        return {
                            id: d.id,
                            name: typeof data.name === "string" ? data.name : d.id,
                            registered: Boolean(data.registered),
                            role: typeof data.role === "string" ? data.role : "user",
                            phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : null,
                            nickName: typeof data.nickName === "string" ? data.nickName : d.id,
                            profileImage: typeof data.profileImage === "string" ? data.profileImage : null,
                            showProfileImage: typeof data.showProfileImage === "boolean" ? data.showProfileImage : true,
                            isStandalone: data.isStandalone === true,
                            pushSubscription: typeof data.pushSubscription === "string" ? data.pushSubscription : null,
                            resetCode: typeof data.resetCode === "string" ? data.resetCode : null,
                            resetCodeTimestamp: typeof data.resetCodeTimestamp === "number" ? data.resetCodeTimestamp : null,
                        };
                    })
                });

            case "getUsersWithResetCodes":
                if (!isAdmin) throw new Error("Dean only");
                const resetSnap = await adminDb.collection("users").get();
                const now = Date.now();
                const FIFTEEN_MINUTES = 15 * 60 * 1000;
                const requests: { id: string; name: string; resetCode: string }[] = [];

                for (const d of resetSnap.docs) {
                    const data = d.data() as any;
                    const resetCode = asTrimmedString(data.resetCode);
                    if (!resetCode) continue;

                    const ts = typeof data.resetCodeTimestamp === "number" ? data.resetCodeTimestamp : 0;
                    if (ts && now - ts > FIFTEEN_MINUTES) {
                        await adminDb.collection("users").doc(d.id).update({ resetCode: null, resetCodeTimestamp: null });
                        continue;
                    }

                    requests.push({
                        id: d.id,
                        name: typeof data.name === "string" ? data.name : d.id,
                        resetCode,
                    });
                }
                return NextResponse.json({ result: requests });

            case "getPushSubscriptions":
                if (!isAdmin) throw new Error("Dean only");
                const usernames: string[] = Array.isArray(payload.usernames)
                    ? payload.usernames.filter((v: unknown) => typeof v === "string" && v.trim())
                    : [];

                let pushUsersSnap: admin.firestore.QuerySnapshot;
                if (usernames.length > 0) {
                    pushUsersSnap = await adminDb.collection("users").where(admin.firestore.FieldPath.documentId(), "in", usernames).get();
                } else {
                    pushUsersSnap = await adminDb.collection("users").get();
                }

                const subscriptions: any[] = [];
                for (const d of pushUsersSnap.docs) {
                    const data = d.data() as any;
                    if (typeof data.pushSubscription !== "string" || !data.pushSubscription) continue;
                    try {
                        subscriptions.push(JSON.parse(data.pushSubscription));
                    } catch {
                        // Ignore invalid subscriptions.
                    }
                }
                return NextResponse.json({ result: subscriptions });

            // --- USERS & AUTH ---
            case "updateUserStandaloneStatus":
            case "updatePushSubscription":
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                const uRef = adminDb.collection("users").doc(payload.userName);
                if (action === "updateUserStandaloneStatus") await uRef.update({ isStandalone: payload.isStandalone });
                if (action === "updatePushSubscription") await uRef.update({ pushSubscription: JSON.stringify(payload.subscription) });
                return NextResponse.json({ result: true });

            case "updateProfileCustomization":
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                const profileRef = adminDb.collection("users").doc(payload.userName);
                const profileSnap = await profileRef.get();
                if (!profileSnap.exists) throw new Error("المستخدم غير موجود");

                const nextNick = normalizeNickName(payload.nickName, payload.userName);
                if (nextNick.length < 2 || nextNick.length > 24) {
                    throw new Error("الاسم المستعار يجب أن يكون بين 2 و 24 حرف");
                }

                let nextImage: string | null = null;
                if (payload.profileImage === null || payload.profileImage === "") {
                    nextImage = null;
                } else if (typeof payload.profileImage === "string") {
                    if (!payload.profileImage.startsWith("data:image/")) {
                        throw new Error("صيغة الصورة غير مدعومة");
                    }
                    if (payload.profileImage.length > 450000) {
                        throw new Error("حجم الصورة كبير، استخدم صورة أصغر");
                    }
                    nextImage = payload.profileImage;
                } else {
                    throw new Error("بيانات الصورة غير صالحة");
                }

                const nextShowProfileImage = typeof payload.showProfileImage === "boolean"
                    ? payload.showProfileImage
                    : true;

                await profileRef.update({ nickName: nextNick, profileImage: nextImage, showProfileImage: nextShowProfileImage });
                return NextResponse.json({ result: { nickName: nextNick, profileImage: nextImage, showProfileImage: nextShowProfileImage } });

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
                await regRef.set({ name: payload.name, password: hp, role, registered: true, nickName: payload.name, profileImage: null, showProfileImage: true });
                return NextResponse.json({ result: { name: payload.name, role, registered: true, token: hp, nickName: payload.name, profileImage: null, showProfileImage: true } });

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
                await adminDb.collection("chatMessages").add({
                    userName: payload.userName,
                    nickName: typeof userDocData?.nickName === "string" ? userDocData.nickName : payload.userName,
                    profileImage: typeof userDocData?.profileImage === "string" ? userDocData.profileImage : null,
                    showProfileImage: typeof userDocData?.showProfileImage === "boolean" ? userDocData.showProfileImage : true,
                    text: payload.text,
                    createdAt: Timestamp.now()
                });
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
