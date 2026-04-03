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

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
        return NextResponse.json({ success: false, error: "Missing name parameter" }, { status: 400 });
    }

    try {
        const userRef = adminDb.collection("users").doc(name);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ success: false, message: `User "${name}" not found in database.` });
        }

        await userRef.delete();
        return NextResponse.json({ success: true, message: `User "${name}" has been deleted. They can now re-register.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
