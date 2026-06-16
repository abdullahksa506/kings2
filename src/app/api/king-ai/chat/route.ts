import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { SYSTEM_PROMPT, buildContextBlock, isLeakedResponse, SAFE_REFUSAL, KingAIContext } from "@/lib/kingAIPrompt";
import { checkAndIncrement } from "@/lib/kingAILimits";
import { services, VALID_NAMES } from "@/lib/services";

const MAX_INPUT_CHARS = 500;
const MODEL = "gemini-2.5-flash";

interface ChatRequest {
    message: string;
    history?: { role: "user" | "model"; text: string }[];
}

/**
 * Builds the live KingAIContext from Firestore. Called per request.
 */
async function buildContext(userName: string): Promise<KingAIContext> {
    const [currentWeek, completedRows] = await Promise.all([
        services.getCurrentWeek().catch(() => null),
        services.getAllCompletedWeeks().catch(() => []),
    ]);

    // Sort completed by createdAt desc, take last 10
    const recent = [...completedRows]
        .sort((a, b) => b.week.createdAt.toMillis() - a.week.createdAt.toMillis())
        .slice(0, 10)
        .map((r) => ({
            weekNumber: r.week.weekNumber,
            cycleNumber: r.week.cycleNumber,
            king: r.week.king,
            restaurant: r.week.restaurant,
            day: r.week.day,
            avgRating: r.averageScore > 0 ? Math.round(r.averageScore * 10) / 10 : undefined,
        }));

    // Per-member stats
    const memberAttendance: Record<string, number> = {};
    const memberTimesAsKing: Record<string, number> = {};
    for (const n of VALID_NAMES) {
        memberAttendance[n] = 0;
        memberTimesAsKing[n] = 0;
    }
    let totalAttendees = 0;
    let mostKingMember: { name: string; count: number } | null = null;
    let highestRatedKing: { name: string; score: number } | null = null;

    const kingScoreSum: Record<string, { sum: number; n: number }> = {};
    for (const r of completedRows) {
        const w = r.week;
        if (w.king && VALID_NAMES.includes(w.king)) {
            memberTimesAsKing[w.king]++;
            if (r.averageScore > 0) {
                if (!kingScoreSum[w.king]) kingScoreSum[w.king] = { sum: 0, n: 0 };
                kingScoreSum[w.king].sum += r.averageScore;
                kingScoreSum[w.king].n += 1;
            }
        }
        const present: string[] = [];
        for (const n of VALID_NAMES) {
            const attended =
                w.king === n || ((w.responded || []).includes(n) && !(w.absentees || []).includes(n));
            if (attended) present.push(n);
        }
        for (const n of present) memberAttendance[n]++;
        totalAttendees += present.length;
    }

    const total = completedRows.length || 1;
    for (const n of VALID_NAMES) {
        memberAttendance[n] = Math.round((memberAttendance[n] / total) * 100);
    }
    // Most-king
    for (const n of VALID_NAMES) {
        if (!mostKingMember || memberTimesAsKing[n] > mostKingMember.count) {
            mostKingMember = { name: n, count: memberTimesAsKing[n] };
        }
    }
    // Highest avg-rated king
    for (const [name, { sum, n }] of Object.entries(kingScoreSum)) {
        const score = sum / n;
        if (!highestRatedKing || score > highestRatedKing.score) {
            highestRatedKing = { name, score: Math.round(score * 10) / 10 };
        }
    }

    const uniqueRestaurants = new Set<string>();
    for (const r of completedRows) if (r.week.restaurant) uniqueRestaurants.add(r.week.restaurant.trim());

    return {
        currentWeek,
        recentWeeks: recent,
        currentUserName: userName,
        stats: {
            totalOutings: completedRows.length,
            uniqueRestaurants: uniqueRestaurants.size,
            avgAttendance:
                completedRows.length > 0 ? Math.round((totalAttendees / completedRows.length) * 10) / 10 : 0,
            mostKingMember: mostKingMember && mostKingMember.count > 0 ? mostKingMember : null,
            highestRatedKing,
            memberAttendance,
            memberTimesAsKing,
        },
        knownRestaurants: [],
    };
}

export async function POST(request: Request) {
    // ── 1. Auth ──
    const auth = await authenticateServerRequest(request);
    if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userName = auth.user?.name || "";
    const isDean = auth.user?.role === "dean";

    if (!VALID_NAMES.includes(userName)) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    // ── 2. Validate request ──
    let body: ChatRequest;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
    }
    const message = (body?.message || "").trim();
    if (!message) {
        return NextResponse.json({ error: "أرسل سؤال." }, { status: 400 });
    }
    if (message.length > MAX_INPUT_CHARS) {
        return NextResponse.json(
            { error: `الرسالة طويلة (${message.length}/${MAX_INPUT_CHARS} حرف).` },
            { status: 400 },
        );
    }

    // ── 3. Rate limit ──
    const limitRes = await checkAndIncrement(userName, isDean);
    if (!limitRes.allowed) {
        return NextResponse.json(
            { error: `وصلت الحد اليومي (${limitRes.used}/${limitRes.limit}). جرب بكرة 🌅` },
            { status: 429 },
        );
    }

    // ── 4. Check key ──
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Gemini غير معرّف على السيرفر." }, { status: 500 });
    }

    // ── 5. Build context ──
    const ctx = await buildContext(userName);
    const contextBlock = buildContextBlock(ctx);

    // ── 6. Build chat history (limit to last 8 turns) ──
    const history = (body.history || []).slice(-8).map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
    }));

    // ── 7. Call Gemini (non-streaming for simplicity; reliability over fanciness) ──
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const geminiBody = {
            systemInstruction: {
                role: "system",
                parts: [{ text: SYSTEM_PROMPT }],
            },
            contents: [
                ...history,
                {
                    role: "user",
                    parts: [{ text: `${contextBlock}\n\n# سؤال ${userName}:\n${message}` }],
                },
            ],
            tools: [{ googleSearch: {} }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
                topP: 0.95,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
            ],
        };

        const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiBody),
            signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
            const errTxt = await res.text().catch(() => "");
            console.error("Gemini API error", res.status, errTxt.slice(0, 200));
            return NextResponse.json(
                { error: "ما قدرنا نسأل الذكاء الاصطناعي الآن. حاول بعد شوي." },
                { status: 502 },
            );
        }

        const data = await res.json();
        let answer: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!answer) {
            const finishReason = data?.candidates?.[0]?.finishReason || "UNKNOWN";
            answer = finishReason === "SAFETY" ? SAFE_REFUSAL : "ما قدرت أجاوب على هذا الآن.";
        }

        // ── 8. Output filter — catch leaks ──
        if (isLeakedResponse(answer)) {
            answer = SAFE_REFUSAL;
        }

        // Extract grounding (search citations) if present
        const groundingChunks: { uri?: string; title?: string }[] =
            data?.candidates?.[0]?.groundingMetadata?.groundingChunks
                ?.map((c: { web?: { uri?: string; title?: string } }) => c.web)
                ?.filter(Boolean) || [];

        return NextResponse.json({
            answer,
            sources: groundingChunks,
            usage: { used: limitRes.used, limit: limitRes.limit },
        });
    } catch (e) {
        console.error("King AI Brain error", e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "خطأ غير متوقع." },
            { status: 500 },
        );
    }
}
