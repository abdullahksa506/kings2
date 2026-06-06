"use client";

/*
 * 🤖 نكتة AI:
 * كلود سُئل: ليش تبني ميزة لقاء مفاجئ؟
 * قال: لأن الواتساب ضايع، الزفت كله "أحد فاضي؟" بدون تنظيم 😂📱
 */

import { db } from "./firebase";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { invokeRpc } from "./services";

export type ImpromptuStatus = "open" | "succeeded" | "failed" | "canceled";
export type ResponseChoice = "free" | "busy" | "maybe";

export interface ImpromptuResponse {
    status: ResponseChoice;
    atMs: number;
}

export interface ImpromptuMeetup {
    id: string;
    initiator: string;
    message: string;
    createdAtMs: number;
    expiresAtMs: number;
    status: ImpromptuStatus;
    responses: Record<string, ImpromptuResponse>;
    threshold: number;
    resolvedAt: number | null;
}

const COLLECTION = "impromptuMeetups";
// Show recently-resolved meetups for 30 minutes so members see the result.
const RECENT_RESOLVED_MS = 30 * 60 * 1000;

export const impromptuServices = {
    /**
     * Listen to the most recent meetup. Returns null when none exist, when the
     * latest is canceled, or when a resolved meetup is older than 30 minutes.
     */
    listenToActiveMeetup(cb: (meetup: ImpromptuMeetup | null) => void) {
        const q = query(collection(db, COLLECTION), orderBy("createdAtMs", "desc"), limit(1));
        return onSnapshot(q, (snap) => {
            if (snap.empty) {
                cb(null);
                return;
            }
            const doc = snap.docs[0];
            const data = doc.data() as Omit<ImpromptuMeetup, "id">;
            const meetup: ImpromptuMeetup = { id: doc.id, ...data };

            if (meetup.status === "canceled") {
                cb(null);
                return;
            }
            if (meetup.status !== "open") {
                const resolvedAt = meetup.resolvedAt ?? meetup.expiresAtMs;
                if (Date.now() - resolvedAt > RECENT_RESOLVED_MS) {
                    cb(null);
                    return;
                }
            }
            cb(meetup);
        });
    },

    startMeetup(message: string): Promise<{ meetupId: string }> {
        return invokeRpc("startImpromptuMeetup", { message });
    },

    respondMeetup(meetupId: string, status: ResponseChoice) {
        return invokeRpc("respondImpromptuMeetup", { meetupId, status });
    },

    cancelMeetup(meetupId: string) {
        return invokeRpc("cancelImpromptuMeetup", { meetupId });
    },

    /** Count free members for a meetup (initiator counts as free implicitly). */
    countFree(meetup: ImpromptuMeetup): number {
        let count = 1; // initiator
        for (const [name, r] of Object.entries(meetup.responses || {})) {
            if (name !== meetup.initiator && r.status === "free") count++;
        }
        return count;
    },

    /** Returns the effective status (open meetups past expiry are treated as failed). */
    effectiveStatus(meetup: ImpromptuMeetup): ImpromptuStatus {
        if (meetup.status === "open" && Date.now() > meetup.expiresAtMs) {
            return "failed";
        }
        return meetup.status;
    },
};
