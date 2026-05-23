// Server-only: encrypts the full Coup game state so hidden cards never leak to
// clients (who can read the room doc directly via the Firestore SDK).
// The key is derived from the existing service-account secret — no new env var.

import crypto from "crypto";
import { CoupGameState } from "./types";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
    if (cachedKey) return cachedKey;
    const source =
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
        process.env.COUP_SECRET_KEY ||
        "coup-dev-fallback-key-not-for-production";
    cachedKey = crypto.createHash("sha256").update(source).digest();
    return cachedKey;
}

export function encryptState(state: CoupGameState): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
    const plaintext = Buffer.from(JSON.stringify(state), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptState(blob: string): CoupGameState {
    const raw = Buffer.from(blob, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as CoupGameState;
}
