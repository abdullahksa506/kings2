/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش ترتّب الفصول؟"
 * قال: "عشان ما تصير مثل مجلدات مشاريعكم... اسمها final_v2_final_real 😂🗂️"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_API, mdFetchJson } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const sp = new URL(request.url).searchParams;
    const mangaId = sp.get("mangaId")?.trim() || "";
    const lang = (sp.get("lang")?.trim() || "en").slice(0, 5);
    if (!/^[0-9a-f-]{36}$/i.test(mangaId)) {
        return NextResponse.json({ error: "معرّف مانجا غير صالح" }, { status: 400 });
    }

    try {
        const url =
            `${MD_API}/manga/${mangaId}/feed` +
            `?translatedLanguage[]=${encodeURIComponent(lang)}` +
            `&order[chapter]=asc&limit=100&offset=0` +
            `&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica` +
            `&includes[]=scanlation_group`;
        const data = await mdFetchJson(url);

        const chapters = (data?.data || [])
            .map((c: any) => ({
                id: c.id,
                chapter: c.attributes?.chapter ?? null,
                volume: c.attributes?.volume ?? null,
                title: c.attributes?.title || "",
                pages: c.attributes?.pages ?? 0,
                lang: c.attributes?.translatedLanguage || lang,
            }))
            // Drop external chapters (no pages hosted on MangaDex → can't read here).
            .filter((c: any) => c.pages > 0);

        return NextResponse.json({ chapters, total: chapters.length });
    } catch (e) {
        console.error("manga chapters error", e);
        return NextResponse.json({ error: "تعذّر جلب الفصول" }, { status: 502 });
    }
}
