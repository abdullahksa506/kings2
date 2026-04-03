import { adminDb } from "@/lib/firebase-admin";

export type ServerAuthUser = {
    name: string;
    role: string;
    viaAdminKey: boolean;
};

export type ServerAuthResult =
    | { ok: true; user: ServerAuthUser }
    | { ok: false; status: number; error: string };

function authPasswordMatches(dbPassword: unknown, clientToken: unknown): boolean {
    if (typeof dbPassword !== "string" || typeof clientToken !== "string") return false;
    if (dbPassword === clientToken) return true;
    const isHex64 = (s: string) => s.length === 64 && /^[a-f0-9]+$/i.test(s);
    if (isHex64(dbPassword) && isHex64(clientToken)) {
        return dbPassword.toLowerCase() === clientToken.toLowerCase();
    }
    return false;
}

function decodeHeaderValue(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export async function authenticateServerRequest(
    request: Request,
    options: { allowedRoles?: string[]; allowAdminKey?: boolean } = {}
): Promise<ServerAuthResult> {
    const allowAdminKey = options.allowAdminKey === true;
    const allowedRoles = options.allowedRoles || [];

    const adminKey = request.headers.get("x-admin-key");
    const requiredAdminKey = process.env.ADMIN_API_KEY;
    if (allowAdminKey && requiredAdminKey && adminKey === requiredAdminKey) {
        return { ok: true, user: { name: "__admin_key__", role: "dean", viaAdminKey: true } };
    }

    const rawName = request.headers.get("x-user-name")?.trim() || "";
    const rawToken = request.headers.get("x-user-token")?.trim() || "";
    const name = decodeHeaderValue(rawName);
    const token = decodeHeaderValue(rawToken);

    if (!name || !token) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const userSnap = await adminDb.collection("users").doc(name).get();
    if (!userSnap.exists) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const userData = userSnap.data() as any;
    if (!authPasswordMatches(userData?.password, token)) {
        return { ok: false, status: 401, error: "Unauthorized" };
    }

    const role = typeof userData?.role === "string" ? userData.role : "user";
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    return { ok: true, user: { name, role, viaAdminKey: false } };
}
