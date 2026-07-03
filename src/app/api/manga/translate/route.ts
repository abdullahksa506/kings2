/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "تترجم ياباني؟"
 * قال: "أترجم ياباني وإنجليزي وحتى تلميحات صاحبك اللي يقول 'ما ودّي أطلع' وهو مشتاق 😂🇯🇵"
 */

import { NextResponse } from "next/server";
import { requireDean, MD_UA, isAllowedImageHost } from "../_lib";

export const runtime = "nodejs";

const MODEL = "gemini-2.5-flash";
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024; // 6 MB safety cap for manual uploads

const TRANSLATE_PROMPT = `أنت مترجم مانجا محترف. مهمتك: اقرأ كل النصوص الظاهرة في صورة صفحة المانجا (فقاعات الكلام، التعليقات، المؤثرات الصوتية المهمة) وترجمها إلى العربية الفصحى المبسّطة والطبيعية.

لكل كتلة نص:
- ar: الترجمة العربية (طبيعية ومناسبة للسياق، مو حرفية جامدة). لا تترجم المؤثرات الصوتية التافهة.
- box: الإحداثيات [ymin, xmin, ymax, xmax] بمقياس 0 إلى 1000 (0 أعلى/يسار، 1000 أسفل/يمين) تحيط بكتلة النص الأصلية بدقة.

قواعد:
- رتّب الكتل حسب ترتيب القراءة الطبيعي.
- لا تخترع نصوص مو موجودة. لو الصفحة بدون نص، أرجع قائمة فارغة.
- لا تشرح، أرجع JSON فقط.`;

const RESPONSE_SCHEMA = {
    type: "array",
    items: {
        type: "object",
        properties: {
            ar: { type: "string" },
            box: { type: "array", items: { type: "number" } },
        },
        required: ["ar", "box"],
    },
};

async function imageUrlToBase64(src: string): Promise<{ b64: string; mime: string }> {
    const res = await fetch(src, {
        headers: { "User-Agent": MD_UA, Referer: "https://mangadex.org/" },
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`image fetch ${res.status}`);
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_UPLOAD_BYTES) throw new Error("الصورة كبيرة جداً");
    return { b64: buf.toString("base64"), mime };
}

export async function POST(request: Request) {
    const denied = await requireDean(request);
    if (denied) return denied;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Gemini غير معرّف على السيرفر" }, { status: 500 });

    let body: { imageUrl?: string; imageBase64?: string; mime?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }

    // Two input modes: a MangaDex page URL (fetched here) OR a manual base64 upload.
    let b64 = "";
    let mime = "image/jpeg";
    try {
        if (body.imageUrl) {
            if (!isAllowedImageHost(body.imageUrl)) {
                return NextResponse.json({ error: "مصدر صورة غير مسموح" }, { status: 400 });
            }
            const r = await imageUrlToBase64(body.imageUrl);
            b64 = r.b64;
            mime = r.mime;
        } else if (body.imageBase64) {
            const raw = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
            if (raw.length > MAX_UPLOAD_BYTES * 1.4) {
                return NextResponse.json({ error: "الصورة كبيرة جداً" }, { status: 413 });
            }
            b64 = raw;
            mime = body.mime && /^image\/(png|jpeg|jpg|webp)$/.test(body.mime) ? body.mime : "image/jpeg";
        } else {
            return NextResponse.json({ error: "أرسل صورة" }, { status: 400 });
        }
    } catch (e) {
        console.error("manga translate image error", e);
        return NextResponse.json({ error: "تعذّر تحميل الصورة" }, { status: 502 });
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const geminiBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: TRANSLATE_PROMPT },
                        { inlineData: { mimeType: mime, data: b64 } },
                    ],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 4096,
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
                thinkingConfig: { thinkingBudget: 0 },
            },
        };

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody),
            signal: AbortSignal.timeout(40000),
        });
        if (!res.ok) {
            const t = await res.text().catch(() => "");
            console.error("Gemini manga error", res.status, t.slice(0, 200));
            return NextResponse.json({ error: "تعذّرت الترجمة الآن" }, { status: 502 });
        }
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") || "[]";

        let parsed: { ar: string; box: number[] }[] = [];
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = [];
        }

        // Normalise Gemini's [ymin,xmin,ymax,xmax] (0-1000) into CSS fractions.
        const blocks = (Array.isArray(parsed) ? parsed : [])
            .filter((b) => b && typeof b.ar === "string" && Array.isArray(b.box) && b.box.length === 4)
            .map((b) => {
                const [ymin, xmin, ymax, xmax] = b.box.map((n) => Math.max(0, Math.min(1000, Number(n) || 0)));
                return {
                    ar: b.ar.trim(),
                    x: Math.min(xmin, xmax) / 1000,
                    y: Math.min(ymin, ymax) / 1000,
                    w: Math.abs(xmax - xmin) / 1000,
                    h: Math.abs(ymax - ymin) / 1000,
                };
            })
            .filter((b) => b.ar && b.w > 0 && b.h > 0);

        return NextResponse.json({ blocks });
    } catch (e) {
        console.error("manga translate error", e);
        return NextResponse.json({ error: "خطأ غير متوقع في الترجمة" }, { status: 500 });
    }
}
