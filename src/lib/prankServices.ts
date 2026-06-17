/**
 * Prank Mode — targeted "psychological horror" effects for specific members.
 * Dean controls everything; affected user gets effects on their client.
 * Master switch always exists for instant kill.
 */

import { collection, doc, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { invokeRpc } from "./services";

export type PrankIntensity = "light" | "medium" | "scary";

export interface PrankConfig {
    userName: string;
    enabled: boolean;
    intensity: PrankIntensity;
    textGlitch: boolean;
    aiWhispers: boolean;
    phantomPush: boolean;
    leaderboardIllusion: boolean;
    screenGlitch: boolean;
    updatedAtMs?: number;
}

export const DEFAULT_CONFIG: Omit<PrankConfig, "userName"> = {
    enabled: false,
    intensity: "light",
    textGlitch: true,
    aiWhispers: true,
    phantomPush: true,
    leaderboardIllusion: true,
    screenGlitch: true,
};

const COLLECTION = "prankConfig";

/** Listen to one user's prank config (used by their own client). */
export function listenToPrankConfig(
    userName: string,
    cb: (cfg: PrankConfig) => void,
): () => void {
    return onSnapshot(doc(db, COLLECTION, userName), (snap) => {
        if (!snap.exists()) {
            cb({ userName, ...DEFAULT_CONFIG });
            return;
        }
        const d = snap.data() as Partial<PrankConfig>;
        cb({
            userName,
            enabled: !!d.enabled,
            intensity: d.intensity || "light",
            textGlitch: d.textGlitch ?? true,
            aiWhispers: d.aiWhispers ?? true,
            phantomPush: d.phantomPush ?? true,
            leaderboardIllusion: d.leaderboardIllusion ?? true,
            screenGlitch: d.screenGlitch ?? true,
            updatedAtMs:
                typeof (d.updatedAtMs as unknown) === "number"
                    ? (d.updatedAtMs as number)
                    : undefined,
        });
    });
}

/** Dean reads all configs for the control panel. */
export async function getAllPrankConfigs(): Promise<PrankConfig[]> {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => {
        const data = d.data() as Partial<PrankConfig>;
        return {
            userName: d.id,
            enabled: !!data.enabled,
            intensity: data.intensity || "light",
            textGlitch: data.textGlitch ?? true,
            aiWhispers: data.aiWhispers ?? true,
            phantomPush: data.phantomPush ?? true,
            leaderboardIllusion: data.leaderboardIllusion ?? true,
            screenGlitch: data.screenGlitch ?? true,
        };
    });
}

/** Dean updates a user's config (server-authoritative). */
export async function updatePrankConfig(
    userName: string,
    updates: Partial<Omit<PrankConfig, "userName">>,
): Promise<void> {
    await invokeRpc("updatePrankConfig", { userName, updates });
}

/** Dean triggers a phantom push to the target right now. */
export async function triggerPhantomPush(
    userName: string,
    customText?: string,
): Promise<{ sent: boolean }> {
    return invokeRpc("triggerPhantomPush", { userName, customText });
}
