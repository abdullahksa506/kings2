/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "خلص الكريديت وش تسوي؟"
 * قال: "أروح لمزوّد ثاني مجاني... مثل ما تروح لبيت خالتك لما الثلاجة فاضية 😂🧊"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_UA, isAllowedImageHost, refererFor } from "../_lib";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash";
// OpenRouter fallback model. Default = Gemini 2.0 Flash via OpenRouter (نفس جودة
// تحديد الفقاعات + حصة مجانية منفصلة). قابل للتغيير بمتغيّر OPENROUTER_MODEL.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

const TRANSLATE_PROMPT = `أنت مترجم مانجا محترف. مهمتك: اقرأ كل النصوص الظاهرة في صورة صفحة المانجا (فقاعات الكلام، التعليقات، المؤثرات الصوتية المهمة) وترجمها إلى العربية الفصحى المبسّطة والطبيعية.

لكل كتلة نص:
- ar: الترجمة العربية (طبيعية ومناسبة للسياق، مو حرفية جامدة). لا تترجم المؤثرات الصوتية التافهة.
- box: الإحداثيات [ymin, xmin, ymax, xmax] بمقياس 0 إلى 1000 (0 أعلى/يسار، 1000 أسفل/يمين) تحيط بكتلة النص الأصلية بدقة.

قواعد:
- رتّب الكتل حسب ترتيب القراءة الطبيعي.
- لا تخترع نصوص مو موجودة. لو الصفحة بدون نص، أرجع قائمة فارغة.
- أرجع JSON array فقط بالشكل: [{"ar":"...","box":[ymin,xmin,ymax,xmax]}] — بدون أي شرح.`;

const RESPONSE_SCHEMA = {
    type: "array",
    items: { type: "object", properties: { ar: { type: "string" }, box: { type: "array", items: { type: "number" } } }, required: ["ar", "box"] },
};

type Block = { ar: string; x: number; y: number; w: number; h: number };

// Turn raw [{ar,box:[ymin,xmin,ymax,xmax] 0-1000}] into CSS fraction blocks.
function normalizeBlocks(parsed: any): Block[] {
    return (Array.isArray(parsed) ? parsed : [])
        .filter((b: any) => b && typeof b.ar === "string" && Array.isArray(b.box) && b.box.length === 4)
        .map((b: any) => {
            const [ymin, xmin, ymax, xmax] = b.box.map((n: any) => Math.max(0, Math.min(1000, Number(n) || 0)));
            return {
                ar: String(b.ar).trim(),
                x: Math.min(xmin, xmax) / 1000,
                y: Math.min(ymin, ymax) / 1000,
                w: Math.abs(xmax - xmin) / 1000,
                h: Math.abs(ymax - ymin) / 1000,
            };
        })
        .filter((b: Block) => b.ar && b.w > 0 && b.h > 0);
}

// Robustly pull a JSON array out of a model's text answer (handles ```json fences).
function parseArray(text: string): any {
    if (!text) return [];
    const m = text.match(/\[[\s\S]*\]/);
    try { return JSON.parse(m ? m[0] : text); } catch { return []; }
}

async function imageUrlToBase64(src: string): Promise<{ b64: string; mime: string }> {
    const res = await fetch(src, { headers: { "User-Agent": MD_UA, Referer: refererFor(src) }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`image fetch ${res.status}`);
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_UPLOAD_BYTES) throw new Error("الصورة كبيرة جداً");
    return { b64: buf.toString("base64"), mime };
}

// ── Provider 1: Gemini (direct) ──
async function callGemini(b64: string, mime: string, key: string): Promise<Block[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: TRANSLATE_PROMPT }, { inlineData: { mimeType: mime, data: b64 } }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, thinkingConfig: { thinkingBudget: 0 } },
        }),
        signal: AbortSignal.timeout(40000),
    });
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") || "[]";
    return normalizeBlocks(parseArray(raw));
}

// ── Provider 2: OpenRouter (OpenAI-compatible free vision models) ──
async function callOpenRouter(b64: string, mime: string, key: string): Promise<Block[]> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": "https://king-thursday.online",
            "X-Title": "King of Thursday Manga",
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            temperature: 0.2,
            max_tokens: 4096,
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: TRANSLATE_PROMPT },
                    { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
                ],
            }],
        }),
        signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`openrouter ${res.status}`);
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || "[]";
    return normalizeBlocks(parseArray(typeof raw === "string" ? raw : JSON.stringify(raw)));
}

export async function POST(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const geminiKey = process.env.GEMINI_API_KEY;
    const orKey = process.env.OPENROUTER_API_KEY;
    if (!geminiKey && !orKey) {
        return NextResponse.json({ error: "ما فيه مزوّد ترجمة معرّف (GEMINI_API_KEY أو OPENROUTER_API_KEY)" }, { status: 500 });
    }

    let body: { imageUrl?: string; imageBase64?: string; mime?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

    // Two input modes: a source page URL (fetched here) OR a manual base64 upload.
    let b64 = "";
    let mime = "image/jpeg";
    try {
        if (body.imageUrl) {
            if (!isAllowedImageHost(body.imageUrl)) return NextResponse.json({ error: "مصدر صورة غير مسموح" }, { status: 400 });
            const r = await imageUrlToBase64(body.imageUrl);
            b64 = r.b64; mime = r.mime;
        } else if (body.imageBase64) {
            const rawImg = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
            if (rawImg.length > MAX_UPLOAD_BYTES * 1.4) return NextResponse.json({ error: "الصورة كبيرة جداً" }, { status: 413 });
            b64 = rawImg;
            mime = body.mime && /^image\/(png|jpeg|jpg|webp)$/.test(body.mime) ? body.mime : "image/jpeg";
        } else {
            return NextResponse.json({ error: "أرسل صورة" }, { status: 400 });
        }
    } catch (e) {
        console.error("manga translate image error", e);
        return NextResponse.json({ error: "تعذّر تحميل الصورة" }, { status: 502 });
    }

    // Try Gemini first; if it fails (quota/error) fall back to OpenRouter.
    let blocks: Block[] | null = null;
    let provider = "";
    if (geminiKey) {
        try { blocks = await callGemini(b64, mime, geminiKey); provider = "gemini"; }
        catch (e) { console.error("gemini failed, trying fallback:", (e as Error)?.message); }
    }
    if (blocks === null && orKey) {
        try { blocks = await callOpenRouter(b64, mime, orKey); provider = "openrouter"; }
        catch (e) { console.error("openrouter failed:", (e as Error)?.message); }
    }

    if (blocks === null) {
        return NextResponse.json({ error: "خلص حد الترجمة عند كل المزوّدين — جرّب بكرة أو أضف OPENROUTER_API_KEY" }, { status: 502 });
    }
    return NextResponse.json({ blocks, provider });
}
