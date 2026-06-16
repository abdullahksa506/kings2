import { NextResponse } from "next/server";

/**
 * King AI Brain — health check endpoint.
 * Verifies that GEMINI_API_KEY is configured AND that we can reach the Gemini
 * API successfully. Never echoes the key value back. Safe to hit from outside.
 */
export async function GET() {
    const key = process.env.GEMINI_API_KEY;

    if (!key || key.trim().length === 0) {
        return NextResponse.json(
            {
                ok: false,
                configured: false,
                message: "GEMINI_API_KEY غير معرّف في متغيرات البيئة.",
            },
            { status: 200 },
        );
    }

    // Make a tiny test call to verify the key actually works.
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: "قل 'تم' فقط بدون أي شيء آخر." }],
                        },
                    ],
                    generationConfig: { maxOutputTokens: 8 },
                }),
                signal: AbortSignal.timeout(10_000),
            },
        );

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return NextResponse.json(
                {
                    ok: false,
                    configured: true,
                    apiWorking: false,
                    httpStatus: res.status,
                    message: `Gemini API رفض الطلب (${res.status}). تأكد إن المفتاح صحيح وغير معطّل.`,
                    // Surface first 150 chars of error for debugging (never includes key)
                    error: errText.slice(0, 150),
                },
                { status: 200 },
            );
        }

        const data = await res.json();
        const text: string =
            data?.candidates?.[0]?.content?.parts?.[0]?.text || "(فارغ)";

        return NextResponse.json(
            {
                ok: true,
                configured: true,
                apiWorking: true,
                model: "gemini-2.5-flash",
                keyLength: key.length, // length only, never the value
                sampleResponse: text.slice(0, 50),
                message: "كل شي يشتغل ✅",
            },
            { status: 200 },
        );
    } catch (e) {
        return NextResponse.json(
            {
                ok: false,
                configured: true,
                apiWorking: false,
                message: "ما قدرنا نوصل لـ Gemini API.",
                error: e instanceof Error ? e.message : String(e),
            },
            { status: 200 },
        );
    }
}
