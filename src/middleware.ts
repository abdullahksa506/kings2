import { NextRequest, NextResponse } from "next/server";

/**
 * Logs every incoming request (path, IP, country, UA) to the security log.
 * Fire-and-forget so it never slows the response. Static assets and the log
 * endpoint itself are excluded via the matcher below to avoid noise/loops.
 */
export function middleware(req: NextRequest) {
    try {
        const { pathname, search } = req.nextUrl;
        const ip =
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "";
        const country =
            req.headers.get("cf-ipcountry") ||
            req.headers.get("x-vercel-ip-country") ||
            req.headers.get("x-render-ip-country") ||
            "";
        const payload = {
            ip,
            country,
            path: (pathname + (search || "")).slice(0, 300),
            method: req.method,
            ua: req.headers.get("user-agent") || "",
        };

        // Fire-and-forget POST to the Node logging endpoint. Absolute URL from
        // the current origin so it works in all environments.
        const url = new URL("/api/security/log", req.nextUrl.origin);
        void fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            // don't keep the function alive waiting on this
            keepalive: true,
        }).catch(() => {});
    } catch {
        /* never block the request */
    }
    return NextResponse.next();
}

export const config = {
    // Run on everything EXCEPT static assets and the logging endpoint itself.
    matcher: [
        "/((?!_next/static|_next/image|api/security/log|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|mp3|wav)$).*)",
    ],
};
