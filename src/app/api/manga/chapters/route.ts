/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش ترتّب الفصول؟"
 * قال: "عشان ما تصير مثل مجلدات مشاريعكم... اسمها final_v2_final_real 😂🗂️"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_API, WC_BASE, mdFetchJson, vxFetchJson, wcFetchText } from "../_lib";

export const runtime = "nodejs";

async function mangadexChapters(mangaId: string, lang: string) {
    if (!/^[0-9a-f-]{36}$/i.test(mangaId)) throw new Error("معرّف مانجا غير صالح");
    const url =
        `${MD_API}/manga/${mangaId}/feed` +
        `?translatedLanguage[]=${encodeURIComponent(lang)}` +
        `&order[chapter]=asc&limit=100&offset=0` +
        `&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica` +
        `&includes[]=scanlation_group`;
    const data = await mdFetchJson(url);
    return (data?.data || [])
        .map((c: any) => ({
            id: c.id,
            chapter: c.attributes?.chapter ?? null,
            title: c.attributes?.title || "",
            pages: c.attributes?.pages ?? 0,
        }))
        .filter((c: any) => c.pages > 0);
}

async function weebChapters(seriesId: string) {
    if (!/^[A-Z0-9]{10,40}$/.test(seriesId)) throw new Error("معرّف غير صالح");
    const html = await wcFetchText(`${WC_BASE}/series/${seriesId}/full-chapter-list`);
    const out: any[] = [];
    const re = /href="https:\/\/weebcentral\.com\/chapters\/([A-Z0-9]+)"([\s\S]*?)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        const id = m[1];
        const nameMatch = m[2].match(/<span[^>]*>([^<]*(?:Chapter|Episode|Vol)[^<]*)<\/span>/i);
        const name = (nameMatch ? nameMatch[1] : "").trim();
        out.push({ id, chapter: name.replace(/^\D*/, "").trim() || name || "؟", title: name, pages: 1 });
    }
    // WeebCentral lists newest-first → reverse to ascending.
    return out.reverse();
}

async function vortexChapters(slug: string) {
    const data = await vxFetchJson(`/manga/${encodeURIComponent(slug)}/chapters`);
    return (data?.data?.chapters || [])
        // Skip locked/paid chapters — we can't read their pages.
        .filter((c: any) => c.accessible !== false && c.locked !== true)
        .map((c: any) => ({
            id: String(c.id),
            chapter: c.number != null ? String(c.number) : (c.slug || "؟"),
            title: c.title || "",
            pages: 1, // unknown until opened; non-zero so it isn't filtered
        }))
        .sort((a: any, b: any) => parseFloat(a.chapter) - parseFloat(b.chapter));
}

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const sp = new URL(request.url).searchParams;
    const source = sp.get("source") || "mangadex";
    const mangaId = sp.get("mangaId")?.trim() || "";
    const lang = (sp.get("lang")?.trim() || "en").slice(0, 5);
    if (!mangaId) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    try {
        const chapters = source === "vortex" ? await vortexChapters(mangaId)
            : source === "weeb" ? await weebChapters(mangaId)
            : await mangadexChapters(mangaId, lang);
        return NextResponse.json({ chapters, total: chapters.length });
    } catch (e) {
        console.error("manga chapters error", e);
        return NextResponse.json({ error: "تعذّر جلب الفصول" }, { status: 502 });
    }
}
