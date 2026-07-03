/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "كم صفحة تقدر تقرأ؟"
 * قال: "كلها دفعة وحدة... بس ما بتذكر منها شي زي ما تقرأون الشروط والأحكام 😂📜"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_API, mdFetchJson } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const chapterId = new URL(request.url).searchParams.get("chapterId")?.trim() || "";
    if (!/^[0-9a-f-]{36}$/i.test(chapterId)) {
        return NextResponse.json({ error: "معرّف فصل غير صالح" }, { status: 400 });
    }

    try {
        // At-home server → { baseUrl, chapter: { hash, data[], dataSaver[] } }.
        // The baseUrl is valid ~15 min; the client re-requests if it expires.
        const data = await mdFetchJson(`${MD_API}/at-home/server/${chapterId}`);
        const baseUrl = data?.baseUrl;
        const hash = data?.chapter?.hash;
        const files: string[] = data?.chapter?.data || [];
        if (!baseUrl || !hash || files.length === 0) {
            return NextResponse.json({ error: "ما فيه صفحات لهذا الفصل" }, { status: 404 });
        }

        // Full original-quality page image URLs (proxied later via /api/manga/image).
        const pages = files.map((f) => `${baseUrl}/data/${hash}/${f}`);
        return NextResponse.json({ pages, count: pages.length });
    } catch (e) {
        console.error("manga pages error", e);
        return NextResponse.json({ error: "تعذّر جلب الصفحات" }, { status: 502 });
    }
}
