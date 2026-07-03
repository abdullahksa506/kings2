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

/** Gate every manga route behind the dean role. Returns null when allowed. */
export async function requireDean(request: Request): Promise<NextResponse | null> {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"] });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return null;
}

/** SSRF guard: only ever fetch images from MangaDex-owned hosts. */
export function isAllowedImageHost(rawUrl: string): boolean {
    try {
        const u = new URL(rawUrl);
        if (u.protocol !== "https:") return false;
        const h = u.hostname.toLowerCase();
        return (
            h === "uploads.mangadex.org" ||
            h.endsWith(".mangadex.org") ||
            h.endsWith(".mangadex.network")
        );
    } catch {
        return false;
    }
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
