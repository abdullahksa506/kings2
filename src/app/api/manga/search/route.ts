/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كيف تبحث بهالسرعة؟"
 * قال: "ما عندي غير الشغل... مو مثلكم تفتحون تويتر كل خمس دقايق 😂🐦"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_API, mdFetchJson, vxFetchJson, pickTitle } from "../_lib";

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

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (!q) return NextResponse.json({ error: "اكتب اسم المانجا" }, { status: 400 });
    if (q.length > 120) return NextResponse.json({ error: "البحث طويل" }, { status: 400 });

    // Both sources in parallel; one failing doesn't sink the other.
    const [md, vx] = await Promise.allSettled([searchMangaDex(q), searchVortex(q)]);
    const results = [
        ...(md.status === "fulfilled" ? md.value : []),
        ...(vx.status === "fulfilled" ? vx.value : []),
    ];

    if (results.length === 0 && md.status === "rejected" && vx.status === "rejected") {
        return NextResponse.json({ error: "تعذّر البحث الآن، حاول بعد شوي" }, { status: 502 });
    }
    return NextResponse.json({ results });
}
