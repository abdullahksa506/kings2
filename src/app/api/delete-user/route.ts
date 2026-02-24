import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, getDoc } from "firebase/firestore";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
        return NextResponse.json({ success: false, error: "Missing name parameter" }, { status: 400 });
    }

    try {
        const userRef = doc(db, "users", name);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return NextResponse.json({ success: false, message: `User "${name}" not found in database.` });
        }

        await deleteDoc(userRef);
        return NextResponse.json({ success: true, message: `User "${name}" has been deleted. They can now re-register.` });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
