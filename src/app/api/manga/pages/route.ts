/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كم صفحة تقدر تقرأ؟"
 * قال: "كلها دفعة وحدة... بس ما بتذكر منها شي زي ما تقرأون الشروط والأحكام 😂📜"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_API, WC_BASE, MP_BASE, mdFetchJson, vxFetchJson, wcFetchText, mpFetchText } from "../_lib";

export const runtime = "nodejs";

async function mangadexPages(chapterId: string): Promise<string[]> {
    if (!/^[0-9a-f-]{36}$/i.test(chapterId)) throw new Error("معرّف فصل غير صالح");
    const data = await mdFetchJson(`${MD_API}/at-home/server/${chapterId}`);
    const baseUrl = data?.baseUrl;
    const hash = data?.chapter?.hash;
    const files: string[] = data?.chapter?.data || [];
    if (!baseUrl || !hash || files.length === 0) return [];
    return files.map((f) => `${baseUrl}/data/${hash}/${f}`);
}

async function vortexPages(chapterId: string): Promise<string[]> {
    if (!/^\d+$/.test(chapterId)) throw new Error("معرّف فصل غير صالح");
    const data = await vxFetchJson(`/chapter/${chapterId}`);
    const imgs: string[] = data?.data?.images || [];
    return imgs.filter((u) => typeof u === "string");
}

async function pillPages(chapterId: string): Promise<string[]> {
    if (!/^[a-z0-9/-]+$/i.test(chapterId)) throw new Error("معرّف فصل غير صالح");
    const html = await mpFetchText(`${MP_BASE}/chapters/${chapterId}`);
    const out: string[] = [];
    // MangaPill lazy-loads page images via data-src.
    const re = /data-src="(https?:\/\/[^"]+\.(?:webp|jpg|jpeg|png))"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) out.push(m[1]);
    return out;
}

async function weebPages(chapterId: string): Promise<string[]> {
    if (!/^[A-Z0-9]{10,40}$/.test(chapterId)) throw new Error("معرّف فصل غير صالح");
    const html = await wcFetchText(
        `${WC_BASE}/chapters/${chapterId}/images?is_prev=False&current_page=1&reading_style=long_strip`,
    );
    const out: string[] = [];
    const re = /src="(https?:\/\/[^"]+\.(?:webp|jpg|jpeg|png))"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) out.push(m[1]);
    return out;
}

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const sp = new URL(request.url).searchParams;
    const source = sp.get("source") || "mangadex";
    const chapterId = sp.get("chapterId")?.trim() || "";
    if (!chapterId) return NextResponse.json({ error: "معرّف فصل غير صالح" }, { status: 400 });

    try {
        const pages = source === "vortex" ? await vortexPages(chapterId)
            : source === "weeb" ? await weebPages(chapterId)
            : source === "pill" ? await pillPages(chapterId)
            : await mangadexPages(chapterId);
        if (pages.length === 0) return NextResponse.json({ error: "ما فيه صفحات لهذا الفصل" }, { status: 404 });
        return NextResponse.json({ pages, count: pages.length });
    } catch (e) {
        console.error("manga pages error", e);
        return NextResponse.json({ error: "تعذّر جلب الصفحات" }, { status: 502 });
    }
}
