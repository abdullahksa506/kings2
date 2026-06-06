import { NextResponse } from "next/server";
// @ts-expect-error — package has no types but ships a CommonJS export.
import { OpenLocationCode } from "open-location-code";

// Free geocoding proxy over OpenStreetMap Nominatim + safe short-link expansion.
// This is a GET route OUTSIDE the RPC auth switch, so it enforces its own
// IP-based rate limiting and an SSRF host allowlist.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
// Riyadh reference point — used to recover full Plus Codes from short ones.
const RIYADH_REF = { lat: 24.7136, lng: 46.6753 };
// Nominatim's usage policy requires an identifying User-Agent.
const USER_AGENT = "ArshAlkhamis-RestaurantMap/1.0 (friend-group app)";
// Google serves a coords-less consent page to non-browser agents, so short-link
// expansion uses realistic browser User-Agents instead. We try a few different
// ones because `g_st=ic` (open-in-app) links behave differently per UA.
const BROWSER_UAS = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

// Saudi Arabia bounding box (approx) — used to disambiguate lat/lng pairs found
// in a maps HTML page.
const KSA_LAT = [16, 33] as const;
const KSA_LNG = [34, 56] as const;

function extractCoordsFromHtml(text: string): { lat: number; lng: number } | null {
    // Find any high-precision number pair and accept the first that fits inside
    // Saudi Arabia in either order. The pair may be separated by JSON keys
    // like `"lng":` so we allow up to ~16 non-digit characters between them.
    const re = /(-?\d{1,3}\.\d{4,})[^\d-]{1,16}(-?\d{1,3}\.\d{4,})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const a = parseFloat(m[1]);
        const b = parseFloat(m[2]);
        if (a >= KSA_LAT[0] && a <= KSA_LAT[1] && b >= KSA_LNG[0] && b <= KSA_LNG[1]) {
            return { lat: a, lng: b };
        }
        if (b >= KSA_LAT[0] && b <= KSA_LAT[1] && a >= KSA_LNG[0] && a <= KSA_LNG[1]) {
            return { lat: b, lng: a };
        }
    }
    return null;
}

/**
 * `maps.app.goo.gl` returns an HTML stub with the resolved Google Maps URL
 * embedded in `<link rel="canonical">` / `<meta property="og:url">` /
 * `al:web:url`. Pulling that URL gives us @lat,lng or !3d!4d to parse.
 * We scan tags first (attribute order-independent), then fall back to any
 * `/maps/` URL embedded anywhere in the HTML.
 */
function isMapsishUrl(u: string): boolean {
    return /\/maps\b/i.test(u) || /\bmaps\.(google|apple)\./i.test(u);
}

function extractMetaUrl(html: string): string | null {
    const linkTags = html.match(/<link\b[^>]*>/gi) || [];
    for (const tag of linkTags) {
        if (/rel=["']canonical["']/i.test(tag)) {
            const href = tag.match(/href=["']([^"']+)["']/i);
            if (href && isMapsishUrl(href[1])) return decodeHtmlEntities(href[1]);
        }
    }
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of metaTags) {
        if (/property=["'](?:og:url|al:web:url)["']/i.test(tag)) {
            const content = tag.match(/content=["']([^"']+)["']/i);
            if (content && isMapsishUrl(content[1])) return decodeHtmlEntities(content[1]);
        }
    }
    const generic = html.match(/https?:\/\/(?:www\.)?google\.com\/maps\/[^\s"'<>]+/i);
    if (generic) return decodeHtmlEntities(generic[0]);
    return null;
}

/**
 * Many Google Maps pages embed a Static Maps URL as `og:image` /
 * `twitter:image`, and that URL always carries `center=lat,lng` or
 * `markers=…|lat,lng`. This is the most reliable extraction for
 * `maps.app.goo.gl/...?g_st=ic` pages whose canonical doesn't help.
 */
function extractCoordsFromImageUrls(html: string): { lat: number; lng: number } | null {
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    for (const tag of metaTags) {
        if (!/property=["'](?:og:image|twitter:image)["']|name=["']twitter:image["']/i.test(tag)) continue;
        const content = tag.match(/content=["']([^"']+)["']/i);
        if (!content) continue;
        const url = decodeHtmlEntities(content[1]);
        // Static Maps params: center=LAT,LNG or markers=...|LAT,LNG
        let m = url.match(/[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (!m) m = url.match(/[?&]markers=[^&]*?\|(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (m) {
            const lat = parseFloat(m[1]);
            const lng = parseFloat(m[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
        }
    }
    return null;
}

/**
 * Decode a Plus Code (Open Location Code) — Google embeds these in the `q=`
 * parameter of maps.app.goo.gl redirects (e.g. "PM4C+33J,7911 ابن الاثير...").
 * Short codes are recovered against the Riyadh reference, since all the
 * group's outings are in Riyadh.
 */
function extractCoordsFromPlusCode(text: string): { lat: number; lng: number } | null {
    // OLC alphabet: 23456789CFGHJMPQRVWX (no I/L/O/U/A/B/D/E/K/N/S/T/Y/Z/0/1)
    const re = /\b([23456789CFGHJMPQRVWX]{4,8})\+([23456789CFGHJMPQRVWX]{2,3})\b/i;
    const m = text.match(re);
    if (!m) return null;
    const code = `${m[1]}+${m[2]}`.toUpperCase();
    try {
        const olc = new OpenLocationCode();
        const full = code.length === 11
            ? code
            : olc.recoverNearest(code, RIYADH_REF.lat, RIYADH_REF.lng);
        const area = olc.decode(full);
        const lat = area.latitudeCenter;
        const lng = area.longitudeCenter;
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    } catch { /* invalid code */ }
    return null;
}

/** Page title / og:title — used as a Nominatim search fallback for short links. */
function extractPlaceName(html: string): string | null {
    const og = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const raw = og?.[1] || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || null;
    if (!raw) return null;
    // Strip the "· Google Maps" / "- Google Maps" suffix the page adds.
    return decodeHtmlEntities(raw).replace(/\s*[·\-|]\s*Google\s*Maps?\s*$/i, "").trim() || null;
}

function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

async function nominatimSearch(q: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const url = `${NOMINATIM}?format=json&limit=1&countrycodes=sa&accept-language=ar&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) return null;
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : null;
        if (!first) return null;
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
    } catch {
        return null;
    }
}

// Hosts we are willing to follow redirects for (short-link expansion only).
const ALLOWED_EXPAND_HOSTS = [
    "maps.app.goo.gl",
    "goo.gl",
    "maps.google.com",
    "www.google.com",
    "google.com",
    "maps.apple.com",
];

const COORD_PATTERNS: RegExp[] = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]center=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]sll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]coordinate=(-?\d+\.\d+),(-?\d+\.\d+)/,
];

// --- Simple in-memory IP rate limiter (10 req / 30s per IP) ---
const rl = new Map<string, { count: number; windowStart: number }>();
const RL_LIMIT = 10;
const RL_WINDOW = 30 * 1000;

function rateLimited(ip: string): boolean {
    const now = Date.now();
    const bucket = rl.get(ip);
    if (!bucket || now - bucket.windowStart >= RL_WINDOW) {
        rl.set(ip, { count: 1, windowStart: now });
        return false;
    }
    if (bucket.count >= RL_LIMIT) return true;
    bucket.count += 1;
    if (rl.size > 2000) {
        for (const [k, v] of rl) if (now - v.windowStart >= RL_WINDOW) rl.delete(k);
    }
    return false;
}

function getIp(request: Request): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function extractCoords(text: string): { lat: number; lng: number } | null {
    for (const re of COORD_PATTERNS) {
        const m = text.match(re);
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

function hostAllowed(rawUrl: string): boolean {
    try {
        const u = new URL(rawUrl);
        if (u.protocol !== "https:" && u.protocol !== "http:") return false;
        return ALLOWED_EXPAND_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
    } catch {
        return false;
    }
}

/**
 * Run the full extraction chain on a URL with a given User-Agent. Returns
 * `{lat,lng}` on success, or `{placeName}` (informational) if we identified
 * the place name but no coords. Returns null on hard fetch failure.
 */
async function tryExpandWithUa(
    url: string,
    ua: string,
): Promise<{ lat: number; lng: number } | { placeName: string | null } | null> {
    const res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": ua, "Accept-Language": "ar,en;q=0.8" },
    });

    // 1) Coords in the final URL after redirects (@lat,lng / !3d!4d / ?q= etc.)
    const finalUrl = res.url || "";
    const fromUrl = extractCoords(finalUrl);
    if (fromUrl) return fromUrl;

    // 1b) Plus Code in the final URL — `maps.app.goo.gl/...?g_st=ic` redirects
    //     to `?q=PLUSCODE,address` for many places, and OLC decodes it offline.
    const fromPlusUrl = extractCoordsFromPlusCode(finalUrl);
    if (fromPlusUrl) return fromPlusUrl;

    const body = (await res.text()).slice(0, 400000);

    // 2) Structured coord patterns anywhere in the HTML body.
    const fromBody = extractCoords(body);
    if (fromBody) return fromBody;

    // 2b) Plus Code in the body (some pages embed it in metadata).
    const fromPlusBody = extractCoordsFromPlusCode(body);
    if (fromPlusBody) return fromPlusBody;

    // 3) Static Maps URLs in og:image / twitter:image — these reliably carry
    //    `center=lat,lng` and exist on most Google Maps place pages.
    const fromImage = extractCoordsFromImageUrls(body);
    if (fromImage) return fromImage;

    // 4) Canonical / og:url / al:web:url with embedded coords.
    const metaUrl = extractMetaUrl(body);
    if (metaUrl) {
        const fromMeta = extractCoords(metaUrl);
        if (fromMeta) return fromMeta;
        if (hostAllowed(metaUrl)) {
            try {
                const r2 = await fetch(metaUrl, {
                    redirect: "follow",
                    headers: { "User-Agent": ua, "Accept-Language": "ar,en;q=0.8" },
                });
                const c2 = extractCoords(r2.url || "");
                if (c2) return c2;
                const b2 = (await r2.text()).slice(0, 400000);
                const c3 = extractCoords(b2)
                    || extractCoordsFromImageUrls(b2)
                    || extractCoordsFromHtml(b2);
                if (c3) return c3;
            } catch { /* ignore */ }
        }
    }

    // 5) KSA-bounded numeric pair scattered in the HTML.
    const ksa = extractCoordsFromHtml(body);
    if (ksa) return ksa;

    // 6) Surface the place name so the caller can Nominatim-search it.
    return { placeName: extractPlaceName(body) };
}

export async function GET(request: Request) {
    const ip = getIp(request);
    if (rateLimited(ip)) {
        return NextResponse.json({ error: "طلبات كثيرة، انتظر لحظة" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const expand = searchParams.get("expand");
    const q = searchParams.get("q");

    // --- Mode 1: expand a short maps link to coordinates ---
    if (expand) {
        if (!hostAllowed(expand)) {
            return NextResponse.json({ error: "رابط غير مسموح" }, { status: 400 });
        }
        // Try the chain with each UA — `g_st=ic` (open-in-app) intent pages
        // serve different content per UA, so a UA the first one missed may work.
        let lastPlaceName: string | null = null;
        for (const ua of BROWSER_UAS) {
            try {
                const result = await tryExpandWithUa(expand, ua);
                if (result && "lat" in result) return NextResponse.json(result);
                if (result?.placeName && !lastPlaceName) lastPlaceName = result.placeName;
            } catch { /* try the next UA */ }
        }
        // Final fallback: Nominatim search on the extracted place name.
        if (lastPlaceName) {
            const nom = await nominatimSearch(lastPlaceName);
            if (nom) return NextResponse.json({ ...nom, viaPlace: lastPlaceName });
        }
        return NextResponse.json(
            { error: "تعذّر استخراج الإحداثيات من الرابط", placeName: lastPlaceName },
            { status: 404 },
        );
    }

    // --- Mode 2: search by name (Nominatim) ---
    if (q) {
        if (q.length > 200) return NextResponse.json({ error: "نص طويل" }, { status: 400 });
        try {
            const url = `${NOMINATIM}?format=json&limit=5&countrycodes=sa&accept-language=ar&q=${encodeURIComponent(q)}`;
            const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
            if (!res.ok) {
                return NextResponse.json({ error: "خدمة البحث غير متاحة حالياً" }, { status: 502 });
            }
            const data = await res.json();
            const results = (Array.isArray(data) ? data : []).map((r: any) => ({
                name: r.display_name?.split(",")[0] || q,
                address: r.display_name || "",
                lat: parseFloat(r.lat),
                lng: parseFloat(r.lon),
            })).filter((r: any) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
            return NextResponse.json({ results });
        } catch {
            return NextResponse.json({ error: "تعذّر البحث" }, { status: 502 });
        }
    }

    return NextResponse.json({ error: "مطلوب q أو expand" }, { status: 400 });
}
