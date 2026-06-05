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
