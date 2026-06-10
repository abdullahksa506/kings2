/*
 * Offline data pipeline: turns the raw Riyadh restaurants CSV into a compact,
 * curated JSON the outing planner uses server-side.
 *
 * - Filters out noise (no rating AND no likes AND no photos).
 * - Maps foursquare-style categories → simplified Arabic cuisine tags.
 * - Assigns each restaurant to the nearest known Riyadh district (by coords).
 * - Estimates a per-person price band suitable for the group's ≤175﷼ budget.
 *
 * Run: node scripts/build-restaurants.js <input.csv> <output.json>
 */

const fs = require("fs");

// --- Known Riyadh districts with approximate centroids ---
const DISTRICTS = [
    ["العليا", 24.6908, 46.6855], ["السليمانية", 24.7102, 46.6920], ["الملز", 24.6620, 46.7340],
    ["الورود", 24.7220, 46.6740], ["المروج", 24.7640, 46.6640], ["المغرزات", 24.7700, 46.7100],
    ["الملقا", 24.8120, 46.6120], ["النخيل", 24.7540, 46.6360], ["حطين", 24.7720, 46.5840],
    ["الياسمين", 24.8520, 46.6420], ["النرجس", 24.8830, 46.6620], ["العارض", 24.9200, 46.6520],
    ["الربيع", 24.8030, 46.6620], ["الصحافة", 24.8220, 46.6520], ["الغدير", 24.7920, 46.6820],
    ["غرناطة", 24.7840, 46.7430], ["قرطبة", 24.8130, 46.7820], ["اليرموك", 24.8230, 46.8020],
    ["الحمراء", 24.7430, 46.8030], ["الروضة", 24.7120, 46.7930], ["النسيم", 24.7030, 46.8330],
    ["السفارات", 24.6900, 46.6220], ["الرحمانية", 24.6920, 46.6320], ["التخصصي", 24.7220, 46.6660],
    ["المعذر", 24.6680, 46.6620], ["العقيق", 24.7660, 46.6260], ["الوادي", 24.8030, 46.7030],
    ["المؤتمرات", 24.7060, 46.6360], ["السويدي", 24.5930, 46.6820], ["العزيزية", 24.5530, 46.7820],
    ["الدرعية", 24.7370, 46.5760], ["النظيم", 24.7530, 46.8730], ["الشفا", 24.5430, 46.7330],
    ["ظهرة لبن", 24.6230, 46.5530], ["عرقة", 24.6730, 46.5430], ["المربع", 24.6520, 46.7120],
];

function distKm(la1, lo1, la2, lo2) {
    const R = 6371, toRad = (d) => (d * Math.PI) / 180;
    const dLa = toRad(la2 - la1), dLo = toRad(lo2 - lo1);
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestDistrict(lat, lng) {
    let best = null, bestD = Infinity;
    for (const [name, dla, dlo] of DISTRICTS) {
        const d = distKm(lat, lng, dla, dlo);
        if (d < bestD) { bestD = d; best = name; }
    }
    return bestD <= 5 ? best : "أخرى";
}

// --- Category → Arabic cuisine tag(s) ---
const CUISINE_MAP = [
    [/coffee|café|cafe|espresso/i, "قهوة"],
    [/dessert|ice cream|donut|bakery|pastr|sweet|cake|juice|chocolate/i, "حلا"],
    [/burger/i, "برجر"],
    [/pizza|italian/i, "إيطالي"],
    [/fried chicken|chicken/i, "دجاج"],
    [/shawarma|falafel|sandwich/i, "شاورما"],
    [/indian|pakistani|bangladesh/i, "هندي"],
    [/turkish/i, "تركي"],
    [/afghan/i, "أفغاني"],
    [/seafood|fish/i, "بحري"],
    [/breakfast|brunch/i, "فطور"],
    [/sushi|japanese|asian|chinese|thai|korean|noodle|ramen/i, "آسيوي"],
    [/mexican/i, "مكسيكي"],
    [/american|steak|grill|bbq|barbecue/i, "مشاوي"],
    [/lebanese|middle eastern|arab|saudi|yemeni|egyptian/i, "شرق أوسطي"],
    [/fast food/i, "وجبات سريعة"],
];

function toCuisine(categories) {
    if (!categories) return ["عام"];
    const tags = new Set();
    for (const [re, tag] of CUISINE_MAP) if (re.test(categories)) tags.add(tag);
    return tags.size ? [...tags] : ["عام"];
}

// Foursquare price tier → SAR per-person estimate
const PRICE_BAND = {
    "Cheap": { tier: 1, perPerson: 35 },
    "Moderate": { tier: 2, perPerson: 90 },
    "Expensive": { tier: 3, perPerson: 170 },
    "Very Expensive": { tier: 4, perPerson: 280 },
};

// --- minimal CSV parser (handles quoted fields) ---
function parseCsv(text) {
    const rows = [];
    let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') inQ = false;
            else field += c;
        } else {
            if (c === '"') inQ = true;
            else if (c === ",") { row.push(field); field = ""; }
            else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
            else if (c === "\r") { /* skip */ }
            else field += c;
        }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
}

const [, , inPath, outPath] = process.argv;
const raw = fs.readFileSync(inPath, "utf8");
const rows = parseCsv(raw);
const header = rows[0];
const idx = (k) => header.indexOf(k);

const out = [];
const districtCounts = {};
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length < header.length) continue;
    const name = (r[idx("name")] || "").trim();
    const lat = parseFloat(r[idx("lat")]);
    const lng = parseFloat(r[idx("lng")]);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const rating = parseFloat(r[idx("rating")]) || 0;
    const likes = parseFloat(r[idx("likes")]) || 0;
    const photos = parseInt(r[idx("photos")]) || 0;
    const tips = parseInt(r[idx("tips")]) || 0;

    // Quality filter — drop entries with no signal at all.
    if (rating <= 0 && likes < 3 && photos < 5) continue;

    const price = r[idx("price")] || "";
    const band = PRICE_BAND[price] || { tier: 2, perPerson: 90 };
    const district = nearestDistrict(lat, lng);
    districtCounts[district] = (districtCounts[district] || 0) + 1;

    // Popularity score for ranking (0..100-ish).
    const score = Math.round(rating * 6 + Math.min(likes, 200) * 0.15 + Math.min(photos, 100) * 0.1);

    out.push({
        n: name,
        c: toCuisine(r[idx("categories")]),
        d: district,
        lat: Math.round(lat * 1e5) / 1e5,
        lng: Math.round(lng * 1e5) / 1e5,
        pt: band.tier,
        pp: band.perPerson,
        r: Math.round(rating * 10) / 10,
        lk: likes,
        sc: score,
    });
}

// Sort by score so the planner can early-cut the long tail.
out.sort((a, b) => b.sc - a.sc);

fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`✅ wrote ${out.length} restaurants → ${outPath}`);
console.log(`   file size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   top districts:`, Object.entries(districtCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(", "));
