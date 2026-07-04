/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "تعرف كل الأفلام؟"
 * قال: "أعرفها كلها... بس لا تسألني عن النهاية، ما أحب أحرق عليكم 😂🍿"
 */

import { NextResponse } from "next/server";
import { requireDean, omdbFetch } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    if (!q) return NextResponse.json({ error: "اكتب اسم الفيلم" }, { status: 400 });
    if (q.length > 120) return NextResponse.json({ error: "البحث طويل" }, { status: 400 });

    const r = await omdbFetch({ s: q, type: "movie" });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    const results = (r.data?.Search || []).map((m: any) => ({
        id: m.imdbID,
        title: m.Title,
        year: m.Year,
        poster: m.Poster && m.Poster !== "N/A" ? m.Poster : null,
    }));
    return NextResponse.json({ results });
}
