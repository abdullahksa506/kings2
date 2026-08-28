/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تحسب القائمة في السيرفر مو في المتصفح؟"
 * قال: "لأن التنحّي يحتاج يعرف مين قيّم مين... ولو حسبتها عندكم كشفت الأسرار
 *       وصارت الحرب عالمية بدل ما هي أهلية 😂🌍"
 */

/**
 * 📊 القائمة المصححة — ترتيب الملوك وفق مواد الدستور v12.
 *
 * المادة (12) الطلعة المعفوّة  — تُسقط أسوأ طلعة من أي دورة (بأربع طلعات فأكثر)
 * المادة (13) التنحّي          — المتخاصمان لا يقيّم أحدهما الآخر (بشرط بقاء ٣ مقيّمين)
 * المادة (14) ترجيح الدورة     — الدورة الختامية (السادسة) ×2.5، والناقصة تُستثنى
 *
 * تُحسب في السيرفر لأن التنحّي يحتاج هوية المقيّمين، وهي سرّية.
 * المُخرَج أرقام مجمّعة فقط — لا يُسرَّب أي تقييم فردي.
 *
 * 🗑️ للحذف الكامل: REMOVED_FEATURES.md — قسم «القائمة المصححة».
 */

import { adminDb } from "@/lib/firebase-admin";

export const KING_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];
const FINAL_CYCLE_WEIGHT = 2.5;  // المادة (14)
const DEFAULT_FINAL_CYCLE = 6;   // الدورة الختامية للسنة
const MIN_RATERS_AFTER_RECUSAL = 3;  // المادة (13) شرط الحماية
const MIN_WEEKS_TO_DROP = 4;     // المادة (12) شرط التطبيق

export type CorrectedRow = {
    king: string;
    average: number;
    count: number;          // الطلعات المحتسبة (بعد الإسقاط)
    droppedScore: number | null;  // درجة الطلعة المعفوّة
    baseAverage: number;    // المعدل بالطريقة القديمة، للمقارنة
};

export type CorrectedResult = {
    rows: CorrectedRow[];
    weightedCycle: number | null;   // الدورة المرجّحة (الختامية إن اكتملت)
    finalCycle: number;             // رقم الدورة الختامية
    excludedCycles: number[];       // دورات ناقصة استُثنيت
    recusedPairs: string[][];
};

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/** إعدادات المادتين (13) و(14) من appConfig/main */
async function loadConfig(): Promise<{ pairs: string[][]; finalCycle: number }> {
    try {
        const snap = await adminDb.collection("appConfig").doc("main").get();
        const d = snap.data() as { recusedPairs?: unknown; finalCycle?: unknown } | undefined;
        const fc = Number(d?.finalCycle);
        const finalCycle = Number.isInteger(fc) && fc > 0 ? fc : DEFAULT_FINAL_CYCLE;
        return { pairs: parsePairs(d?.recusedPairs), finalCycle };
    } catch {
        return { pairs: [], finalCycle: DEFAULT_FINAL_CYCLE };
    }
}

function parsePairs(raw: unknown): string[][] {
    try {
        if (!Array.isArray(raw)) return [];
        return raw
            .filter((p): p is string[] => Array.isArray(p) && p.length === 2
                && p.every((n) => typeof n === "string" && KING_NAMES.includes(n)))
            .map((p) => [p[0], p[1]]);
    } catch {
        return [];
    }
}

export async function computeCorrectedRanking(): Promise<CorrectedResult> {
    const [weeksSnap, ratingsSnap, cfg] = await Promise.all([
        adminDb.collection("weeks").get(),
        adminDb.collection("ratings").get(),
        loadConfig(),
    ]);
    const recusedPairs = cfg.pairs;

    // من يتنحّى عن تقييم من
    const recusedOf = new Map<string, Set<string>>();
    recusedPairs.forEach(([a, b]) => {
        if (!recusedOf.has(a)) recusedOf.set(a, new Set());
        if (!recusedOf.has(b)) recusedOf.set(b, new Set());
        recusedOf.get(a)!.add(b);
        recusedOf.get(b)!.add(a);
    });

    const ratingsByWeek = new Map<string, { userName: string; score: number }[]>();
    ratingsSnap.forEach((d) => {
        const r = d.data() as { weekId?: string; userName?: string; score?: number };
        const score = Number(r.score);
        if (!r.weekId || !Number.isFinite(score)) return;
        const arr = ratingsByWeek.get(r.weekId) || [];
        arr.push({ userName: String(r.userName || ""), score });
        ratingsByWeek.set(r.weekId, arr);
    });

    type Wk = { king: string; cycle: number; score: number };
    const all: Wk[] = [];
    weeksSnap.forEach((d) => {
        const w = d.data() as { king?: string; isRandom?: boolean; status?: string;
            cycleNumber?: number; historicalAverageRating?: number };
        if (w.isRandom || !w.king || !KING_NAMES.includes(w.king)) return;
        const cycle = Number(w.cycleNumber);
        if (!Number.isInteger(cycle) || cycle <= 0) return;

        let votes = ratingsByWeek.get(d.id) || [];
        // المادة (13): نُسقط صوت المتنحّي ما لم يهبط العدد تحت الحد
        const foe = recusedOf.get(w.king);
        if (foe) {
            const kept = votes.filter((v) => !foe.has(v.userName));
            if (kept.length >= MIN_RATERS_AFTER_RECUSAL) votes = kept;
        }
        const score = votes.length
            ? mean(votes.map((v) => v.score))
            : Number(w.historicalAverageRating);
        if (!Number.isFinite(score) || score <= 0) return;
        all.push({ king: w.king, cycle, score });
    });

    // المادة (14): الدورة لا تدخل الحساب إلا إذا لعبها الستة
    const cyclesSeen = [...new Set(all.map((w) => w.cycle))].sort((a, b) => a - b);
    const complete = cyclesSeen.filter((c) =>
        KING_NAMES.every((k) => all.some((w) => w.cycle === c && w.king === k)));
    const excludedCycles = cyclesSeen.filter((c) => !complete.includes(c));
    // المادة (14): الترجيح مخصّص للدورة الختامية وحدها (السادسة افتراضياً).
    // قبل اكتمالها تتساوى كل الدورات — فلا تُرجَّح دورةٌ ليست ختام السنة.
    const weightedCycle = complete.includes(cfg.finalCycle) ? cfg.finalCycle : null;

    const rows: CorrectedRow[] = KING_NAMES.map((king) => {
        let weeks = all.filter((w) => w.king === king && complete.includes(w.cycle));
        if (!weeks.length) return null;
        const baseAverage = mean(weeks.map((w) => w.score));

        // المادة (12): تُسقط أسوأ طلعة من أي دورة — بما فيها الدورة المرجّحة،
        // لأن الهجوم المنسّق غالباً يقع في الدورة الجارية وهي أَولى بالحماية.
        let droppedScore: number | null = null;
        if (weeks.length >= MIN_WEEKS_TO_DROP) {
            const worst = weeks.reduce((a, b) => (b.score < a.score ? b : a));
            droppedScore = worst.score;
            weeks = weeks.filter((w) => w !== worst);
        }

        // متوسط داخل كل دورة، ثم متوسط مرجّح بين الدورات
        const byCycle = new Map<number, number[]>();
        weeks.forEach((w) => byCycle.set(w.cycle, [...(byCycle.get(w.cycle) || []), w.score]));
        let num = 0, den = 0;
        byCycle.forEach((scores, cycle) => {
            const weight = cycle === weightedCycle ? FINAL_CYCLE_WEIGHT : 1;
            num += mean(scores) * weight;
            den += weight;
        });

        return { king, average: den ? num / den : 0, count: weeks.length, droppedScore, baseAverage };
    }).filter((r): r is CorrectedRow => r !== null)
      .sort((a, b) => b.average - a.average);

    return { rows, weightedCycle, finalCycle: cfg.finalCycle, excludedCycles, recusedPairs };
}
