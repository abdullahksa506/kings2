/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تقرأ التفاصيل كلها؟"
 * قال: "عشان ما أطلع زي اللي يقيّم الفيلم من البوستر بس 😂🎞️"
 */

import { NextResponse } from "next/server";
import { requireDean, omdbFetch } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const id = new URL(request.url).searchParams.get("id")?.trim() || "";
    if (!/^tt\d{6,10}$/.test(id)) return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });

    const r = await omdbFetch({ i: id, plot: "full" });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });

    const d = r.data;
    const clean = (v: any) => (typeof v === "string" && v !== "N/A" ? v : null);
    return NextResponse.json({
        movie: {
            id: d.imdbID,
            title: clean(d.Title),
            year: clean(d.Year),
            rated: clean(d.Rated),
            runtime: clean(d.Runtime),
            genre: clean(d.Genre),
            director: clean(d.Director),
            actors: clean(d.Actors),
            plot: clean(d.Plot),
            poster: clean(d.Poster),
            imdbRating: clean(d.imdbRating),
            imdbVotes: clean(d.imdbVotes),
            language: clean(d.Language),
            country: clean(d.Country),
        },
    });
}
