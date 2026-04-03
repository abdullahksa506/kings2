import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
        return NextResponse.json({ success: false, error: "Missing name parameter" }, { status: 400 });
    }

    try {
        const userRef = adminDb.collection("users").doc(name);
        const userDoc = await userRef.get();

        if (!userDoc.exists()) {
            return NextResponse.json({ success: false, message: `User "${name}" not found in database.` });
        }

        await userRef.delete();
        return NextResponse.json({ success: true, message: `User "${name}" has been deleted. They can now re-register.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
