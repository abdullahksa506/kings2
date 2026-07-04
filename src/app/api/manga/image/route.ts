/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تجيب الصور بنفسك؟"
 * قال: "عشان المتصفح جبان ويخاف من CORS... أنا ما أخاف إلا من انقطاع الكهرباء 😂🔌"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_UA, isAllowedImageHost, refererFor } from "../_lib";

export const runtime = "nodejs";

// Server-side image proxy. MangaDex protects against hotlinking and the browser
// can't fetch cross-origin bytes, so we fetch here (SSRF-guarded to MD hosts)
// and stream the image back to the reader.
export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const src = new URL(request.url).searchParams.get("src") || "";
    if (!src || !isAllowedImageHost(src)) {
        return NextResponse.json({ error: "مصدر صورة غير مسموح" }, { status: 400 });
    }

    try {
        const upstream = await fetch(src, {
            headers: { "User-Agent": MD_UA, Referer: refererFor(src) },
            signal: AbortSignal.timeout(20000),
        });
        if (!upstream.ok || !upstream.body) {
            return NextResponse.json({ error: "تعذّر تحميل الصورة" }, { status: 502 });
        }
        const contentType = upstream.headers.get("content-type") || "image/jpeg";
        return new NextResponse(upstream.body, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "private, max-age=900",
            },
        });
    } catch (e) {
        console.error("manga image proxy error", e);
        return NextResponse.json({ error: "تعذّر تحميل الصورة" }, { status: 502 });
    }
}
