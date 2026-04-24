import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authenticateServerRequest } from "@/lib/serverRequestAuth";

const BATCH_SIZE = 400;

async function clearChatMessages(): Promise<number> {
    let deleted = 0;

    // Delete in chunks to avoid loading large collections into memory.
    while (true) {
        const snap = await adminDb.collection("chatMessages").limit(BATCH_SIZE).get();
        if (snap.empty) break;

        const batch = adminDb.batch();
        for (const doc of snap.docs) {
            batch.delete(doc.ref);
        }

        await batch.commit();
        deleted += snap.size;

        if (snap.size < BATCH_SIZE) break;
    }

    return deleted;
}

export async function POST(request: Request) {
    try {
        const auth = await authenticateServerRequest(request, {
            allowedRoles: ["dean"],
            allowAdminKey: true,
        });

        if (!auth.ok) {
            return NextResponse.json(
                { success: false, error: auth.error },
                { status: auth.status }
            );
        }

        const deleted = await clearChatMessages();
        return NextResponse.json({
            success: true,
            deleted,
            message: "Chat Board messages cleared.",
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to clear chat messages." },
            { status: 500 }
        );
    }
}
