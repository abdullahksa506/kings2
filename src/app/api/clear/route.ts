import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

function isAdminRequest(request: Request): boolean {
    const requiredKey = process.env.ADMIN_API_KEY;
    if (!requiredKey) return false;
    return request.headers.get("x-admin-key") === requiredKey;
}

export async function POST(request: Request) {
    if (!isAdminRequest(request)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const collections = ["weeks", "ratings", "users"];

        for (const coll of collections) {
            const snap = await adminDb.collection(coll).get();
            for (const d of snap.docs) {
                await d.ref.delete();
            }
        }

        return NextResponse.json({ success: true, message: "Database wiped clean." });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
