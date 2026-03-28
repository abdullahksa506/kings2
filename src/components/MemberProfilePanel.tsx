"use client";

import { useEffect, useState } from "react";
import { UserCircle2, X } from "lucide-react";
import { MemberProfileData, services, VALID_NAMES } from "@/lib/services";

interface MemberProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MemberProfilePanel({ isOpen, onClose }: MemberProfilePanelProps) {
    const [selectedMember, setSelectedMember] = useState(VALID_NAMES[0]);
    const [profile, setProfile] = useState<MemberProfileData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const run = async () => {
            setLoading(true);
            const data = await services.getMemberProfile(selectedMember);
            setProfile(data);
            setLoading(false);
        };
        run();
    }, [isOpen, selectedMember]);

        import { MemberProfileData, services } from "@/lib/services";

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 max-h-[92vh] overflow-y-auto">
            currentUserName: string;
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
        export default function MemberProfilePanel({ isOpen, onClose, currentUserName }: MemberProfilePanelProps) {
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                if (!isOpen || !currentUserName) return;

                <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 mb-4">
                    const data = await services.getMemberProfile(currentUserName);
                </select>

                {loading || !profile ? (
                    <p className="text-center text-slate-500 py-10">جاري تحميل الملف...</p>
            }, [isOpen, currentUserName]);
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Item label="عدد المشاركات" value={`${profile.totalWeeksParticipated}`} />
                        <Item label="نسبة الحضور" value={`${profile.attendanceRate}%`} />
                        <Item label="حضور" value={`${profile.attendedCount}`} />
                        <Item label="اعتذارات" value={`${profile.absentCount}`} />
                        <Item label="مرات الملك" value={`${profile.timesAsKing}`} />
                        <Item label="عدد التقييمات" value={`${profile.ratingsGiven}`} />
                        <Item label="متوسط التقييم المعطى" value={`${profile.averageRatingGiven} ⭐`} />
                        <Item label="متوسط طلعاته كملك" value={`${profile.averageWeekScoreAsKing} ⭐`} />
                                ملفي الإحصائي
                        <Item label="أفضل طلعة كملك" value={profile.bestWeekAsKing ? `${profile.bestWeekAsKing.restaurant || "غير محدد"} (${profile.bestWeekAsKing.score}⭐)` : "—"} />
                        <Item label="أضعف طلعة كملك" value={profile.worstWeekAsKing ? `${profile.worstWeekAsKing.restaurant || "غير محدد"} (${profile.worstWeekAsKing.score}⭐)` : "—"} />
                    </div>
                )}
            </div>
        </div>

                        <div className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 mb-4">
                            العضو: {currentUserName}
                        </div>
function Item({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="text-sm text-white font-semibold mt-1">{value}</p>
        </div>
    );
}

