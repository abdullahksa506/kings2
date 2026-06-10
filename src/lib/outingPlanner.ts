/*
 * Outing planner engine (server-side). Parses a free-text request from the King
 * and ranks Riyadh restaurants from the curated dataset, taking the group's
 * history into account (novelty / familiarity). No external AI — pure logic.
 */

import restaurantsData from "@/data/riyadhRestaurants.json";

export interface RestaurantRecord {
    n: string; // name
    c: string[]; // cuisine tags
    d: string; // district
    lat: number;
    lng: number;
    pt: number; // price tier 1-4
    pp: number; // per-person estimate (SAR)
    r: number; // rating 0-10
    lk: number; // likes
    sc: number; // base popularity score
}

const RESTAURANTS = restaurantsData as RestaurantRecord[];

// --- Arabic keyword → cuisine tag (matches the tags produced by the pipeline) ---
const CUISINE_SYNONYMS: [RegExp, string][] = [
    [/هند|برياني|بريان|تكا|كاري/i, "هندي"],
    [/برجر|برقر|برغر/i, "برجر"],
    [/قهو|كوفي|كافي|كافيه|اسبريسو|سبشل/i, "قهوة"],
    [/حلا|حلى|حلوي|ايس|آيس|كيك|دونات|بوظ|كنافه|كنافة|بسبوس/i, "حلا"],
    [/بيتزا|بيزا|ايطال|إيطال|باستا|مكرون/i, "إيطالي"],
    [/دجاج|فراخ|بروست|تشكن|chicken/i, "دجاج"],
    [/شاورما|شورما|فلافل|سندوي|ساندوي/i, "شاورما"],
    [/ترك|تركي|كباب/i, "تركي"],
    [/افغان|أفغان/i, "أفغاني"],
    [/بحر|سمك|روبيان|جمبري|مأكولات بحري/i, "بحري"],
    [/فطور|ريوق|فطار|بريك/i, "فطور"],
    [/ياباني|سوشي|صين|آسيو|اسيو|نودل|رامن|تايلند|كوري/i, "آسيوي"],
    [/مكسيك/i, "مكسيكي"],
    [/مشاو|مشوي|ستيك|ستيك|لحم|شواية|باربكيو|grill/i, "مشاوي"],
    [/شرقي|عربي|لبنان|يمن|مصري|شامي|مندي|مظبي|كبسه|كبسة/i, "شرق أوسطي"],
    [/سريع|وجبات سريع|فاست/i, "وجبات سريعة"],
];

const DISTRICT_NAMES = [
    "العليا", "السليمانية", "الملز", "الورود", "المروج", "المغرزات", "الملقا", "النخيل",
    "حطين", "الياسمين", "النرجس", "العارض", "الربيع", "الصحافة", "الغدير", "غرناطة",
    "قرطبة", "اليرموك", "الحمراء", "الروضة", "النسيم", "السفارات", "الرحمانية", "التخصصي",
    "المعذر", "العقيق", "الوادي", "المؤتمرات", "السويدي", "العزيزية", "الدرعية", "النظيم",
    "الشفا", "ظهرة لبن", "عرقة", "المربع",
];

export interface ParsedQuery {
    cuisines: string[];
    district: string | null;
    maxTier: number | null; // budget ceiling
    minTier: number | null; // wants fancy
    wantsNew: boolean; // exclude visited
    wantsFavorite: boolean; // boost visited
    maxPerPerson: number | null;
}

export function parseQuery(query: string): ParsedQuery {
    const q = (query || "").trim();

    const cuisines: string[] = [];
    for (const [re, tag] of CUISINE_SYNONYMS) {
        if (re.test(q) && !cuisines.includes(tag)) cuisines.push(tag);
    }

    let district: string | null = null;
    for (const name of DISTRICT_NAMES) {
        if (q.includes(name)) { district = name; break; }
    }

    let maxTier: number | null = null;
    let minTier: number | null = null;
    if (/رخيص|اقتصاد|بسيط|على قد|مايبي|رخيصه|رخيصة/i.test(q)) maxTier = 1;
    else if (/متوسط|معقول/i.test(q)) maxTier = 2;
    if (/غالي|فخم|راقي|فاخر|VIP|مميز|انيق|أنيق/i.test(q)) minTier = 3;

    // numeric budget e.g. "تحت 80" / "بحدود 100 للشخص"
    let maxPerPerson: number | null = null;
    const numMatch = q.match(/(?:تحت|بحدود|اقل من|أقل من|حد|ميزانية|max)\s*(\d{2,4})/i);
    if (numMatch) maxPerPerson = parseInt(numMatch[1]);

    const wantsNew = /جديد|ما جرب|مو مجرب|نغير|نجرب|جديده|جديدة|ما رحنا|مكان ثاني/i.test(q);
    const wantsFavorite = /مجرب|مفضل|نرجع|المعتاد|اللي عجبنا|عالي التقييم|الافضل|الأفضل/i.test(q);

    return { cuisines, district, maxTier, minTier, wantsNew, wantsFavorite, maxPerPerson };
}

export interface PlanSuggestion {
    name: string;
    cuisines: string[];
    district: string;
    perPerson: number;
    rating: number;
    lat: number;
    lng: number;
    mapsUrl: string;
    reasons: string[];
    visitedBefore: boolean;
    matchScore: number;
}

export interface PlanResult {
    parsed: ParsedQuery;
    suggestions: PlanSuggestion[];
    totalMatched: number;
}

function canon(s: string): string {
    return (s || "").normalize("NFKC").replace(/ـ/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * @param query        King's free-text request
 * @param visitedNames Set of canonical restaurant names the group has been to
 * @param defaultMaxPerPerson Group budget per person (e.g., 175)
 */
export function planOuting(
    query: string,
    visitedNames: Set<string>,
    defaultMaxPerPerson = 175,
): PlanResult {
    const parsed = parseQuery(query);
    const budgetCeil = parsed.maxPerPerson ?? defaultMaxPerPerson;

    const scored: PlanSuggestion[] = [];
    let totalMatched = 0;

    for (const rec of RESTAURANTS) {
        // Hard filters
        if (rec.pp > budgetCeil) continue;
        if (parsed.maxTier !== null && rec.pt > parsed.maxTier) continue;
        if (parsed.minTier !== null && rec.pt < parsed.minTier) continue;
        if (parsed.cuisines.length && !parsed.cuisines.some((c) => rec.c.includes(c))) continue;
        if (parsed.district && rec.d !== parsed.district) continue;

        const visited = visitedNames.has(canon(rec.n));
        if (parsed.wantsNew && visited) continue;

        totalMatched++;

        // Scoring
        let score = rec.sc;
        const reasons: string[] = [];

        if (parsed.cuisines.length && parsed.cuisines.some((c) => rec.c.includes(c))) {
            score += 25;
            reasons.push(`يطابق نوع: ${parsed.cuisines.filter((c) => rec.c.includes(c)).join("، ")}`);
        }
        if (parsed.district && rec.d === parsed.district) {
            score += 20;
            reasons.push(`في ${rec.d}`);
        }
        if (rec.r >= 8) { score += 15; reasons.push(`تقييم عالي ⭐ ${rec.r}`); }
        else if (rec.r >= 7) { score += 8; }

        if (parsed.wantsNew && !visited) { score += 18; reasons.push("ما جربتوه قبل 🆕"); }
        if (parsed.wantsFavorite && visited) { score += 22; reasons.push("من المطاعم اللي جربتوها"); }
        if (!parsed.wantsNew && !parsed.wantsFavorite && visited) {
            score -= 6; // mild novelty nudge by default
        }

        if (rec.pp <= 50) reasons.push(`اقتصادي (~${rec.pp}﷼/شخص)`);

        scored.push({
            name: rec.n,
            cuisines: rec.c,
            district: rec.d,
            perPerson: rec.pp,
            rating: rec.r,
            lat: rec.lat,
            lng: rec.lng,
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=${rec.lat},${rec.lng}`,
            reasons,
            visitedBefore: visited,
            matchScore: score,
        });
    }

    scored.sort((a, b) => b.matchScore - a.matchScore);

    return { parsed, suggestions: scored.slice(0, 6), totalMatched };
}

/** Lightweight stats for the UI (cuisine/district options the data actually has). */
export function plannerMeta() {
    return {
        total: RESTAURANTS.length,
        cuisines: ["هندي", "برجر", "قهوة", "حلا", "إيطالي", "دجاج", "شاورما", "تركي", "بحري", "مشاوي", "آسيوي", "شرق أوسطي", "فطور"],
        districts: DISTRICT_NAMES,
    };
}
