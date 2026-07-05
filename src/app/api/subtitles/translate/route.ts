/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "تترجم الترجمة؟"
 * قال: "أترجم كل سطر... بس المشهد المحزن أترجمه وأنا أعيط بالداخل 😭🎬"
 *
 * ⚠️ ميزة معزولة — للعميد فقط. حذفها = حذف src/app/subtitles + src/app/api/subtitles + رابط العميد.
 * الترجمة عبر خدمات مجانية (نص فقط، بدون مفتاح ولا AI) مع سلسلة احتياطية.
 */

import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

export const runtime = "nodejs";

const MAX_LINES = 60;
const MAX_CHARS = 5000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const HDRS = { "User-Agent": UA, "Accept-Language": "ar,en;q=0.9", Accept: "*/*" };

async function requireDean(request: Request): Promise<NextResponse | null> {
    const auth = await authenticateServerRequest(request, { allowedRoles: ["dean"] });
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return null;
}

function flattenStrings(x: any): string {
    if (typeof x === "string") return x;
    if (Array.isArray(x)) return x.map(flattenStrings).join("");
    return "";
}

// ── Free translation providers. Each returns the full translated text (with the
// [[n]] markers preserved). We try them in order — datacenter IPs sometimes get
// blocked by one but not another, so the fallback keeps the feature working. ──
async function pGoogleSingle(q: string): Promise<string> {
    const u = new URL("https://translate.googleapis.com/translate_a/single");
    u.search = new URLSearchParams({ client: "gtx", sl: "en", tl: "ar", dt: "t", q }).toString();
    const res = await fetch(u.toString(), { headers: HDRS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`g1 ${res.status}`);
    const data = await res.json();
    return (data?.[0] || []).map((s: any[]) => s?.[0] || "").join("");
}

async function pGoogleT(q: string): Promise<string> {
    const u = new URL("https://clients5.google.com/translate_a/t");
    u.search = new URLSearchParams({ client: "dict-chrome-ex", sl: "en", tl: "ar", q }).toString();
    const res = await fetch(u.toString(), { headers: HDRS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`g2 ${res.status}`);
    const data = await res.json();
    return flattenStrings(data?.[0] ?? data);
}

async function pMyMemory(q: string): Promise<string> {
    const u = new URL("https://api.mymemory.translated.net/get");
    const params: Record<string, string> = { q, langpair: "en|ar" };
    if (process.env.MYMEMORY_EMAIL) params.de = process.env.MYMEMORY_EMAIL;
    u.search = new URLSearchParams(params).toString();
    const res = await fetch(u.toString(), { headers: HDRS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`mm ${res.status}`);
    const data = await res.json();
    const t = data?.responseData?.translatedText;
    if (!t || typeof t !== "string") throw new Error("mm empty");
    return t;
}

async function translateJoined(q: string): Promise<string> {
    const providers = [pGoogleSingle, pGoogleT, pMyMemory];
    let lastErr = "";
    for (const p of providers) {
        try {
            const out = await p(q);
            if (out && out.trim()) return out;
        } catch (e) { lastErr = (e as Error)?.message || "err"; }
    }
    throw new Error(`all providers failed: ${lastErr}`);
}

async function translateBatch(lines: string[]): Promise<string[]> {
    const joined = lines.map((l, i) => `[[${i}]] ${l.replace(/\s*\n\s*/g, " ").trim()}`).join("\n");
    const full = await translateJoined(joined);

    const parts: Record<number, string> = {};
    const re = /\[\[\s*(\d+)\s*\]\]\s*([\s\S]*?)(?=\[\[\s*\d+\s*\]\]|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(full)) !== null) parts[Number(m[1])] = m[2].trim();
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
