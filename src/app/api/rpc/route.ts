/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تكتب كود حلو؟"
 * قال: "لأن عندي tokens أكثر من المبرمجين عندهم قهوة ☕😂"
 */

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';
import { hashPassword } from "@/lib/hash";
import * as coup from "@/lib/coup/engine";
import { encryptState, decryptState } from "@/lib/coup/secret";
import { ActionType, Character, CoupGameState, ResponseType } from "@/lib/coup/types";
import { sendPushNotification } from "@/lib/pushHelper";
import { planOuting } from "@/lib/outingPlanner";

const VALID_NAMES_RPC = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
const WEEK_DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;
const STANDARD_OUTING_DAYS = ["الخميس", "الجمعة"] as const;
const DAY_VOTE_OPTIONS = ["الخميس", "الجمعة", "الخميس والجمعة"] as const;
const Timestamp = admin.firestore.Timestamp;

type RateLimitRule = { limit: number; windowMs: number };
type RateLimitBucket = { count: number; windowStart: number };

const RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
    login: { limit: 12, windowMs: 60 * 1000 },
    requestPasswordReset: { limit: 5, windowMs: 15 * 60 * 1000 },
    resetPasswordWithCode: { limit: 8, windowMs: 15 * 60 * 1000 },
    submitRating: { limit: 8, windowMs: 60 * 1000 },
    submitBathroomRating: { limit: 8, windowMs: 60 * 1000 },
    submitDayVote: { limit: 12, windowMs: 60 * 1000 },
    startRestaurantVoting: { limit: 5, windowMs: 60 * 1000 },
    submitRestaurantVote: { limit: 10, windowMs: 60 * 1000 },
    endRestaurantVoting: { limit: 5, windowMs: 60 * 1000 },
    overrideRestaurantResult: { limit: 5, windowMs: 60 * 1000 },
    cancelRestaurantVoting: { limit: 5, windowMs: 60 * 1000 },
    submitSuggestion: { limit: 12, windowMs: 60 * 1000 },
    sendChatMessage: { limit: 30, windowMs: 60 * 1000 },
    submitFeatureVote: { limit: 30, windowMs: 60 * 1000 },
    setFeatureRemoved: { limit: 20, windowMs: 60 * 1000 },
    recordActivity: { limit: 40, windowMs: 60 * 1000 },
    coupAction: { limit: 60, windowMs: 60 * 1000 },
    coupRespond: { limit: 120, windowMs: 60 * 1000 },
    coupTick: { limit: 120, windowMs: 60 * 1000 },
    coupGetHand: { limit: 120, windowMs: 60 * 1000 },
    coupReaction: { limit: 60, windowMs: 60 * 1000 },
    coupVoiceSignal: { limit: 400, windowMs: 60 * 1000 },
    coupVoiceState: { limit: 60, windowMs: 60 * 1000 },
    setRestaurantLocation: { limit: 20, windowMs: 60 * 1000 },
    deleteRestaurantLocation: { limit: 20, windowMs: 60 * 1000 },
    mergeRestaurantNames: { limit: 30, windowMs: 60 * 1000 },
    startImpromptuMeetup: { limit: 3, windowMs: 10 * 60 * 1000 },
    respondImpromptuMeetup: { limit: 20, windowMs: 60 * 1000 },
    cancelImpromptuMeetup: { limit: 5, windowMs: 60 * 1000 },
    planOuting: { limit: 30, windowMs: 60 * 1000 },
    voteStylePreference: { limit: 10, windowMs: 60 * 1000 },
};

const rateLimitStore = new Map<string, RateLimitBucket>();

function getClientIp(request: Request): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "unknown";
}

function enforceRateLimit(action: string, actorKey: string) {
    const rule = RATE_LIMIT_RULES[action];
    if (!rule) return;

    const now = Date.now();
    const key = `${action}:${actorKey}`;
    const bucket = rateLimitStore.get(key);

    if (!bucket || now - bucket.windowStart >= rule.windowMs) {
        rateLimitStore.set(key, { count: 1, windowStart: now });
    } else if (bucket.count >= rule.limit) {
        throw new Error("Too many requests, please wait and try again.");
    } else {
        bucket.count += 1;
        rateLimitStore.set(key, bucket);
    }

    // Keep memory bounded on long-lived processes.
    if (rateLimitStore.size > 5000) {
        for (const [k, v] of rateLimitStore) {
            if (now - v.windowStart >= 60 * 60 * 1000) {
                rateLimitStore.delete(k);
            }
        }
    }
}

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

function isStandardOutingDay(value: unknown): value is (typeof STANDARD_OUTING_DAYS)[number] {
    return typeof value === "string" && STANDARD_OUTING_DAYS.includes(value as (typeof STANDARD_OUTING_DAYS)[number]);
}

function isDayVoteOption(value: unknown): value is (typeof DAY_VOTE_OPTIONS)[number] {
    return typeof value === "string" && DAY_VOTE_OPTIONS.includes(value as (typeof DAY_VOTE_OPTIONS)[number]);
}

const RESTAURANT_VOTING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Auto-end restaurant voting if 24h have passed (lazy expiration check) */
async function autoEndExpiredRestaurantVoting(weekRef: FirebaseFirestore.DocumentReference): Promise<void> {
    const weekSnap = await weekRef.get();
    if (!weekSnap.exists) return;

    const weekData = weekSnap.data() as any;
    if (!weekData.restaurantVotingActive) return;

    const startedAt = weekData.restaurantVotingStartedAt;
    if (!startedAt) return;

    const startMs = startedAt.toMillis ? startedAt.toMillis() : (startedAt.seconds || 0) * 1000;
    const now = Date.now();

    if (now - startMs < RESTAURANT_VOTING_DURATION_MS) return; // Not expired yet

    // Voting has expired - auto-end it
    const votes = weekData.restaurantVotes || {};
    const candidates: string[] = weekData.restaurantCandidates || [];
    const voteCounts: Record<string, number> = {};

    for (const candidate of candidates) {
        voteCounts[candidate] = 0;
    }
    for (const vote of Object.values(votes)) {
        if (typeof vote === "string" && voteCounts[vote] !== undefined) {
            voteCounts[vote]++;
        }
    }

    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const winners = candidates.filter((c: string) => voteCounts[c] === maxVotes);

    let winner: string;
    if (maxVotes === 0 && candidates.length > 0) {
        winner = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (winners.length > 1) {
        winner = winners[Math.floor(Math.random() * winners.length)];
    } else if (winners.length === 1) {
        winner = winners[0];
    } else {
        return; // No candidates, nothing to do
    }

    await weekRef.update({
        restaurantVotingActive: false,
        restaurantVotingEndedAt: Timestamp.now(),
        restaurantVotingResult: winner,
        restaurant: winner,
    });
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

// ---------- Coup helpers ----------

const COUP_VALID_ACTIONS: ActionType[] = [
    "income", "foreign_aid", "coup", "tax", "assassinate", "steal", "exchange",
];
const COUP_VALID_RESPONSES: ResponseType[] = ["pass", "challenge", "block"];
const COUP_VALID_CHARACTERS: Character[] = ["duke", "assassin", "captain", "ambassador", "contessa"];

function coupRoomRef(roomId: string) {
    return adminDb.collection("coupRooms").doc(roomId);
}

// Deterministic, path-safe doc id for the restaurantLocations collection.
function restaurantSlug(name: string): string {
    return name.normalize("NFKC").replace(/[\/\.\#\$\[\]]/g, "_").trim().slice(0, 120) || "restaurant";
}

function validRoomId(id: unknown): string {
    const s = asTrimmedString(id).toUpperCase();
    if (!/^[A-Z0-9]{4,6}$/.test(s)) throw new Error("رمز غرفة غير صالح");
    return s;
}

async function loadCoupState(roomId: string): Promise<CoupGameState> {
    const snap = await coupRoomRef(roomId).get();
    if (!snap.exists) throw new Error("الغرفة غير موجودة");
    const enc = snap.data()?.enc;
    if (typeof enc !== "string") throw new Error("بيانات الغرفة تالفة");
    return decryptState(enc);
}

async function saveCoupState(state: CoupGameState): Promise<void> {
    const pub = coup.redactPublic(state);
    await coupRoomRef(state.roomId).set({
        ...pub,
        enc: encryptState(state),
        lastActivityAt: Timestamp.now(),
    });
}

// Self-healing: advance any expired response windows before applying a new action.
function runCoupTimeouts(state: CoupGameState): boolean {
    let changed = false;
    for (let i = 0; i < 12; i++) {
        if (!coup.handleTimeout(state)) break;
        changed = true;
    }
    return changed;
}

async function generateCoupRoomId(): Promise<string> {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 8; attempt++) {
        let code = "";
        for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
        const snap = await coupRoomRef(code).get();
        if (!snap.exists) return code;
    }
    throw new Error("تعذّر إنشاء رمز غرفة، حاول مرة أخرى");
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, payload, auth } = body;
        const clientIp = getClientIp(request);

        // Skip auth check for public actions
        const publicActions = [
            "register",
            "requestPasswordReset",
            "resetPasswordWithCode",
            "recordVisit",
            "login",
            "getRegisteredNamesCount",
            "getPublicUserProfiles"
        ];
        
        let userDocData: any = null;
        let authName = auth?.name;

        if (publicActions.includes(action)) {
            // Public actions can't verify identity yet, so limit by declared name/IP.
            // Brute-forceable actions (login/reset) are additionally protected by
            // non-spoofable per-account counters/lockouts inside their handlers.
            const actorKey = authName && typeof authName === "string" && authName.trim()
                ? `user:${authName.trim()}`
                : `ip:${clientIp}`;
            enforceRateLimit(action, actorKey);
        } else {
            if (!auth || !auth.name || !auth.token) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            authName = auth.name; // Set authName for all authenticated requests
            const userRef = adminDb.collection("users").doc(auth.name);
            const userSnap = await userRef.get();
            if (!userSnap.exists || !authPasswordMatches(userSnap.data()?.password, auth.token)) {
                return NextResponse.json({ error: "Unauthorized - Invalid Token" }, { status: 401 });
            }
            userDocData = userSnap.data();
            // Rate-limit on the VERIFIED identity so a caller can't spoof another
            // member's name to drain their bucket (or rotate names for fresh ones).
            enforceRateLimit(action, `user:${authName}`);
        }

        const isAdmin = authName === "شوكا";

        const normalizeNickName = (value: unknown, fallback: string): string => {
            if (typeof value !== "string") return fallback;
            const cleaned = value.trim().replace(/\s+/g, " ");
            return cleaned || fallback;
        };

        switch (action) {
            // --- WEEKS ---
            case "startNewWeek": {
                if (!isAdmin) throw new Error("Dean only");

                // ── Server owns cycle + week numbering ── (client-passed numbers ignored)
                const cfgSnap = await adminDb.collection("appConfig").doc("main").get();
                let configuredCycle = Number(cfgSnap.exists ? (cfgSnap.data() as { currentCycle?: number } | undefined)?.currentCycle : undefined);
                if (!Number.isInteger(configuredCycle) || configuredCycle <= 0) configuredCycle = 1;

                // Scan every week once for: (a) clean max weekNumber, (b) lingering
                // pending weeks to retire, (c) the newest completed week (to detect
                // end-of-cycle).
                const allWeeksSnap = await adminDb.collection("weeks").get();
                let maxWeek = 0;
                const stalePending: FirebaseFirestore.DocumentReference[] = [];
                let newestCompleted: { ref: FirebaseFirestore.DocumentReference; isRandom: boolean; ms: number } | null = null;
                allWeeksSnap.forEach((d) => {
                    const w = d.data() as { weekNumber?: number; status?: string; isRandom?: boolean; createdAt?: FirebaseFirestore.Timestamp };
                    const wn = Number(w?.weekNumber ?? 0);
                    if (Number.isInteger(wn) && wn < 900 && wn > maxWeek) maxWeek = wn;
                    if (w?.status === "pending") stalePending.push(d.ref);
                    if (w?.status === "completed") {
                        const ms = w.createdAt?.toMillis?.() ?? 0;
                        if (!newestCompleted || ms > newestCompleted.ms) {
                            newestCompleted = { ref: d.ref, isRandom: Boolean(w.isRandom), ms };
                        }
                    }
                });
                const weekNumber = maxWeek + 1;

                // ── Auto-advance the cycle ── If the last completed outing was the
                // random week, this new week opens the next cycle. The dead client-
                // side "nextCycleNumber++" never worked because the server overrode it;
                // now the server owns it and persists the advance to appConfig.
                let cycleNumber = configuredCycle;
                if (newestCompleted && (newestCompleted as { isRandom: boolean }).isRandom && !payload.isRandom) {
                    cycleNumber = configuredCycle + 1;
                    await adminDb.collection("appConfig").doc("main").set(
                        { currentCycle: cycleNumber, updatedAt: Timestamp.now() },
                        { merge: true },
                    );
                }

                // ── Enforce a single pending week ── Any lingering pending weeks are
                // stale duplicates (the just-finished week was already completed by the
                // client). Retire them as "skipped" so they never pollute stats or get
                // picked as the "current" week.
                if (stalePending.length > 0) {
                    const retireBatch = adminDb.batch();
                    stalePending.forEach((ref) => retireBatch.update(ref, { status: "skipped" }));
                    await retireBatch.commit();
                }

                const newWeekRef = adminDb.collection("weeks").doc();
                const newWeek = {
                    king: payload.kingName,
                    isRandom: payload.isRandom,
                    cycleNumber,
                    weekNumber,
                    day: null,
                    dayVotingEnabled: true,
                    dayVotes: {},
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
            }

            case "setCurrentCycle": {
                if (!isAdmin) throw new Error("Dean only");
                const c = Number(payload?.currentCycle);
                if (!Number.isInteger(c) || c < 1 || c > 999) throw new Error("رقم دورة غير صالح");
                const applyToCurrent = payload?.applyToCurrentWeek === true;
                await adminDb.collection("appConfig").doc("main").set({ currentCycle: c, updatedAt: Timestamp.now() }, { merge: true });
                // Optionally retag the active pending week into the new cycle.
                if (applyToCurrent) {
                    const pendingSnap = await adminDb.collection("weeks").where("status", "==", "pending").get();
                    const batch = adminDb.batch();
                    pendingSnap.forEach((d) => batch.update(d.ref, { cycleNumber: c }));
                    await batch.commit();
                }
                return NextResponse.json({ result: { currentCycle: c } });
            }

            case "toggleAttendance":
                if (authName !== payload.userName && !isAdmin) throw new Error("Can only change your own attendance");
                const weekRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekSnap = await weekRef.get();
                if (!weekSnap.exists) throw new Error("Week not found");
                
                let { absentees = [], responded = [] } = weekSnap.data() as any;
                const dayVotes = { ...((weekSnap.data() as any).dayVotes || {}) } as Record<string, string>;
                
                if (payload.isAbsent && !absentees.includes(payload.userName)) {
                    absentees.push(payload.userName);
                    delete dayVotes[payload.userName];
                }
                else if (!payload.isAbsent) absentees = absentees.filter((n: string) => n !== payload.userName);

                if (!responded.includes(payload.userName)) responded.push(payload.userName);

                await weekRef.update({ absentees, responded, dayVotes });
                
                const requiredCount = VALID_NAMES_RPC.length - 1;
                const justCompleted = responded.length >= requiredCount && ((weekSnap.data() as any).responded || []).length < requiredCount;
                return NextResponse.json({ result: justCompleted });

            case "setWeekChoices": {
                const weekChoicesRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekChoicesSnap = await weekChoicesRef.get();
                if (!weekChoicesSnap.exists || (weekChoicesSnap.data() as any).king !== authName) {
                    if (!isAdmin) throw new Error("Only the King can make choices");
                }
                if (payload.day !== null && !WEEK_DAYS.includes(payload.day)) {
                    throw new Error("Invalid day");
                }
                // Only the Dean may PICK a non-standard day. But a King may keep a
                // non-standard day the Dean already set (e.g. while only changing the
                // restaurant) — otherwise the King gets locked out of editing.
                const existingDay = (weekChoicesSnap.data() as any).day ?? null;
                if (
                    !isAdmin &&
                    payload.day !== null &&
                    !STANDARD_OUTING_DAYS.includes(payload.day) &&
                    payload.day !== existingDay
                ) {
                    throw new Error("Only the Dean can pick a non-standard day");
                }
                await weekChoicesRef.update({
                    day: payload.day,
                    restaurant: payload.restaurant,
                    activity: payload.activity,
                    dayVotingEnabled: payload.day ? false : true
                });
                return NextResponse.json({ result: true });
            }

            case "toggleDayVoting": {
                const weekVotingRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekVotingSnap = await weekVotingRef.get();
                if (!weekVotingSnap.exists) throw new Error("Week not found");

                const weekData = weekVotingSnap.data() as any;
                // Random outings: any signed-in member can toggle. Otherwise, king-only.
                const allowAny = Boolean(weekData?.isRandom);
                if (!allowAny && weekData.king !== authName && !isAdmin) throw new Error("Only the King can control day voting");

                const enabled = Boolean(payload.enabled);
                const resetVotes = Boolean(payload.resetVotes);
                const updatePayload: Record<string, unknown> = { dayVotingEnabled: enabled };
                if (resetVotes || !enabled) {
                    updatePayload.dayVotes = {};
                }
                await weekVotingRef.update(updatePayload);
                return NextResponse.json({ result: true });
            }

            case "submitDayVote": {
                if (authName !== payload.userName) throw new Error("Identity mismatch");
                if (!isDayVoteOption(payload.day)) throw new Error("Invalid day vote");

                const weekVoteRef = adminDb.collection("weeks").doc(payload.weekId);
                let autoAppliedDay: string | null = null;
                await adminDb.runTransaction(async (tx) => {
                    const weekVoteSnap = await tx.get(weekVoteRef);
                    if (!weekVoteSnap.exists) throw new Error("Week not found");
                    const weekData = weekVoteSnap.data() as any;

                    if (weekData?.day) throw new Error("تم اعتماد يوم الطلعة بالفعل");
                    if (weekData?.king === authName) throw new Error("الملك يعتمد القرار ولا يصوّت");
                    if ((weekData?.absentees || []).includes(authName)) throw new Error("التصويت متاح للحاضرين فقط");
                    if (!(weekData?.responded || []).includes(authName)) throw new Error("أكد حضورك أولاً ثم صوّت");

                    const currentVotes = { ...(weekData?.dayVotes || {}) } as Record<string, string>;
                    currentVotes[authName] = payload.day;

                    const updatePayload: Record<string, unknown> = {
                        dayVotes: currentVotes,
                        dayVotingEnabled: true,
                    };

                    // Auto-apply for random outings when 4+ valid votes exist.
                    if (weekData?.isRandom) {
                        const responded: string[] = Array.isArray(weekData.responded) ? weekData.responded : [];
                        const absentees: string[] = Array.isArray(weekData.absentees) ? weekData.absentees : [];
                        let thursday = 0;
                        let friday = 0;
                        let validCount = 0;
                        for (const [name, day] of Object.entries(currentVotes)) {
                            const eligible = responded.includes(name) && !absentees.includes(name);
                            if (!eligible) continue;
                            validCount += 1;
                            if (day === "الخميس") thursday += 1;
                            if (day === "الجمعة") friday += 1;
                            if (day === "الخميس والجمعة") { thursday += 1; friday += 1; }
                        }
                        // Threshold: 4 of 6 = consensus. Tie → don't auto-apply.
                        if (validCount >= 4 && thursday !== friday) {
                            const chosen = thursday > friday ? "الخميس" : "الجمعة";
                            updatePayload.day = chosen;
                            updatePayload.dayVotingEnabled = false;
                            autoAppliedDay = chosen;
                        }
                    }

                    tx.update(weekVoteRef, updatePayload);
                });
                return NextResponse.json({ result: true, autoAppliedDay });
            }

            case "applyDayVoteResult": {
                const weekApplyRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekApplySnap = await weekApplyRef.get();
                if (!weekApplySnap.exists) throw new Error("Week not found");

                const weekData = weekApplySnap.data() as any;
                // Random outings: any signed-in member can apply. Otherwise, king-only.
                const allowAny = Boolean(weekData?.isRandom);
                if (!allowAny && weekData.king !== authName && !isAdmin) throw new Error("Only the King can apply the voting result");

                const responded = Array.isArray(weekData.responded) ? weekData.responded : [];
                const absentees = Array.isArray(weekData.absentees) ? weekData.absentees : [];
                const votes = { ...(weekData.dayVotes || {}) } as Record<string, string>;

                let thursday = 0;
                let friday = 0;
                for (const [name, day] of Object.entries(votes)) {
                    const eligible = responded.includes(name) && !absentees.includes(name) && name !== weekData.king;
                    if (!eligible) continue;
                    if (day === "الخميس") thursday += 1;
                    if (day === "الجمعة") friday += 1;
                    if (day === "الخميس والجمعة") {
                        thursday += 1;
                        friday += 1;
                    }
                }

                if (thursday === 0 && friday === 0) throw new Error("لا توجد أصوات صالحة لاعتماد اليوم");

                let chosen: "الخميس" | "الجمعة";
                if (thursday === friday) {
                    if (!isStandardOutingDay(payload.preferredDay)) {
                        throw new Error("تعادل الأصوات، اختر اليوم يدويًا من قائمة الملك ثم احفظ");
                    }
                    chosen = payload.preferredDay;
                } else {
                    chosen = thursday > friday ? "الخميس" : "الجمعة";
                }

                await weekApplyRef.update({ day: chosen, dayVotingEnabled: false });
                return NextResponse.json({ result: chosen });
            }

            // --- RESTAURANT VOTING ---
            case "startRestaurantVoting": {
                const weekRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekSnap = await weekRef.get();
                if (!weekSnap.exists) throw new Error("Week not found");

                const weekData = weekSnap.data() as any;
                if (weekData.king !== authName && !isAdmin) {
                    throw new Error("Only the King can start restaurant voting");
                }

                // Validate 3 unique restaurant names
                const candidates = payload.candidates;
                if (!Array.isArray(candidates) || candidates.length !== 3) {
                    throw new Error("يجب اختيار 3 مطاعم مختلفة");
                }
                const trimmed = candidates.map((c: string) => (typeof c === "string" ? c.trim() : "")).filter(Boolean);
                if (trimmed.length !== 3 || new Set(trimmed).size !== 3) {
                    throw new Error("يجب أن تكون المطاعم الثلاثة مختلفة وغير فارغة");
                }

                // Check if voting is already active
                if (weekData.restaurantVotingActive) {
                    throw new Error("التصويت مفعّل بالفعل");
                }

                await weekRef.update({
                    restaurantVotingMode: "democratic",
                    restaurantCandidates: trimmed,
                    restaurantVotes: {},
                    restaurantVotingStartedAt: Timestamp.now(),
                    restaurantVotingEndedAt: null,
                    restaurantVotingActive: true,
                    restaurantVotingResult: null,
                    restaurantOverridden: false,
                    restaurantOverrideValue: null,
                    restaurant: null, // Clear any previous direct selection
                });

                // Send push notification to all members (fire-and-forget)
                sendPushNotification(
                    {
                        title: "التصويت على المطعم بدأ! 🗳️",
                        body: "صوّت الآن على مطعم الطلعة القادمة",
                        type: "voting",
                        tag: `restaurant-voting-${payload.weekId}`,
                        url: "/?tab=week",
                        payload: { weekId: payload.weekId },
                    },
                    {} // Send to all members including king
                ).catch((err) => {
                    console.error("Failed to send voting start notification:", err);
                });

                return NextResponse.json({ result: true });
            }

            case "submitRestaurantVote": {
                const weekRef = adminDb.collection("weeks").doc(payload.weekId);

                // Auto-end if voting expired (lazy check)
                await autoEndExpiredRestaurantVoting(weekRef);

                await adminDb.runTransaction(async (tx) => {
                    const weekSnap = await tx.get(weekRef);
                    if (!weekSnap.exists) throw new Error("Week not found");

                    const weekData = weekSnap.data() as any;

                    // Validation checks
                    if (!weekData.restaurantVotingActive) {
                        throw new Error("التصويت غير مفعّل حالياً");
                    }
                    if (weekData.king === authName) {
                        throw new Error("الملك لا يصوّت على المطعم");
                    }

                    const candidates = weekData.restaurantCandidates || [];
                    if (!candidates.includes(payload.restaurant)) {
                        throw new Error("خيار المطعم غير صالح");
                    }

                    const currentVotes = { ...(weekData.restaurantVotes || {}) };

                    // Check if user already voted (votes are final)
                    if (currentVotes[authName]) {
                        throw new Error("صوتك محفوظ ولا يمكن تغييره");
                    }

                    // Note: Absent members CAN vote (per requirements)
                    currentVotes[authName] = payload.restaurant;
                    tx.update(weekRef, { restaurantVotes: currentVotes });
                });

                return NextResponse.json({ result: true });
            }

            case "endRestaurantVoting": {
                const weekRef = adminDb.collection("weeks").doc(payload.weekId);

                // Auto-end if voting expired (lazy check)
                await autoEndExpiredRestaurantVoting(weekRef);

                const weekSnap = await weekRef.get();
                if (!weekSnap.exists) throw new Error("Week not found");

                const weekData = weekSnap.data() as any;
                if (weekData.king !== authName && !isAdmin) {
                    throw new Error("Only the King can end voting");
                }
                if (!weekData.restaurantVotingActive) {
                    throw new Error("لا يوجد تصويت نشط لإنهائه");
                }

                // Count votes
                const votes = weekData.restaurantVotes || {};
                const candidates: string[] = weekData.restaurantCandidates || [];
                const voteCounts: Record<string, number> = {};

                for (const candidate of candidates) {
                    voteCounts[candidate] = 0;
                }
                for (const vote of Object.values(votes)) {
                    if (typeof vote === "string" && voteCounts[vote] !== undefined) {
                        voteCounts[vote]++;
                    }
                }

                // Find winner(s)
                const maxVotes = Math.max(...Object.values(voteCounts), 0);
                const winners = candidates.filter((c: string) => voteCounts[c] === maxVotes);

                // Tie breaker: random selection
                let winner: string;
                if (maxVotes === 0) {
                    // No votes cast - pick randomly from candidates
                    winner = candidates[Math.floor(Math.random() * candidates.length)];
                } else if (winners.length > 1) {
                    winner = winners[Math.floor(Math.random() * winners.length)];
                } else {
                    winner = winners[0];
                }

                await weekRef.update({
                    restaurantVotingActive: false,
                    restaurantVotingEndedAt: Timestamp.now(),
                    restaurantVotingResult: winner,
                    restaurant: winner, // Set the week's restaurant to the winner
                });

                return NextResponse.json({ result: { winner } });
            }

            case "overrideRestaurantResult": {
                const weekRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekSnap = await weekRef.get();
                if (!weekSnap.exists) throw new Error("Week not found");

                const weekData = weekSnap.data() as any;
                if (weekData.king !== authName && !isAdmin) {
                    throw new Error("Only the King can override");
                }

                // Can only override after voting ended
                if (weekData.restaurantVotingActive) {
                    throw new Error("لا يمكن استخدام القمع إلا بعد انتهاء التصويت");
                }
                if (!weekData.restaurantVotingResult) {
                    throw new Error("لم يتم إجراء تصويت لقمعه");
                }

                const overrideRestaurant = asTrimmedString(payload.restaurant);
                if (!overrideRestaurant) {
                    throw new Error("اسم المطعم مطلوب");
                }

                await weekRef.update({
                    restaurantOverridden: true,
                    restaurantOverrideValue: overrideRestaurant,
                    restaurant: overrideRestaurant, // Override the week's restaurant
                });

                return NextResponse.json({ result: true });
            }

            case "cancelRestaurantVoting": {
                const weekRef = adminDb.collection("weeks").doc(payload.weekId);
                const weekSnap = await weekRef.get();
                if (!weekSnap.exists) throw new Error("Week not found");

                const weekData = weekSnap.data() as any;
                if (weekData.king !== authName && !isAdmin) {
                    throw new Error("Only the King can cancel voting");
                }

                await weekRef.update({
                    restaurantVotingMode: "dictatorial",
                    restaurantCandidates: null,
                    restaurantVotes: {},
                    restaurantVotingStartedAt: null,
                    restaurantVotingEndedAt: null,
                    restaurantVotingActive: false,
                    restaurantVotingResult: null,
                    restaurantOverridden: false,
                    restaurantOverrideValue: null,
                });

                return NextResponse.json({ result: true });
            }

            case "secretlyChangeKing":
            case "toggleRatingEnabled":
            case "completeWeek":
            case "uncompleteWeek":
            case "resetCycleLeaderboard":
                if (!isAdmin) throw new Error("Dean only");
                const adminWeekRef = adminDb.collection("weeks").doc(payload.weekId);
                if (action === "secretlyChangeKing") await adminWeekRef.update({ king: payload.newKingName, isRandom: payload.newKingName === null });
                if (action === "toggleRatingEnabled") await adminWeekRef.update({ ratingEnabled: payload.enabled });
                if (action === "completeWeek") await adminWeekRef.update({ status: "completed" });
                if (action === "uncompleteWeek") await adminWeekRef.update({ status: "pending" });
                if (action === "resetCycleLeaderboard") await adminWeekRef.update({ cycleNumber: payload.newCycleNumber });
                return NextResponse.json({ result: true });

            case "setWeekCycle": {
                if (!isAdmin) throw new Error("Dean only");
                const weekId = asTrimmedString(payload?.weekId);
                if (!weekId) throw new Error("Missing weekId");
                const newCycle = Number(payload?.cycleNumber);
                if (!Number.isInteger(newCycle) || newCycle < 1) {
                    throw new Error("Invalid cycle number");
                }
                await adminDb.collection("weeks").doc(weekId).update({ cycleNumber: newCycle });
                return NextResponse.json({ result: true });
            }

            case "bulkSetWeekCycle": {
                if (!isAdmin) throw new Error("Dean only");
                const weekIds: unknown = payload?.weekIds;
                const newCycle = Number(payload?.cycleNumber);
                if (!Array.isArray(weekIds) || weekIds.length === 0) {
                    throw new Error("Missing weekIds");
                }
                if (!Number.isInteger(newCycle) || newCycle < 1) {
                    throw new Error("Invalid cycle number");
                }
                const batch = adminDb.batch();
                let count = 0;
                for (const id of weekIds) {
                    if (typeof id !== "string" || !id.trim()) continue;
                    batch.update(adminDb.collection("weeks").doc(id.trim()), { cycleNumber: newCycle });
                    count++;
                }
                await batch.commit();
                return NextResponse.json({ result: { updated: count } });
            }

            // Cycle Organizer — edit any subset of a week's metadata in one call.
            case "updateWeekMeta": {
                if (!isAdmin) throw new Error("Dean only");
                const weekId = asTrimmedString(payload?.weekId);
                if (!weekId) throw new Error("Missing weekId");
                const u = (payload?.updates && typeof payload.updates === "object") ? payload.updates : {};
                const patch: Record<string, unknown> = {};

                if (u.cycleNumber !== undefined) {
                    const c = Number(u.cycleNumber);
                    if (!Number.isInteger(c) || c < 1 || c > 999) throw new Error("رقم دورة غير صالح");
                    patch.cycleNumber = c;
                }
                if (u.weekNumber !== undefined) {
                    const w = Number(u.weekNumber);
                    if (!Number.isInteger(w) || w < 1 || w > 9999) throw new Error("رقم أسبوع غير صالح");
                    patch.weekNumber = w;
                }
                if (u.isRandom !== undefined) {
                    patch.isRandom = Boolean(u.isRandom);
                    // A random week has no king.
                    if (patch.isRandom === true) patch.king = null;
                }
                if (u.king !== undefined) {
                    const k = u.king === null ? null : asTrimmedString(u.king);
                    if (k !== null && !VALID_NAMES_RPC.includes(k)) throw new Error("ملك غير معروف");
                    patch.king = k;
                    if (k !== null) patch.isRandom = false;
                }
                if (u.status !== undefined) {
                    const s = asTrimmedString(u.status);
                    if (s !== "completed" && s !== "pending" && s !== "skipped") throw new Error("حالة غير صالحة");
                    patch.status = s;
                }
                if (Object.keys(patch).length === 0) {
                    return NextResponse.json({ result: true });
                }
                await adminDb.collection("weeks").doc(weekId).update(patch);
                return NextResponse.json({ result: true });
            }

            // Cycle Organizer — delete a week by its document id (+ its ratings).
            case "deleteWeekById": {
                if (!isAdmin) throw new Error("Dean only");
                const weekId = asTrimmedString(payload?.weekId);
                if (!weekId) throw new Error("Missing weekId");
                const ratingsSnap = await adminDb.collection("ratings").where("weekId", "==", weekId).get();
                const batch = adminDb.batch();
                let deletedRatings = 0;
                ratingsSnap.forEach((d) => { batch.delete(d.ref); deletedRatings++; });
                batch.delete(adminDb.collection("weeks").doc(weekId));
                await batch.commit();
                return NextResponse.json({ result: { deletedRatings } });
            }

            // --- RATINGS ---
            case "submitRating":
                // Note: authName is now reliably set for all authenticated requests
                if (!Number.isInteger(payload.score) || payload.score < 1 || payload.score > 5) throw new Error("Invalid score");
                if (typeof payload.weekId !== "string" || !payload.weekId.trim()) throw new Error("Invalid week");

                const submitWeekRef = adminDb.collection("weeks").doc(payload.weekId);
                const submitWeekSnap = await submitWeekRef.get();
                if (!submitWeekSnap.exists) throw new Error("Week not found");

                const submitWeekData = submitWeekSnap.data() as any;
                if (!submitWeekData?.ratingEnabled) throw new Error("التقييم غير مفتوح حالياً");
                if (submitWeekData?.king === authName) throw new Error("الملك لا يصوّت لنفسه");
                if ((submitWeekData?.absentees || []).includes(authName)) throw new Error("لا يمكن للغائب التصويت");
                if (!(submitWeekData?.responded || []).includes(authName)) throw new Error("يجب تسجيل الحضور أولاً");

                const existingRatingSnap = await adminDb
                    .collection("ratings")
                    .where("weekId", "==", payload.weekId)
                    .where("userName", "==", authName)
                    .limit(1)
                    .get();
                if (!existingRatingSnap.empty) throw new Error("تم إرسال تقييمك مسبقاً");

                const ratingRef = await adminDb.collection("ratings").add({
                    weekId: payload.weekId,
                    userName: authName,
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

            case "login": {
                if (!VALID_NAMES_RPC.includes(payload.name)) throw new Error("اسم غير مصرح به");
                if (typeof payload.password !== "string" || !payload.password) throw new Error("كلمة المرور مطلوبة");

                const loginRef = adminDb.collection("users").doc(payload.name);
                const loginSnap = await loginRef.get();
                if (!loginSnap.exists) throw new Error("المستخدم غير مسجل بعد");

                const loginData = loginSnap.data() as any;
                const storedPassword = typeof loginData?.password === "string" ? loginData.password : "";
                if (!storedPassword) throw new Error("بيانات الحساب ناقصة. تواصل مع العميد.");

                // Per-account lockout — non-spoofable (bound to the username, not IP).
                // After MAX_LOGIN_FAILS wrong tries the account locks for LOCK_MS.
                const MAX_LOGIN_FAILS = 8;
                const LOCK_MS = 15 * 60 * 1000;
                const lockedUntil = Number(loginData?.loginLockedUntil || 0);
                if (lockedUntil && Date.now() < lockedUntil) {
                    const mins = Math.ceil((lockedUntil - Date.now()) / 60000);
                    throw new Error(`الحساب مقفل مؤقتاً — حاول بعد ${mins} دقيقة`);
                }

                const hashedInput = await hashPassword(payload.password);
                let tokenToStore = "";

                if (storedPassword === payload.password) {
                    tokenToStore = hashedInput;
                    await loginRef.update({ password: tokenToStore, loginFailedAttempts: 0, loginLockedUntil: null });
                    loginData.password = tokenToStore;
                } else if (authPasswordMatches(storedPassword, hashedInput)) {
                    tokenToStore = storedPassword;
                    if (loginData?.loginFailedAttempts || loginData?.loginLockedUntil) {
                        await loginRef.update({ loginFailedAttempts: 0, loginLockedUntil: null });
                    }
                } else {
                    const fails = Number(loginData?.loginFailedAttempts || 0) + 1;
                    if (fails >= MAX_LOGIN_FAILS) {
                        await loginRef.update({ loginFailedAttempts: 0, loginLockedUntil: Date.now() + LOCK_MS });
                        throw new Error("تجاوزت عدد المحاولات — الحساب مقفل ١٥ دقيقة");
                    }
                    await loginRef.update({ loginFailedAttempts: fails });
                    throw new Error(`كلمة المرور غير صحيحة (${MAX_LOGIN_FAILS - fails} محاولات متبقية)`);
                }

                return NextResponse.json({
                    result: {
                        profile: normalizeAuthProfile(payload.name, loginData),
                        token: tokenToStore,
                    }
                });
            }

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
                // 6-digit code (1,000,000 space vs the old 9,000) + a fresh per-account
                // attempt counter so each new request resets the lockout window.
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                await prRef.update({
                    resetCode: code,
                    resetCodeTimestamp: Date.now(),
                    resetCodeAttempts: 0,
                });
                return NextResponse.json({ result: true });

            case "resetPasswordWithCode": {
                if (!VALID_NAMES_RPC.includes(payload.userName)) throw new Error("اسم غير مصرح به");
                const rpRef = adminDb.collection("users").doc(payload.userName);
                // Atomic: verify + count attempts + lockout inside one transaction so a
                // scripted F12 caller can't race unlimited guesses (IP throttling is
                // spoofable; this per-account counter is not).
                const MAX_RESET_ATTEMPTS = 5;
                const newHashed = await hashPassword(payload.newPassword);
                await adminDb.runTransaction(async (tx) => {
                    const snap = await tx.get(rpRef);
                    if (!snap.exists) throw new Error("المستخدم غير مسجل");
                    const d = snap.data() as any;
                    if (!d.resetCode) throw new Error("ما فيه طلب استرجاع نشط — اطلب كود جديد");
                    if (Date.now() - (d.resetCodeTimestamp || 0) > 15 * 60 * 1000) {
                        tx.update(rpRef, { resetCode: null, resetCodeTimestamp: null, resetCodeAttempts: 0 });
                        throw new Error("انتهت صلاحية الكود");
                    }
                    const attempts = Number(d.resetCodeAttempts || 0);
                    if (attempts >= MAX_RESET_ATTEMPTS) {
                        tx.update(rpRef, { resetCode: null, resetCodeTimestamp: null, resetCodeAttempts: 0 });
                        throw new Error("تجاوزت عدد المحاولات — اطلب كود جديد");
                    }
                    if (String(d.resetCode) !== String(payload.code)) {
                        tx.update(rpRef, { resetCodeAttempts: attempts + 1 });
                        throw new Error(`رمز الاسترجاع خاطئ (${MAX_RESET_ATTEMPTS - attempts - 1} محاولات متبقية)`);
                    }
                    tx.update(rpRef, { password: newHashed, resetCode: null, resetCodeTimestamp: null, resetCodeAttempts: 0 });
                });
                return NextResponse.json({ result: true });
            }

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
                if (authName !== payload.userName) throw new Error("Identity mismatch");
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

            case "recordActivity": {
                if (!authName) throw new Error("Unauthorized");
                const tab = asTrimmedString(payload?.tab);
                const seconds = Number(payload?.seconds);
                const VALID_TABS = ["week", "leaderboard", "bathroom", "map", "more"];
                if (!VALID_TABS.includes(tab)) {
                    throw new Error("Invalid tab");
                }
                // Cap a single flush at 15 minutes to guard against bad clients.
                if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 900) {
                    throw new Error("Invalid seconds");
                }
                const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
                const increment = admin.firestore.FieldValue.increment(Math.round(seconds));
                const activityRef = adminDb.collection("userActivity").doc(authName);
                await activityRef.set(
                    {
                        userName: authName,
                        lastSeenAt: Timestamp.now(),
                        monthly: {
                            [monthKey]: {
                                totalSeconds: increment,
                                tabSeconds: {
                                    [tab]: increment,
                                },
                            },
                        },
                    },
                    { merge: true }
                );
                return NextResponse.json({ result: true });
            }
                
            case "importHistory":
                if (!isAdmin) throw new Error("Dean only");
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

            case "getPublicUserProfiles": {
                const usersSnap = await adminDb.collection("users").get();
                const profiles = usersSnap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        userName: doc.id,
                        nickName: data.nickName,
                        profileImage: data.profileImage,
                        showProfileImage: data.showProfileImage,
                    };
                });
                return NextResponse.json({ result: profiles });
            }

            case "submitFeatureVote": {
                const featureId = asTrimmedString(payload?.featureId);
                if (!featureId || featureId.length > 64) throw new Error("Invalid feature id");
                const vote = payload?.vote;
                if (vote !== "yes" && vote !== "no" && vote !== null) {
                    throw new Error("Invalid vote value");
                }
                if (!authName) throw new Error("Unauthorized");

                const featureRef = adminDb.collection("featureFeedback").doc(featureId);
                await adminDb.runTransaction(async (tx) => {
                    const snap = await tx.get(featureRef);
                    const current = snap.exists ? (snap.data() as any) : {};
                    const votes: Record<string, string> = { ...(current.votes || {}) };
                    if (vote === null) {
                        delete votes[authName];
                    } else {
                        votes[authName] = vote;
                    }
                    if (snap.exists) {
                        tx.update(featureRef, { votes });
                    } else {
                        tx.set(featureRef, {
                            votes,
                            removed: false,
                            createdAt: Timestamp.now(),
                        });
                    }
                });
                return NextResponse.json({ result: true });
            }

            case "setFeatureRemoved": {
                if (!isAdmin) throw new Error("Dean only");
                const featureId = asTrimmedString(payload?.featureId);
                if (!featureId || featureId.length > 64) throw new Error("Invalid feature id");
                const removed = Boolean(payload?.removed);

                const featureRef = adminDb.collection("featureFeedback").doc(featureId);
                const snap = await featureRef.get();
                if (snap.exists) {
                    await featureRef.update({ removed });
                } else {
                    await featureRef.set({
                        votes: {},
                        removed,
                        createdAt: Timestamp.now(),
                    });
                }
                return NextResponse.json({ result: true });
            }

            case "deleteWeek": {
                if (!isAdmin) throw new Error("Dean only");
                const { weekNumber } = payload;
                if (!Number.isInteger(weekNumber)) throw new Error("Invalid week number");

                // weekNumber is NOT unique (junk/manual edits duplicate it), so
                // deleting "the first match" could nuke the wrong week + its ratings.
                // Refuse when ambiguous — the dean deletes by id via deleteWeekById.
                const weekQuery = await adminDb.collection("weeks").where("weekNumber", "==", weekNumber).get();
                if (weekQuery.empty) {
                    return NextResponse.json({ error: `Week ${weekNumber} not found` }, { status: 404 });
                }
                if (weekQuery.size > 1) {
                    return NextResponse.json({ error: `أكثر من أسبوع يحمل الرقم ${weekNumber} — احذف بالمعرّف (id) من منظّم الدورات` }, { status: 409 });
                }

                const weekDoc = weekQuery.docs[0];
                const weekId = weekDoc.id;

                const ratingsQuery = await adminDb.collection("ratings").where("weekId", "==", weekId).get();
                
                const batch = adminDb.batch();
                let deletedRatingsCount = 0;
                ratingsQuery.forEach(doc => {
                    batch.delete(doc.ref);
                    deletedRatingsCount++;
                });

                batch.delete(weekDoc.ref);
                await batch.commit();

                return NextResponse.json({ result: { deletedWeekId: weekId, deletedRatingsCount } });
            }

            // ---------- COUP ----------
            case "coupCreateRoom": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = await generateCoupRoomId();
                const state = coup.createGame(roomId, authName);
                await saveCoupState(state);
                return NextResponse.json({ result: { roomId } });
            }

            case "coupJoinRoom": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const state = await loadCoupState(roomId);
                coup.addPlayer(state, authName);
                await saveCoupState(state);
                return NextResponse.json({ result: { roomId } });
            }

            case "coupLeaveRoom": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const state = await loadCoupState(roomId);
                coup.removePlayer(state, authName);
                if (state.players.length === 0) {
                    await coupRoomRef(roomId).delete();
                } else {
                    await saveCoupState(state);
                }
                return NextResponse.json({ result: true });
            }

            case "coupStartGame": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const state = await loadCoupState(roomId);
                coup.startGame(state, authName);
                await saveCoupState(state);
                return NextResponse.json({ result: true });
            }

            case "coupAction": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const type = asTrimmedString(payload?.type) as ActionType;
                if (!COUP_VALID_ACTIONS.includes(type)) throw new Error("إجراء غير صالح");
                const target = payload?.target ? asTrimmedString(payload.target) : undefined;
                const state = await loadCoupState(roomId);
                runCoupTimeouts(state);
                coup.performAction(state, authName, type, target);
                await saveCoupState(state);
                return NextResponse.json({ result: true });
            }

            case "coupRespond": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const response = asTrimmedString(payload?.response) as ResponseType;
                if (!COUP_VALID_RESPONSES.includes(response)) throw new Error("رد غير صالح");
                let blockCharacter: Character | undefined;
                if (response === "block") {
                    blockCharacter = asTrimmedString(payload?.blockCharacter) as Character;
                    if (!COUP_VALID_CHARACTERS.includes(blockCharacter)) throw new Error("شخصية صدّ غير صالحة");
                }
                const state = await loadCoupState(roomId);
                runCoupTimeouts(state);
                coup.respond(state, authName, response, blockCharacter);
                await saveCoupState(state);
                return NextResponse.json({ result: true });
            }

            case "coupResolveLose": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const cardIndex = Number(payload?.cardIndex);
                if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 1) throw new Error("اختيار غير صالح");
                const state = await loadCoupState(roomId);
                runCoupTimeouts(state);
                coup.resolveLose(state, authName, cardIndex);
                await saveCoupState(state);
                return NextResponse.json({ result: true });
            }

            case "coupResolveExchange": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const keepIndices = Array.isArray(payload?.keepIndices)
                    ? payload.keepIndices.map((n: any) => Number(n)).filter((n: number) => Number.isInteger(n))
                    : [];
                const state = await loadCoupState(roomId);
                runCoupTimeouts(state);
                coup.resolveExchange(state, authName, keepIndices);
                await saveCoupState(state);
                return NextResponse.json({ result: true });
            }

            case "coupReaction": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const emoji = asTrimmedString(payload?.emoji);
                if (!emoji) throw new Error("إيموجي مطلوب");
                const state = await loadCoupState(roomId);
                coup.addReaction(state, authName, emoji);
                await saveCoupState(state);
                return NextResponse.json({ result: true });
            }

            case "coupGetHand": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const state = await loadCoupState(roomId);
                return NextResponse.json({ result: coup.getHandFor(state, authName) });
            }

            case "coupTick": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const state = await loadCoupState(roomId);
                if (runCoupTimeouts(state)) {
                    await saveCoupState(state);
                }
                return NextResponse.json({ result: true });
            }

            case "coupVoiceState": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                await coupRoomRef(roomId).collection("voice").doc(authName).set({
                    name: authName,
                    joined: Boolean(payload?.joined),
                    muted: Boolean(payload?.muted),
                    atMs: Date.now(),
                });
                return NextResponse.json({ result: true });
            }

            case "coupVoiceSignal": {
                if (!authName) throw new Error("Unauthorized");
                const roomId = validRoomId(payload?.roomId);
                const to = asTrimmedString(payload?.to);
                const signal = payload?.signal;
                if (!to || !signal || typeof signal !== "object") throw new Error("إشارة غير صالحة");
                const signalsCol = coupRoomRef(roomId).collection("signals");
                await signalsCol.add({
                    from: authName,
                    to,
                    signal: JSON.stringify(signal).slice(0, 8000),
                    atMs: Date.now(),
                });
                // Prune old signals so the subcollection stays small.
                const cutoff = Date.now() - 2 * 60 * 1000;
                const old = await signalsCol.where("atMs", "<", cutoff).limit(20).get();
                if (!old.empty) {
                    const batch = adminDb.batch();
                    old.forEach((d) => batch.delete(d.ref));
                    await batch.commit();
                }
                return NextResponse.json({ result: true });
            }

            // ---------- RESTAURANT MAP ----------
            case "setRestaurantLocation": {
                if (!authName) throw new Error("Unauthorized");
                const name = asTrimmedString(payload?.name);
                const lat = Number(payload?.lat);
                const lng = Number(payload?.lng);
                if (!name) throw new Error("اسم المطعم مطلوب");
                if (!Number.isFinite(lat) || Math.abs(lat) > 90) throw new Error("خط عرض غير صالح");
                if (!Number.isFinite(lng) || Math.abs(lng) > 180) throw new Error("خط طول غير صالح");

                const address = asTrimmedString(payload?.address).slice(0, 300) || null;
                const mapsUrl = asTrimmedString(payload?.mapsUrl).slice(0, 600) || null;

                const slug = restaurantSlug(name);

                await adminDb.collection("restaurantLocations").doc(slug).set(
                    {
                        name,
                        lat,
                        lng,
                        address,
                        mapsUrl,
                        addedBy: authName,
                        updatedAt: Timestamp.now(),
                    },
                    { merge: true }
                );
                return NextResponse.json({ result: true });
            }

            case "deleteRestaurantLocation": {
                if (!authName) throw new Error("Unauthorized");
                const name = asTrimmedString(payload?.name);
                if (!name) throw new Error("اسم المطعم مطلوب");
                const slug = restaurantSlug(name);
                const ref = adminDb.collection("restaurantLocations").doc(slug);
                const snap = await ref.get();
                if (!snap.exists) return NextResponse.json({ result: true });
                const data = snap.data() as any;
                if (data?.addedBy !== authName && !isAdmin) {
                    throw new Error("غير مصرح لك بحذف هذا الموقع");
                }
                await ref.delete();
                return NextResponse.json({ result: true });
            }

            case "mergeRestaurantNames": {
                if (!isAdmin) throw new Error("Dean only");
                const toName = asTrimmedString(payload?.toName);
                const rawFrom: unknown = payload?.fromNames;
                if (!toName) throw new Error("الاسم الجديد مطلوب");
                if (!Array.isArray(rawFrom)) throw new Error("قائمة الأسماء مطلوبة");

                // Normalize + dedupe the source names; drop any equal to the target.
                const fromNames = Array.from(
                    new Set(
                        rawFrom
                            .map((n) => asTrimmedString(n))
                            .filter((n) => n && n !== toName)
                    )
                ).slice(0, 100);
                if (fromNames.length === 0) throw new Error("لا يوجد أسماء لدمجها");

                // Update every week whose restaurant matches one of the source names.
                // Firestore "in" allows max 30 values, so query in chunks.
                const matchedDocs: admin.firestore.QueryDocumentSnapshot[] = [];
                for (let i = 0; i < fromNames.length; i += 30) {
                    const chunk = fromNames.slice(i, i + 30);
                    const snap = await adminDb.collection("weeks").where("restaurant", "in", chunk).get();
                    snap.forEach((d) => matchedDocs.push(d));
                }

                let updatedWeeks = 0;
                for (let i = 0; i < matchedDocs.length; i += 400) {
                    const batch = adminDb.batch();
                    for (const doc of matchedDocs.slice(i, i + 400)) {
                        batch.update(doc.ref, { restaurant: toName });
                        updatedWeeks++;
                    }
                    await batch.commit();
                }

                // Migrate the map location: keep the target's location if it has one,
                // otherwise adopt the first source location; then delete the source docs.
                const toLocRef = adminDb.collection("restaurantLocations").doc(restaurantSlug(toName));
                const toLocSnap = await toLocRef.get();
                let targetHasLocation = toLocSnap.exists;
                for (const fromName of fromNames) {
                    const fromRef = adminDb.collection("restaurantLocations").doc(restaurantSlug(fromName));
                    const fromSnap = await fromRef.get();
                    if (!fromSnap.exists) continue;
                    if (!targetHasLocation) {
                        const d = fromSnap.data() as any;
                        await toLocRef.set(
                            {
                                name: toName,
                                lat: d?.lat,
                                lng: d?.lng,
                                address: d?.address ?? null,
                                mapsUrl: d?.mapsUrl ?? null,
                                addedBy: d?.addedBy ?? authName,
                                updatedAt: Timestamp.now(),
                            },
                            { merge: true }
                        );
                        targetHasLocation = true;
                    }
                    await fromRef.delete();
                }

                return NextResponse.json({ result: { updatedWeeks, mergedNames: fromNames.length } });
            }

            // ---------- IMPROMPTU MEETUP ("أنا فاضي") ----------
            case "startImpromptuMeetup": {
                if (!authName) throw new Error("Unauthorized");
                const message = asTrimmedString(payload?.message).slice(0, 120);

                // Auto-fail any stale "open" meetups (past expiry) so we don't block new ones.
                const now = Date.now();
                const staleSnap = await adminDb
                    .collection("impromptuMeetups")
                    .where("status", "==", "open")
                    .get();
                const staleBatch = adminDb.batch();
                let staleCount = 0;
                staleSnap.forEach((d) => {
                    const data = d.data() as any;
                    if (data.expiresAtMs < now) {
                        staleBatch.update(d.ref, { status: "failed", resolvedAt: now });
                        staleCount++;
                    }
                });
                if (staleCount > 0) await staleBatch.commit();

                // Reject if a fresh "open" meetup already exists.
                const freshSnap = await adminDb
                    .collection("impromptuMeetups")
                    .where("status", "==", "open")
                    .limit(1)
                    .get();
                if (!freshSnap.empty) {
                    throw new Error("في لقاء مفاجئ مفتوح حالياً — انتظر يخلص");
                }

                const newRef = adminDb.collection("impromptuMeetups").doc();
                await newRef.set({
                    initiator: authName,
                    message,
                    createdAtMs: now,
                    expiresAtMs: now + 15 * 60 * 1000,
                    status: "open",
                    responses: {},
                    threshold: 3,
                    resolvedAt: null,
                });

                // Fire-and-forget push notification to all members.
                sendPushNotification(
                    {
                        title: `🚨 ${authName} فاضي!`,
                        body: message
                            ? `"${message}" — مين معاه؟ ردّ خلال 15 دقيقة`
                            : "فاضي بكير، مين معاه؟ ردّ خلال 15 دقيقة",
                        type: "impromptu-meetup",
                        tag: `impromptu-${newRef.id}`,
                        url: "/?tab=week",
                        payload: { meetupId: newRef.id },
                    },
                    {}
                ).catch((err) => {
                    console.error("Failed to send impromptu start notification:", err);
                });

                return NextResponse.json({ result: { meetupId: newRef.id } });
            }

            case "respondImpromptuMeetup": {
                if (!authName) throw new Error("Unauthorized");
                const meetupId = asTrimmedString(payload?.meetupId);
                const status = asTrimmedString(payload?.status);
                if (!meetupId) throw new Error("missing meetupId");
                if (!["free", "busy", "maybe"].includes(status)) throw new Error("invalid status");

                const ref = adminDb.collection("impromptuMeetups").doc(meetupId);
                const beforeWasOpen = await adminDb.runTransaction(async (tx) => {
                    const snap = await tx.get(ref);
                    if (!snap.exists) throw new Error("Meetup not found");
                    const data = snap.data() as any;

                    if (data.initiator === authName) throw new Error("أنت اللي بدا اللقاء");
                    if (data.status !== "open") throw new Error("اللقاء انتهى");
                    if (Date.now() > data.expiresAtMs) {
                        tx.update(ref, { status: "failed", resolvedAt: Date.now() });
                        throw new Error("انتهى الوقت");
                    }

                    const responses = { ...(data.responses || {}) };
                    responses[authName] = { status, atMs: Date.now() };

                    // Recompute free count (initiator counts as 1).
                    let freeCount = 1;
                    for (const [n, r] of Object.entries(responses)) {
                        if (n !== data.initiator && (r as any).status === "free") freeCount++;
                    }

                    const updates: Record<string, unknown> = { responses };
                    if (freeCount >= (data.threshold || 3)) {
                        updates.status = "succeeded";
                        updates.resolvedAt = Date.now();
                    }
                    tx.update(ref, updates);
                    return data.status === "open" && updates.status === "succeeded";
                });

                if (beforeWasOpen) {
                    sendPushNotification(
                        {
                            title: "🎉 اللقاء تأكد!",
                            body: "3+ أعضاء فاضيين. نسّقوا في الواتساب",
                            type: "impromptu-meetup",
                            tag: `impromptu-success-${meetupId}`,
                            url: "/?tab=week",
                            payload: { meetupId },
                        },
                        {}
                    ).catch((err) => console.error("impromptu success push failed:", err));
                }

                return NextResponse.json({ result: true });
            }

            case "cancelImpromptuMeetup": {
                if (!authName) throw new Error("Unauthorized");
                const meetupId = asTrimmedString(payload?.meetupId);
                if (!meetupId) throw new Error("missing meetupId");
                const ref = adminDb.collection("impromptuMeetups").doc(meetupId);
                const snap = await ref.get();
                if (!snap.exists) throw new Error("Meetup not found");
                const data = snap.data() as any;
                if (data.initiator !== authName && !isAdmin) {
                    throw new Error("اللي بدا اللقاء يقدر يلغيه فقط");
                }
                if (data.status !== "open") return NextResponse.json({ result: true });
                await ref.update({ status: "canceled", resolvedAt: Date.now() });
                return NextResponse.json({ result: true });
            }

            // ---------- AI OUTING PLANNER ----------
            case "planOuting": {
                if (!authName) throw new Error("Unauthorized");
                const query = asTrimmedString(payload?.query).slice(0, 200);

                // Build the set of restaurant names the group has already visited
                // (completed weeks) so the planner can prefer new / familiar places.
                const visitedNames = new Set<string>();
                const weeksSnap = await adminDb
                    .collection("weeks")
                    .where("status", "==", "completed")
                    .get();
                weeksSnap.forEach((d) => {
                    const r = (d.data() as any)?.restaurant;
                    if (typeof r === "string" && r.trim()) {
                        visitedNames.add(r.normalize("NFKC").replace(/ـ/g, "").replace(/\s+/g, " ").trim().toLowerCase());
                    }
                });

                const result = planOuting(query, visitedNames, 175);
                return NextResponse.json({ result });
            }

            // ---------- STYLE PREFERENCE VOTE ----------
            case "voteStylePreference": {
                if (!authName) throw new Error("Unauthorized");
                const style = asTrimmedString(payload?.style);
                const VALID_STYLES = ["minimal", "glass", "editorial", "pastel", "current", "neon", "brutalist", "terminal", "luxe", "comic", "aurora", "stories", "console", "bento"];
                if (!VALID_STYLES.includes(style)) throw new Error("ستايل غير معروف");
                await adminDb.collection("stylePreferences").doc(authName).set({
                    userName: authName,
                    style,
                    votedAt: Timestamp.now(),
                });
                return NextResponse.json({ result: true });
            }

            case "updatePrankConfig": {
                if (!isAdmin) throw new Error("Dean only");
                const userName = asTrimmedString(payload?.userName);
                if (!userName) throw new Error("userName required");
                const updates = (payload?.updates && typeof payload.updates === "object") ? payload.updates : {};
                // Allow only known fields
                const ALLOWED = new Set([
                    "enabled", "intensity",
                    "textGlitch", "aiWhispers", "phantomPush",
                    "leaderboardIllusion", "screenGlitch",
                ]);
                const filtered: Record<string, unknown> = { updatedAtMs: Date.now() };
                for (const [k, v] of Object.entries(updates)) {
                    if (ALLOWED.has(k)) filtered[k] = v;
                }
                await adminDb.collection("prankConfig").doc(userName).set(filtered, { merge: true });
                return NextResponse.json({ result: true });
            }

            case "triggerPhantomPush": {
                if (!isAdmin) throw new Error("Dean only");
                const targetName = asTrimmedString(payload?.userName);
                if (!targetName) throw new Error("userName required");
                const customText = typeof payload?.customText === "string" ? payload.customText.trim() : "";
                const { sendPushNotification } = await import("@/lib/pushHelper");
                const lines = [
                    `${targetName}... شفت اللي عملته؟ 👁`,
                    `يا ${targetName}، البيت اللي ضفته في تل أبيب يطاردنا 🇮🇱👻`,
                    `${targetName}, نعرف وين كنت قبل ساعة 📍`,
                    `يا ${targetName}، الكاميرا شغّالة. 📷`,
                    `${targetName}... نشوفك من خلال الشاشة الآن.`,
                    `يا ${targetName}، النكتة اللي كنت تحضّرها ضاعت — صار عندنا 🎲`,
                    `${targetName}، هل أنت متأكد إنك لحالك في الغرفة؟ 🪑`,
                ];
                const body = customText || lines[Math.floor(Math.random() * lines.length)];
                const result = await sendPushNotification(
                    { title: "👻", body, type: "default", tag: `phantom-${Date.now()}`, url: "/" },
                    { userNames: [targetName] },
                );
                return NextResponse.json({ result: true, sentCount: result.sentCount });
            }
        }
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error: any) {
        console.error(`RPC Error (${(error as any)?.action || 'unknown'}):`, error);
        return NextResponse.json({ error: error.message || "An unexpected error occurred." }, { status: 500 });
    }
}
