/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كيف تبحث بهالسرعة؟"
 * قال: "ما عندي غير الشغل... مو مثلكم تفتحون تويتر كل خمس دقايق 😂🐦"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_API, mdFetchJson, pickTitle } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (!q) return NextResponse.json({ error: "اكتب اسم المانجا" }, { status: 400 });
    if (q.length > 120) return NextResponse.json({ error: "البحث طويل" }, { status: 400 });

    try {
        const url =
            `${MD_API}/manga?title=${encodeURIComponent(q)}` +
            `&limit=15&order[relevance]=desc` +
            `&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica` +
            `&includes[]=cover_art`;
        const data = await mdFetchJson(url);

        const results = (data?.data || []).map((m: any) => {
            const coverRel = (m.relationships || []).find((r: any) => r.type === "cover_art");
            const fileName = coverRel?.attributes?.fileName;
            // 256px thumbnail — served (proxied) via /api/manga/image.
            const coverUrl = fileName
                ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg`
                : null;
            return {
                id: m.id,
                title: pickTitle(m.attributes),
                year: m.attributes?.year ?? null,
                status: m.attributes?.status ?? null,
                coverUrl,
                availableLangs: m.attributes?.availableTranslatedLanguages || [],
            };
        });

        return NextResponse.json({ results });
    } catch (e) {
        console.error("manga search error", e);
        return NextResponse.json({ error: "تعذّر البحث الآن، حاول بعد شوي" }, { status: 502 });
    }
}
