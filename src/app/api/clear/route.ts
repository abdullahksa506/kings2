/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش خايف من زر المسح؟"
 * قال: "لأني شفت مبرمج يمسح البرودكشن بدل التيست... وصار AI بلا ذاكرة 😂🗑️"
 */

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

    let body: any = {};
    try { body = await request.json(); } catch { /* empty body allowed */ }

    // Second confirmation gate: even with the admin key, the caller must
    // explicitly opt in. Prevents an accidental/leaked-key one-shot wipe.
    if (body?.confirm !== "WIPE-CONFIRM") {
        return NextResponse.json(
            { success: false, error: "Confirmation required: send { confirm: 'WIPE-CONFIRM' }" },
            { status: 400 },
        );
    }

    try {
        // NEVER wipe `users` — that destroys every account (incl. the dean) and
        // hands the door to whoever re-registers a name first. Accounts are
        // removed one-by-one via /api/delete-user, never in a blanket wipe.
        const collections = ["weeks", "ratings"];

        for (const coll of collections) {
            const snap = await adminDb.collection(coll).get();
            for (const d of snap.docs) {
                await d.ref.delete();
            }
        }

        return NextResponse.json({ success: true, message: "Cleared weeks + ratings (users preserved)." });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
    }
}
