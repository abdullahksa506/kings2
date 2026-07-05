/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "تترجم الترجمة؟"
 * قال: "أترجم كل سطر... بس المشهد المحزن أترجمه وأنا أعيط بالداخل 😭🎬"
 *
 * ⚠️ ميزة معزولة — للعميد فقط. حذفها = حذف src/app/subtitles + src/app/api/subtitles + رابط العميد.
 * الترجمة عبر نقطة Google المجانية (نص فقط، بدون مفتاح ولا AI).
 */

import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

export const runtime = "nodejs";

const MAX_LINES = 50;         // per request
const MAX_CHARS = 4000;       // guard the GET URL length

async function requireDean(request: Request): Promise<NextResponse | null> {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"] });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return null;
}

// Translate a batch of lines EN→AR in one call using [[n]] markers so we can map
// each translation back to its exact subtitle cue (Google preserves the markers).
async function translateBatch(lines: string[]): Promise<string[]> {
    const singleLine = lines.map((l) => l.replace(/\s*\n\s*/g, " ").trim());
    const joined = singleLine.map((l, i) => `[[${i}]] ${l}`).join("\n");

    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({ client: "gtx", sl: "en", tl: "ar", dt: "t", q: joined }).toString();

    const res = await fetch(url.toString(), {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; KingOfThursday/1.0)" },
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`translate ${res.status}`);
    const data = await res.json();
    const full: string = (data?.[0] || []).map((s: any[]) => s?.[0] || "").join("");

    // Split the translated text back by the [[n]] markers.
    const parts: Record<number, string> = {};
    const re = /\[\[\s*(\d+)\s*\]\]\s*([\s\S]*?)(?=\[\[\s*\d+\s*\]\]|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(full)) !== null) parts[Number(m[1])] = m[2].trim();

    // Fallback to the original line if a marker went missing.
    return lines.map((orig, i) => parts[i] ?? orig);
}

export async function POST(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    let body: { lines?: unknown };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

    const lines = Array.isArray(body.lines) ? body.lines.map((l) => (typeof l === "string" ? l : "")) : null;
    if (!lines) return NextResponse.json({ error: "أرسل مصفوفة سطور" }, { status: 400 });
    if (lines.length > MAX_LINES) return NextResponse.json({ error: `الحد ${MAX_LINES} سطر لكل دفعة` }, { status: 400 });
    if (lines.join("\n").length > MAX_CHARS) return NextResponse.json({ error: "الدفعة طويلة" }, { status: 400 });

    try {
        const translations = await translateBatch(lines);
        return NextResponse.json({ translations });
    } catch (e) {
        console.error("subtitle translate error", e);
        return NextResponse.json({ error: "تعذّرت الترجمة الآن، حاول بعد شوي" }, { status: 502 });
    }
}
