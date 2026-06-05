import { db } from "./firebase";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { invokeRpc } from "./services";

// --- Types ---

export interface RestaurantSummary {
    name: string;
    visitCount: number;
    avgRating: number; // 0 if never rated
    lastVisitMs: number;
    lastKing: string | null;
}

export interface RestaurantLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    address?: string;
    mapsUrl?: string;
    addedBy: string;
    updatedAtMs: number;
}

export interface GeocodeResult {
    name: string;
    lat: number;
    lng: number;
    address: string;
}

/**
 * Canonical form of a restaurant name. Arabic text frequently differs by
 * trailing whitespace, tatweel (ـ), or presentation forms entered on different
 * keyboards — normalizing here is what makes a saved location actually match
 * its restaurant. MUST be used on BOTH sides (summary aggregation + location merge).
 */
export function canonRestaurant(name: string): string {
    return (name || "").normalize("NFKC").replace(/ـ/g, "").trim();
}

// --- Read: restaurant summaries (lightweight, 2 reads, keeps services.ts untouched) ---

export async function getRestaurantSummaries(): Promise<RestaurantSummary[]> {
    const [weeksSnap, ratingsSnap] = await Promise.all([
        getDocs(query(collection(db, "weeks"), where("status", "==", "completed"))),
        getDocs(collection(db, "ratings")),
    ]);

    // Average rating per week.
    const weekScoreSum: Record<string, number> = {};
    const weekScoreCount: Record<string, number> = {};
    ratingsSnap.forEach((doc) => {
        const r = doc.data() as any;
        const wid = r?.weekId;
        const score = Number(r?.score);
        if (!wid || !Number.isFinite(score)) return;
        weekScoreSum[wid] = (weekScoreSum[wid] || 0) + score;
        weekScoreCount[wid] = (weekScoreCount[wid] || 0) + 1;
    });

    // Aggregate per restaurant.
    const agg: Record<
        string,
        { name: string; visitCount: number; scoreTotal: number; ratedWeeks: number; lastVisitMs: number; lastKing: string | null }
    > = {};

    weeksSnap.forEach((doc) => {
        const w = doc.data() as any;
        const rawName: string = w?.restaurant || "";
        if (!rawName.trim()) return;
        const key = canonRestaurant(rawName);
        if (!agg[key]) {
            agg[key] = { name: rawName.trim(), visitCount: 0, scoreTotal: 0, ratedWeeks: 0, lastVisitMs: 0, lastKing: null };
        }
        const entry = agg[key];
        entry.visitCount += 1;

        const weekId = doc.id;
        if (weekScoreCount[weekId]) {
            entry.scoreTotal += weekScoreSum[weekId] / weekScoreCount[weekId];
            entry.ratedWeeks += 1;
        }

        const createdMs =
            typeof w?.createdAt?.toMillis === "function"
                ? w.createdAt.toMillis()
                : typeof w?.createdAt?.seconds === "number"
                ? w.createdAt.seconds * 1000
                : 0;
        if (createdMs >= entry.lastVisitMs) {
            entry.lastVisitMs = createdMs;
            entry.lastKing = w?.king ?? null;
        }
    });

    return Object.values(agg)
        .map((e) => ({
            name: e.name,
            visitCount: e.visitCount,
            avgRating: e.ratedWeeks > 0 ? Math.round((e.scoreTotal / e.ratedWeeks) * 10) / 10 : 0,
            lastVisitMs: e.lastVisitMs,
            lastKing: e.lastKing,
        }))
        .sort((a, b) => b.visitCount - a.visitCount || b.avgRating - a.avgRating);
}

// --- Read: locations (real-time) ---

export function listenToRestaurantLocations(cb: (locations: RestaurantLocation[]) => void) {
    return onSnapshot(collection(db, "restaurantLocations"), (snap) => {
        const list: RestaurantLocation[] = snap.docs.map((doc) => {
            const d = doc.data() as any;
            return {
                id: doc.id,
                name: d?.name || "",
                lat: Number(d?.lat),
                lng: Number(d?.lng),
                address: typeof d?.address === "string" ? d.address : undefined,
                mapsUrl: typeof d?.mapsUrl === "string" ? d.mapsUrl : undefined,
                addedBy: d?.addedBy || "",
                updatedAtMs:
                    typeof d?.updatedAt?.toMillis === "function"
                        ? d.updatedAt.toMillis()
                        : typeof d?.updatedAt?.seconds === "number"
                        ? d.updatedAt.seconds * 1000
                        : 0,
            };
        });
        cb(list);
    });
}

// --- Write (server-authoritative) ---

export function setRestaurantLocation(loc: {
    name: string;
    lat: number;
    lng: number;
    address?: string;
    mapsUrl?: string;
}) {
    return invokeRpc("setRestaurantLocation", loc);
}

export function deleteRestaurantLocation(name: string) {
    return invokeRpc("deleteRestaurantLocation", { name });
}

// --- Name cleanup (dean-only) ---

export interface RestaurantNameEntry {
    name: string; // representative (most common) raw spelling
    count: number;
    variants: string[]; // every distinct raw string that maps to this canonical name
}

/**
 * All distinct restaurant names across ALL weeks (any status), grouped by
 * canonical form. `variants` holds every raw spelling (e.g. trailing space /
 * tatweel differences) so a merge can update them all, not just the displayed one.
 */
export async function getAllRestaurantNames(): Promise<RestaurantNameEntry[]> {
    const snap = await getDocs(collection(db, "weeks"));
    const groups = new Map<string, { total: number; variantCounts: Map<string, number> }>();
    snap.forEach((doc) => {
        const raw: string = (doc.data() as any)?.restaurant || "";
        const name = raw.trim();
        if (!name) return;
        const key = canonRestaurant(name);
        let g = groups.get(key);
        if (!g) {
            g = { total: 0, variantCounts: new Map() };
            groups.set(key, g);
        }
        g.total += 1;
        g.variantCounts.set(name, (g.variantCounts.get(name) || 0) + 1);
    });

    return Array.from(groups.values())
        .map((g) => {
            const variants = Array.from(g.variantCounts.entries()).sort((a, b) => b[1] - a[1]);
            return {
                name: variants[0][0], // most common spelling
                count: g.total,
                variants: variants.map((v) => v[0]),
            };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"));
}

export function mergeRestaurantNames(fromNames: string[], toName: string): Promise<{ updatedWeeks: number; mergedNames: number }> {
    return invokeRpc("mergeRestaurantNames", { fromNames, toName });
}

/**
 * Levenshtein-based similarity (0..1). Used to surface likely-duplicate /
 * mistyped restaurant names for the cleanup tool.
 */
export function nameSimilarity(a: string, b: string): number {
    const s = canonRestaurant(a).replace(/^مطعم\s+/, "").toLowerCase();
    const t = canonRestaurant(b).replace(/^مطعم\s+/, "").toLowerCase();
    if (s === t) return 1;
    if (!s.length || !t.length) return 0;
    const m = s.length;
    const n = t.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    const dist = dp[m][n];
    return 1 - dist / Math.max(m, n);
}

/** Groups names that are likely the same place (normalized-equal or highly similar). */
export function findSimilarGroups(entries: RestaurantNameEntry[], threshold = 0.8): RestaurantNameEntry[][] {
    const groups: RestaurantNameEntry[][] = [];
    const used = new Set<number>();
    for (let i = 0; i < entries.length; i++) {
        if (used.has(i)) continue;
        const group = [entries[i]];
        used.add(i);
        for (let j = i + 1; j < entries.length; j++) {
            if (used.has(j)) continue;
            if (nameSimilarity(entries[i].name, entries[j].name) >= threshold) {
                group.push(entries[j]);
                used.add(j);
            }
        }
        if (group.length > 1) groups.push(group);
    }
    return groups;
}

// --- Geocoding ---

export async function geocodeSearch(q: string): Promise<GeocodeResult[]> {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("تعذّر البحث عن الموقع");
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
}

/** Expands a short maps link (goo.gl / maps.app.goo.gl) server-side to extract coordinates. */
export async function expandMapLink(url: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const res = await fetch(`/api/geocode?expand=${encodeURIComponent(url)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (typeof data?.lat === "number" && typeof data?.lng === "number") {
            return { lat: data.lat, lng: data.lng };
        }
        return null;
    } catch {
        return null;
    }
}

// --- Link parsing (client-side, no network) ---

const COORD_PATTERNS: RegExp[] = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // the pinned place (prefer over @)
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // camera center
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // Google + Apple
    /[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]sll=(-?\d+\.\d+),(-?\d+\.\d+)/, // Apple
    /[?&]coordinate=(-?\d+\.\d+),(-?\d+\.\d+)/, // Apple
    /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/, // raw "lat,lng" paste
];

export function parseMapLink(input: string): { lat: number; lng: number } | null {
    if (!input) return null;
    for (const re of COORD_PATTERNS) {
        const m = input.match(re);
        if (m) {
            const lat = parseFloat(m[1]);
            const lng = parseFloat(m[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return { lat, lng };
            }
        }
    }
    return null;
}

export function isShortMapLink(input: string): boolean {
    return /(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(input);
}

export function buildGoogleMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
