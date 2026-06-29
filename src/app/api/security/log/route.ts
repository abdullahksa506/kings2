import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Paths that scanners/bots commonly probe — flagged as suspicious.
const SUSPICIOUS = [
    /wp-admin|wp-login|wp-content|xmlrpc/i,
    /\.env|\.git|\.aws|\.ssh|id_rsa/i,
    /phpmyadmin|pma|adminer|mysql/i,
    /\.php($|\?)/i,
    /\/\.well-known\/(?!acme)/i,
    /eval|base64_|shell|cmd=|exec\(/i,
    /\/(config|backup|dump|\.sql|\.bak)/i,
    /actuator|console|jenkins|solr|struts/i,
    /vendor\/phpunit|composer\.json/i,
];

function isSuspicious(path: string): boolean {
    return SUSPICIOUS.some((re) => re.test(path));
}

// Mask an IP for public display: keep first 2 octets (IPv4) / first block (IPv6).
function maskIp(ip: string): string {
    if (!ip) return "—";
    if (ip.includes(":")) {
        const b = ip.split(":");
        return `${b[0]}:${b[1] || ""}:••••`;
    }
    const p = ip.split(".");
    if (p.length === 4) return `${p[0]}.${p[1]}.•.•`;
    return ip.slice(0, 6) + "…";
}

export async function POST(request: Request) {
    try {
        const b = await request.json();
        const rawIp = String(b?.ip || "").split(",")[0].trim();
        const path = String(b?.path || "/").slice(0, 300);
        const method = String(b?.method || "GET").slice(0, 8);
        const ua = String(b?.ua || "").slice(0, 250);
        let country = String(b?.country || "").slice(0, 4).toUpperCase();

        // Skip noise that slips through the matcher.
        if (/^\/(_next|favicon|icon|apple-icon|manifest|sw\.js|robots|sitemap)/.test(path)) {
            return NextResponse.json({ ok: true, skipped: true });
        }

        // Per-IP throttle: at most 1 log per IP per 5s (prevents scanner flood
        // from blowing through Firestore write quota). Stored in ipThrottle.
        const ipKey = rawIp.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 60) || "unknown";
        const throttleRef = adminDb.collection("ipThrottle").doc(ipKey);
        const now = Date.now();
        const throttleSnap = await throttleRef.get();
        const last = throttleSnap.exists ? Number((throttleSnap.data() as { ms?: number })?.ms ?? 0) : 0;
        if (now - last < 5000) {
            return NextResponse.json({ ok: true, throttled: true });
        }
        await throttleRef.set({ ms: now }, { merge: true });

        // Best-effort geo enrichment when no country header (cached per IP).
        if (!country && rawIp && !rawIp.startsWith("127.") && !rawIp.startsWith("::1")) {
            try {
                const geoRef = adminDb.collection("ipGeo").doc(ipKey);
                const geoSnap = await geoRef.get();
                if (geoSnap.exists) {
                    country = String((geoSnap.data() as { country?: string })?.country || "");
                } else {
                    const res = await fetch(`http://ip-api.com/json/${rawIp}?fields=countryCode`, {
                        signal: AbortSignal.timeout(2500),
                    });
                    if (res.ok) {
                        const g = await res.json();
                        country = String(g?.countryCode || "").toUpperCase();
                        await geoRef.set({ country, at: Timestamp.now() });
                    }
                }
            } catch { /* geo is best-effort */ }
        }

        const suspicious = isSuspicious(path);

        // Write the log entry.
        await adminDb.collection("requestLog").add({
            ipMasked: maskIp(rawIp),
            path,
            method,
            ua,
            country: country || "??",
            suspicious,
            createdAt: Timestamp.now(),
            createdAtMs: now,
        });

        // Update aggregate counters.
        const statsRef = adminDb.collection("securityStats").doc("main");
        const updates: Record<string, unknown> = {
            totalRequests: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
            [`countries.${country || "??"}`]: FieldValue.increment(1),
        };
        if (suspicious) updates.suspiciousRequests = FieldValue.increment(1);
        await statsRef.set(updates, { merge: true });

        // Occasionally trim the log to the last ~600 entries (cheap maintenance).
        if (Math.floor(now / 1000) % 25 === 0) {
            const old = await adminDb.collection("requestLog").orderBy("createdAtMs", "desc").offset(600).limit(50).get();
            if (!old.empty) {
                const batch = adminDb.batch();
                old.forEach((d) => batch.delete(d.ref));
                await batch.commit();
            }
        }

        return NextResponse.json({ ok: true, suspicious });
    } catch (e) {
        console.error("security log error", e);
        return NextResponse.json({ ok: false }, { status: 200 }); // never break the page
    }
}
