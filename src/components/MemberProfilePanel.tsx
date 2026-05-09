"use client";

import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";
import { MemberProfileData, services } from "@/lib/services";
import BottomSheet from "./BottomSheet";

interface MemberProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserName: string;
}

export default function MemberProfilePanel({ isOpen, onClose, currentUserName }: MemberProfilePanelProps) {
    const [profile, setProfile] = useState<MemberProfileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isPrivateRatingsOpen, setIsPrivateRatingsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen || !currentUserName) return;
        const run = async () => {
            setLoading(true);
            const data = await services.getMemberProfile(currentUserName);
            setProfile(data);
            setLoading(false);
        };
        run();
    }, [isOpen, currentUserName]);

    useEffect(() => {
        if (!isOpen) {
            setIsPrivateRatingsOpen(false);
        }
    }, [isOpen]);

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="ملفي الإحصائي"
            subtitle={`العضو: ${currentUserName}`}
            icon={<UserCircle2 className="w-6 h-6" />}
            headerAccentClass="from-cyan-500/20 via-cyan-400/10 to-transparent"
        >
            <div>

                {loading || !profile ? (
                    <p className="text-center text-slate-500 py-10">جاري تحميل الملف...</p>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Item label="عدد المشاركات" value={`${profile.totalWeeksParticipated}`} />
                            <Item label="نسبة الحضور" value={`${profile.attendanceRate}%`} />
                            <Item label="حضور" value={`${profile.attendedCount}`} />
                            <Item label="اعتذارات" value={`${profile.absentCount}`} />
                            <Item label="مرات الملك" value={`${profile.timesAsKing}`} />
                            <Item label="عدد التقييمات" value={`${profile.ratingsGiven}`} />
                            <Item label="متوسط التقييم المعطى" value={`${profile.averageRatingGiven} ⭐`} />
                            <Item label="متوسط طلعاته كملك" value={`${profile.averageWeekScoreAsKing} ⭐`} />
                            <Item label="اليوم المفضل" value={profile.favoriteDay} />
                            <Item label="أفضل طلعة كملك" value={profile.bestWeekAsKing ? `${profile.bestWeekAsKing.restaurant || "غير محدد"} (${profile.bestWeekAsKing.score}⭐)` : "—"} />
                            <Item label="أضعف طلعة كملك" value={profile.worstWeekAsKing ? `${profile.worstWeekAsKing.restaurant || "غير محدد"} (${profile.worstWeekAsKing.score}⭐)` : "—"} />
                        </div>

                        <div className="border border-rose-700/40 bg-rose-950/20 rounded-2xl p-3">
                            <button
                                onClick={() => setIsPrivateRatingsOpen(prev => !prev)}
                                className="w-full px-3 py-2 rounded-xl border border-rose-500/60 bg-rose-600/20 text-rose-100 hover:bg-rose-600/30 transition-colors text-sm font-bold"
                            >
                                افتح على مسؤوليتك الخاصة
                            </button>

                            {isPrivateRatingsOpen && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs text-rose-200/90">
                                        تقييماتك الشخصية لكل مطعم سابق
                                    </p>

                                    {profile.restaurantRatings.length === 0 ? (
                                        <p className="text-sm text-slate-300">ما عندك تقييمات مطاعم محفوظة.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {profile.restaurantRatings.map((entry, index) => (
                                                <div key={`${entry.weekId}-${index}`} className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                                                    <p className="text-sm text-slate-200 truncate">{entry.restaurant}</p>
                                                    <span className="text-sm font-bold text-amber-300 whitespace-nowrap">{entry.score} ⭐</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </BottomSheet>
    );
}

function Item({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="text-sm text-white font-semibold mt-1">{value}</p>
        </div>
    );
}
