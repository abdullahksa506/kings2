import { NextResponse } from "next/server";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";
import { SYSTEM_PROMPT, buildContextBlock, isLeakedResponse, SAFE_REFUSAL, KingAIContext } from "@/lib/kingAIPrompt";
import { checkAndIncrement } from "@/lib/kingAILimits";
import { services, VALID_NAMES } from "@/lib/services";
import { outingDateLabel } from "@/lib/outingDate";
import { adminDb } from "@/lib/firebase-admin";

const MAX_INPUT_CHARS = 500;
const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_CHARS = 600;
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

    // Full history, newest first — with the REAL outing date and who excused themselves.
    const recent = [...completedRows]
        .sort((a, b) => b.week.createdAt.toMillis() - a.week.createdAt.toMillis())
        .map((r) => ({
            weekNumber: r.week.weekNumber,
            cycleNumber: r.week.cycleNumber,
            king: r.week.king,
            restaurant: r.week.restaurant,
            day: r.week.day,
            dateLabel: outingDateLabel(r.week),
            avgRating: r.averageScore > 0 ? Math.round(r.averageScore * 10) / 10 : undefined,
            absentees: (r.week.absentees || []).filter((a) => VALID_NAMES.includes(a)),
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

    // ── Restaurant ranking: visits + average rating (aggregate only) ──
    const restAgg: Record<string, { visits: number; sum: number; rated: number }> = {};
    for (const r of completedRows) {
        const name = r.week.restaurant?.trim();
        if (!name) continue;
        if (!restAgg[name]) restAgg[name] = { visits: 0, sum: 0, rated: 0 };
        restAgg[name].visits += 1;
        if (r.averageScore > 0) { restAgg[name].sum += r.averageScore; restAgg[name].rated += 1; }
    }
    const restaurantRanking = Object.entries(restAgg)
        .map(([name, a]) => ({
            name,
            visits: a.visits,
            avgRating: a.rated > 0 ? Math.round((a.sum / a.rated) * 10) / 10 : undefined,
        }))
        .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0) || b.visits - a.visits);

    // ── Bathrooms: averages + Hisham's written reviews ──
    const [bathroomRatings, bathroomReviews, mapLocations, fullStats] = await Promise.all([
        services.getAllBathroomRatings().catch(() => []),
        services.getBathroomReviews().catch(() => []),
        adminDb.collection("restaurantLocations").get()
            .then((s) => s.docs.map((d) => d.data() as { name?: string; addedBy?: string }))
            .catch(() => [] as { name?: string; addedBy?: string }[]),
        services.getStatistics().catch(() => null as any),
    ]);
    const reviewByLabel: Record<string, string> = {};
    for (const rv of bathroomReviews as { label?: string; review?: string }[]) {
        if (rv?.label) reviewByLabel[rv.label.trim()] = rv.review || "";
    }
    // Most bathroom ratings only carry a weekId — resolve the name from that outing's
    // restaurant, otherwise every rating would be dropped and the AI would see none.
    const restaurantByWeekId: Record<string, string> = {};
    for (const r of completedRows) {
        if (r.week.restaurant) restaurantByWeekId[r.week.id] = r.week.restaurant.trim();
    }
    const bathAgg: Record<string, { sum: number; n: number }> = {};
    for (const b of bathroomRatings as { bathroomName?: string; restaurantName?: string | null; weekId?: string; score: number }[]) {
        const label = (b.bathroomName || b.restaurantName || (b.weekId ? restaurantByWeekId[b.weekId] : "") || "").trim();
        if (!label) continue;
        if (!bathAgg[label]) bathAgg[label] = { sum: 0, n: 0 };
        bathAgg[label].sum += b.score;
        bathAgg[label].n += 1;
    }
    const bathrooms = Object.entries(bathAgg)
        .map(([name, a]) => ({
            name,
            avgScore: Math.round((a.sum / a.n) * 10) / 10,
            count: a.n,
            review: reviewByLabel[name] || undefined,
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

    // ── Richer per-member + global figures from the shared stats engine ──
    const ms = fullStats?.memberStats as Record<string, { attended: number; absent: number; timesAsKing: number }> | undefined;
    const memberAttended: Record<string, number> = {};
    const memberAbsent: Record<string, number> = {};
    if (ms) {
        for (const n of VALID_NAMES) {
            memberAttended[n] = ms[n]?.attended ?? 0;
            memberAbsent[n] = ms[n]?.absent ?? 0;
        }
    }
    const memberKingAvg: Record<string, number> = {};
    for (const [name, { sum, n }] of Object.entries(kingScoreSum)) {
        memberKingAvg[name] = Math.round((sum / n) * 10) / 10;
    }

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
            lowestRatedKing: fullStats?.funFacts?.lowestRatedKing
                ? { name: fullStats.funFacts.lowestRatedKing.name, score: Math.round(fullStats.funFacts.lowestRatedKing.score * 10) / 10 }
                : null,
            memberAttendance,
            memberTimesAsKing,
            memberAttended: ms ? memberAttended : undefined,
            memberAbsent: ms ? memberAbsent : undefined,
            memberKingAvg,
            streaks: fullStats?.streaks,
            totalCycles: fullStats?.totalCycles,
            thursdayCount: fullStats?.thursdayCount,
            fridayCount: fullStats?.fridayCount,
            globalAverage: fullStats?.globalAverageRating
                ? Math.round(fullStats.globalAverageRating * 10) / 10
                : undefined,
        },
        knownRestaurants: (mapLocations as { name?: string; addedBy?: string }[])
            .map((l) => ({ name: l?.name || "", addedBy: l?.addedBy || "" }))
            .filter((l) => l.name),
        restaurantRanking,
        bathrooms,
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

    // ── 6. Build chat history — VALIDATED ──
    // The client fully controls `history`, so it's an injection vector: forged
    // `model` turns can fake "the assistant already agreed to break the rules",
    // and unbounded text can burn Gemini tokens/cost. We never trust it blindly:
    // keep only well-formed {user|model} turns, cap each turn's length, cap count.
    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const history = rawHistory
        .filter(
            (h): h is { role: "user" | "model"; text: string } =>
                !!h &&
                typeof h === "object" &&
                (h.role === "user" || h.role === "model") &&
                typeof h.text === "string" &&
                h.text.trim().length > 0,
        )
        .slice(-MAX_HISTORY_TURNS)
        .map((h) => ({
            role: h.role,
            parts: [{ text: h.text.slice(0, MAX_HISTORY_CHARS) }],
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
                // Disable Gemini 2.5 "thinking" mode — otherwise the model
                // streams its chain-of-thought + tool_code prefixes into the
                // user-visible answer.
                thinkingConfig: { thinkingBudget: 0 },
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

        // Extract ONLY the answer parts — skip any parts flagged as 'thought',
        // and strip out leaked tool_code/print/queries=… blocks that some
        // grounding responses still emit even with thinkingBudget=0.
        const parts: { text?: string; thought?: boolean }[] =
            data?.candidates?.[0]?.content?.parts || [];
        let answer = parts
            .filter((p) => !p.thought && typeof p.text === "string")
            .map((p) => p.text as string)
            .join("\n")
            .trim();

        // Strip lines that look like internal reasoning markers
        answer = answer
            .split("\n")
            .filter((line) => {
                const l = line.trim();
                if (!l) return true;
                // Skip leaked markers
                if (/^(tool_code|thought|print\(|queries\s*=)/i.test(l)) return false;
                if (/^\s*google_search\.search/i.test(l)) return false;
                return true;
            })
            .join("\n")
            .trim();

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
