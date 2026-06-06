import { adminDb } from "./firebase-admin";

/**
 * Shared push-notification helper. All /api/reminders/* routes (and the cron
 * job) should go through this so payloads have a consistent shape that the
 * service worker understands (type, tag, actions, vibration, deep-link URL).
 */

export type NotificationType =
    | "king-decision"
    | "attendance-pending"
    | "attendance-complete"
    | "rating-unlocked"
    | "voting"
    | "outing-today"
    | "restaurant-change"
    | "day-change"
    | "impromptu-meetup"
    | "default";

export interface PushPayload {
    title: string;
    body: string;
    type?: NotificationType;
    /** Tag (collapses duplicate notifications). Defaults to type when omitted. */
    tag?: string;
    /** Deep-link URL opened on click (without action) */
    url?: string;
    /** Optional large image for Android */
    image?: string;
    /** Optional opaque payload forwarded to the SW for the main app */
    payload?: Record<string, unknown>;
}

let webpushSingleton: any = null;
let initAttempted = false;
let initSucceeded = false;

function initWebPush() {
    if (initAttempted) return initSucceeded;
    initAttempted = true;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublicKey || !vapidPrivateKey) return false;

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const webpush = require("web-push");
        webpush.setVapidDetails(
            "mailto:abo0odi_8@yahoo.com",
            vapidPublicKey,
            vapidPrivateKey
        );
        webpushSingleton = webpush;
        initSucceeded = true;
        return true;
    } catch (e) {
        console.error("Failed to initialize web-push:", e);
        return false;
    }
}

interface SendOptions {
    /** Names of users to send to. If omitted, sends to all users with subscriptions. */
    userNames?: string[];
    /** Skip these users (e.g., the king). */
    excludeNames?: string[];
}

/**
 * Send a push to one or many users. Returns the number of pushes successfully sent.
 */
export async function sendPushNotification(
    payload: PushPayload,
    options: SendOptions = {}
): Promise<{ sentCount: number; failedCount: number; reason?: string }> {
    const ok = initWebPush();
    if (!ok) {
        return { sentCount: 0, failedCount: 0, reason: "web-push not configured" };
    }

    const usersSnap = await adminDb.collection("users").get();
    let users = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    if (options.userNames && options.userNames.length > 0) {
        const set = new Set(options.userNames);
        users = users.filter((u) => set.has(u.name));
    }
    if (options.excludeNames && options.excludeNames.length > 0) {
        const set = new Set(options.excludeNames);
        users = users.filter((u) => !set.has(u.name));
    }

    const finalPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        type: payload.type || "default",
        tag: payload.tag || payload.type || "default",
        url: payload.url || "/",
        image: payload.image,
        payload: payload.payload || null,
    });

    let sentCount = 0;
    let failedCount = 0;

    await Promise.all(
        users.map(async (user) => {
            if (!user.pushSubscription) return;
            try {
                const sub = JSON.parse(user.pushSubscription);
                await webpushSingleton.sendNotification(sub, finalPayload);
                sentCount++;
            } catch (err: any) {
                failedCount++;
                console.error(`Push to ${user.name} failed:`, err?.message || err);
            }
        })
    );

    return { sentCount, failedCount };
}
