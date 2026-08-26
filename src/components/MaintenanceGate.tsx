"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش حطيت البوابة في الـ layout مو في الصفحة؟"
 * قال: "لأن اللي يبي يتحايل بيجرب كل الروابط... وأنا أقفل الباب مو الغرفة 😂🚪"
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { services, MaintenanceState } from "@/lib/services";

const OFF: MaintenanceState = { active: false, note: null, startedAt: null, startedBy: null };

/**
 * 🔧 بوابة الصيانة — تغلّف كل الموقع.
 *
 * لما العميد يشغّل الصيانة، أي عضو مسجّل دخول يشوف صفحة الصيانة فقط مهما كان
 * الرابط اللي فتحه. غير المسجّلين يشوفون شاشة الدخول عادي.
 * العميد عنده مفتاح تجاوز عشان ما ينحبس برّا لوحته.
 *
 * 🗑️ للحذف الكامل: REMOVED_FEATURES.md — قسم «وضع الصيانة».
 */
export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const [maint, setMaint] = useState<MaintenanceState>(OFF);
    const [deanBypass, setDeanBypass] = useState(false);

    useEffect(() => {
        const unsub = services.listenToMaintenance(setMaint);
        return () => unsub();
    }, []);

    // قبل ما نعرف مين المستخدم، أو وهو مو مسجّل — الصفحة تشتغل عادي
    // (شاشة الدخول لازم تظهر عشان يقدر يسجّل ويحدد حضوره).
    if (loading || !user) return <>{children}</>;

    const isDean = user.name === "شوكا";
    if (maint.active && !(isDean && deanBypass)) {
        return <MaintenanceScreen state={maint} onDeanBypass={() => setDeanBypass(true)} />;
    }

    return <>{children}</>;
}
