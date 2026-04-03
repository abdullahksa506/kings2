import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
    try {
        const { deviceId, deviceName, passcode } = await request.json();
        const requiredPasscode = process.env.DEAN_DEVICE_PASSCODE;

        if (!requiredPasscode) {
            return NextResponse.json({ error: "Server not configured" }, { status: 500 });
        }

        if (typeof deviceId !== "string" || !deviceId.trim()) {
            return NextResponse.json({ error: "معرف الجهاز غير صالح" }, { status: 400 });
        }

        if (passcode !== requiredPasscode) {
            return NextResponse.json({ error: "كود التوثيق غير صحيح!" }, { status: 401 });
        }

        const deanRef = adminDb.collection("users").doc("شوكا");
        const deanDoc = await deanRef.get();
        
        if (!deanDoc.exists) {
             return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
        }
        
        const trustedDevices = (deanDoc.data() as any).trustedDevices || [];
        const normalizedDeviceId = deviceId.trim();
        const exists = trustedDevices.some((d: any) => d.id === normalizedDeviceId);
        
        if (!exists) {
            trustedDevices.push({
                id: normalizedDeviceId,
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
