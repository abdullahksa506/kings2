/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "وش أفضل فيلم؟"
 * قال: "أي فيلم ما فيه مبرمج يقول 'يشتغل عندي على جهازي' 😂🎬"
 *
 * ⚠️ ميزة معزولة بالكامل — كل شي تحت src/app/api/movies + src/app/movies.
 * حذف الميزة = حذف المجلدين + رابط العميد. بيانات نظيفة من OMDb (بيانات IMDb).
 */

import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

// OMDb = "The Open Movie Database" — API رسمي يستخدم بيانات IMDb (تقييمات، ملخّص،
// بوستر...). مجاني بمفتاح مجاني من omdbapi.com. لا نستخدم أي مصدر تورنت/قرصنة.
export const OMDB_BASE = "https://www.omdbapi.com";

/** Gate every movies route behind the dean role. Returns null when allowed. */
export async function requireDean(request: Request): Promise<NextResponse | null> {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"] });
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    return null;
}

/** Fetch JSON from OMDb. Returns { ok, data } or { ok:false, error }. */
export async function omdbFetch(params: Record<string, string>): Promise<{ ok: true; data: any } | { ok: false; error: string; status: number }> {
    const key = process.env.OMDB_API_KEY;
    if (!key) {
        return { ok: false, status: 500, error: "أضف OMDB_API_KEY في إعدادات Render (مفتاح مجاني من omdbapi.com)" };
    }
    const qs = new URLSearchParams({ apikey: key, ...params }).toString();
    try {
        const res = await fetch(`${OMDB_BASE}/?${qs}`, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) return { ok: false, status: 502, error: "تعذّر الوصول لقاعدة الأفلام" };
        const data = await res.json();
        if (data?.Response === "False") {
            return { ok: false, status: 404, error: data?.Error || "ما فيه نتائج" };
        }
        return { ok: true, data };
    } catch {
        return { ok: false, status: 502, error: "تعذّر الوصول لقاعدة الأفلام" };
    }
}
