/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كيف تبحث بهالسرعة؟"
 * قال: "ما عندي غير الشغل... مو مثلكم تفتحون تويتر كل خمس دقايق 😂🐦"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_API, WC_BASE, mdFetchJson, vxFetchJson, wcFetchText, pickTitle } from "../_lib";

export const runtime = "nodejs";

// Unified search: query MangaDex (manga) AND VortexScans (manhwa) in parallel and
// merge into ONE result list. Each result carries its `source` so the reader knows
// where to fetch chapters/pages from — no manual source toggle for the user.

async function searchMangaDex(q: string) {
    const url =
        `${MD_API}/manga?title=${encodeURIComponent(q)}` +
        `&limit=12&order[relevance]=desc` +
        `&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica` +
        `&includes[]=cover_art`;
    const data = await mdFetchJson(url);
    return (data?.data || []).map((m: any) => {
        const coverRel = (m.relationships || []).find((r: any) => r.type === "cover_art");
        const fileName = coverRel?.attributes?.fileName;
        return {
            id: m.id,
            source: "mangadex" as const,
            title: pickTitle(m.attributes),
            year: m.attributes?.year ?? null,
            coverUrl: fileName ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg` : null,
            availableLangs: m.attributes?.availableTranslatedLanguages || [],
            kind: "مانجا",
        };
    });
}

async function searchVortex(q: string) {
    const data = await vxFetchJson(`/search?q=${encodeURIComponent(q)}`);
    return (data?.data || []).slice(0, 12).map((m: any) => ({
        id: m.slug,                    // Vortex identifies series by slug
        source: "vortex" as const,
        title: m.title || "بدون عنوان",
        year: null,
        coverUrl: m.image || null,     // already a full URL
        availableLangs: [],            // pre-translated; no language picker
        kind: "مانهوا",
    }));
}

async function searchWeeb(q: string) {
    const html = await wcFetchText(
        `${WC_BASE}/search/data?text=${encodeURIComponent(q)}&sort=Best+Match&order=Descending&official=Any&anime=Any&adult=Any&display_mode=Full+Display`,
    );
    const seen = new Set<string>();
    const out: any[] = [];
    const re = /\/series\/([A-Z0-9]+)\/([^"?]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && out.length < 12) {
        const id = m[1];
        if (seen.has(id)) continue;
        seen.add(id);
        const title = decodeURIComponent(m[2]).replace(/[-_]+/g, " ").trim();
        out.push({
            id,
            source: "weeb" as const,
            title: title || "بدون عنوان",
            year: null,
            coverUrl: `https://temp.compsci88.com/cover/normal/${id}.webp`,
            availableLangs: [],
            kind: "WC",
        });
    }
    return out;
}

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (!q) return NextResponse.json({ error: "اكتب اسم المانجا" }, { status: 400 });
    if (q.length > 120) return NextResponse.json({ error: "البحث طويل" }, { status: 400 });

    // All sources in parallel; one failing doesn't sink the others.
    // WeebCentral first: it has the biggest, most complete catalog — MangaDex often
    // only has a few "external" (unreadable) chapters for licensed titles like One
    // Piece, so leading with WC lands users on the version that actually has chapters.
    const [md, vx, wc] = await Promise.allSettled([searchMangaDex(q), searchVortex(q), searchWeeb(q)]);
    const results = [
        ...(wc.status === "fulfilled" ? wc.value : []),
        ...(md.status === "fulfilled" ? md.value : []),
        ...(vx.status === "fulfilled" ? vx.value : []),
    ];

    if (results.length === 0 && md.status === "rejected" && vx.status === "rejected" && wc.status === "rejected") {
        return NextResponse.json({ error: "تعذّر البحث الآن، حاول بعد شوي" }, { status: 502 });
    }
    return NextResponse.json({ results });
}
