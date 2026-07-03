/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "تقدر تقرأ مانجا؟"
 * قال: "أقرأها وأترجمها وأرتبها... بس ما أقدر أعيط على موت الشخصية 😭🤖"
 *
 * ⚠️ ميزة معزولة بالكامل — كل شي تحت src/app/api/manga + src/app/manga.
 * حذف الميزة = حذف المجلدين + رابط العميد. ما تعتمد على أي منطق ثاني في التطبيق.
 */

import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

// A polite UA — MangaDex asks API clients to identify themselves.
export const MD_UA = "KingOfThursday/1.0 (private friends manga reader)";
export const MD_API = "https://api.mangadex.org";

// VortexScans — free manhwa/manhua source (no key). Comick was dropped: it sits
// behind Cloudflare and 403s any datacenter request, so it can't work on Render.
export const VX_API = "https://vortexscans.vercel.app/api/v1";
export const VX_UA = "Mozilla/5.0 (compatible; KingOfThursday/1.0)";

export type MangaSource = "mangadex" | "vortex";

/** Gate every manga route behind the dean role. Returns null when allowed. */
export async function requireDean(request: Request): Promise<NextResponse | null> {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"] });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return null;
}

/** SSRF guard: only ever fetch images from the whitelisted source hosts. */
export function isAllowedImageHost(rawUrl: string): boolean {
    try {
        const u = new URL(rawUrl);
        if (u.protocol !== "https:") return false;
        const h = u.hostname.toLowerCase();
        return (
            h === "uploads.mangadex.org" ||
            h.endsWith(".mangadex.org") ||
            h.endsWith(".mangadex.network") ||
            h === "storage.vortexscans.org" ||
            h.endsWith(".vortexscans.org")
        );
    } catch {
        return false;
    }
}

/** Fetch JSON from the VortexScans API. */
export async function vxFetchJson(path: string): Promise<any> {
    const res = await fetch(`${VX_API}${path}`, {
        headers: { "User-Agent": VX_UA, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Vortex ${res.status}`);
    return res.json();
}

/** Fetch JSON from the MangaDex API with the UA header + a timeout. */
export async function mdFetchJson(url: string): Promise<any> {
    const res = await fetch(url, {
        headers: { "User-Agent": MD_UA, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
        throw new Error(`MangaDex ${res.status}`);
    }
    return res.json();
}

/** Pick a human-friendly title from MangaDex's localized title maps. */
export function pickTitle(attributes: any): string {
    const t = attributes?.title || {};
    const alt = Array.isArray(attributes?.altTitles) ? attributes.altTitles : [];
    return (
        t.en ||
        t.ja ||
        t["ja-ro"] ||
        Object.values(t)[0] ||
        (alt.map((a: any) => a?.en).find(Boolean)) ||
        "بدون عنوان"
    ) as string;
}
