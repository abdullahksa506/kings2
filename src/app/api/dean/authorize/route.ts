import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const { deviceId, deviceName, passcode } = await request.json();

        // 🛡️ Secret passcode isolated on the server-side! F12 won't see this.
        if (passcode !== "عبدالله") {
            return NextResponse.json({ error: "كود التوثيق غير صحيح!" }, { status: 401 });
        }

        const deanRef = adminDb.collection("users").doc("شوكا");
        const deanDoc = await deanRef.get();
        
        if (!deanDoc.exists) {
             return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
        }
        
        const trustedDevices = (deanDoc.data() as any).trustedDevices || [];
        const exists = trustedDevices.some((d: any) => d.id === deviceId);
        
        if (!exists) {
            trustedDevices.push({
                id: deviceId,
                name: deviceName || "جهاز غير معروف",
                addedAt: Date.now()
            });
            await deanRef.update({ trustedDevices });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
