"use client";

import { useState } from "react";
import { Crown, MapPin, Calendar, Vote, Users, Star, ChevronRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { WeekSession, services } from "@/lib/services";

interface BentoWeekViewProps {
    currentWeek: WeekSession | null;
    pastWeek: WeekSession | null;
    userName: string;
    onSwitchToFullView: () => void;
}

type TileId = "king" | "restaurant" | "day" | "vote" | "attendance" | "past";

interface TileProps {
    id: TileId;
    openId: TileId | null;
    onToggle: (id: TileId) => void;
    gradient: string;
    span?: string;
    front: React.ReactNode;
    back: React.ReactNode;
}

function Tile({ id, openId, onToggle, gradient, span = "", front, back }: TileProps) {
    const isOpen = openId === id;
    return (
        <button
            onClick={() => onToggle(id)}
            className={`${gradient} ${span} relative rounded-3xl p-4 text-right overflow-hidden transition-all duration-300 text-white shadow-lg ${
                isOpen ? "ring-4 ring-white/60 scale-[1.02]" : "active:scale-95"
            }`}
            style={{ minHeight: 130 }}
        >
            <div
                className={`transition-all duration-500 ${
                    isOpen ? "opacity-0 scale-95 pointer-events-none absolute inset-4" : "opacity-100 scale-100"
                }`}
            >
                {front}
            </div>
            <div
                className={`absolute inset-4 transition-all duration-500 ${
                    isOpen ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
                }`}
            >
                {back}
            </div>
        </button>
    );
}

export default function BentoWeekView({
    currentWeek,
    pastWeek,
    userName,
    onSwitchToFullView,
}: BentoWeekViewProps) {
    const [open, setOpen] = useState<TileId | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const toggle = (id: TileId) => setOpen((prev) => (prev === id ? null : id));

    const markAttendance = async (isAbsent: boolean) => {
        if (!currentWeek || !userName || busy) return;
        setBusy("attendance");
        try {
            await services.toggleAttendance(currentWeek.id, userName, isAbsent);
            toast.success(isAbsent ? "تم تسجيل الغياب ❌" : "تم تسجيل الحضور ✅");
        } catch (e) {
            toast.error("صار خطأ، حاول مرة ثانية");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const castVote = async (restaurant: string) => {
        if (!currentWeek || !userName || busy) return;
        setBusy("vote");
        try {
            await services.submitRestaurantVote(currentWeek.id, restaurant);
            toast.success(`صوّتت لـ ${restaurant} 🗳️`);
        } catch (e) {
            toast.error("ما قدرنا نسجل صوتك");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    if (!currentWeek) {
        return (
            <div className="max-w-3xl mx-auto px-2 py-8 text-center">
                <p className="text-white/80">لا توجد جلسة أسبوعية الآن.</p>
            </div>
        );
    }

    const kingName = currentWeek.king || (currentWeek.isRandom ? "عشوائي 🎲" : "—");
    const restaurant = currentWeek.restaurant || "لم يُختر بعد";
    const day = currentWeek.day || "لم يحدد";
    const attendeesCount = currentWeek.responded?.length || 0;
    const absenteesCount = currentWeek.absentees?.length || 0;

    // Votes data for tile back
    const voteCounts: Record<string, number> = {};
    if (currentWeek.restaurantVotes) {
        Object.values(currentWeek.restaurantVotes).forEach((r) => {
            voteCounts[r] = (voteCounts[r] || 0) + 1;
        });
    }
    const voteEntries = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);
    const totalVotes = voteEntries.reduce((sum, [, n]) => sum + n, 0);
    const votingActive = currentWeek.restaurantVotingActive;
    const voteLeader = voteEntries[0]?.[0];
    const candidates = currentWeek.restaurantCandidates || [];
    const myVote = userName ? currentWeek.restaurantVotes?.[userName] : undefined;
    const myAttendance = userName
        ? currentWeek.responded?.includes(userName)
            ? currentWeek.absentees?.includes(userName)
                ? "absent"
                : "present"
            : "pending"
        : "pending";

    return (
        <div className="max-w-3xl mx-auto space-y-3">
            {/* Hint banner */}
            <div className="bg-white/8 backdrop-blur border border-white/15 rounded-2xl px-4 py-2.5 text-center text-white/85 text-xs">
                🍱 عرض البنتو التفاعلي — انقر على أي مربّع ليفتح ويكشف تفاصيله
            </div>

            <div className="grid grid-cols-2 gap-3" style={{ direction: "rtl" }}>
                {/* King — large 2x2 */}
                <Tile
                    id="king"
                    openId={open}
                    onToggle={toggle}
                    gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                    span="col-span-2 row-span-2"
                    front={
                        <div className="h-full flex flex-col justify-between min-h-[260px]">
                            <Crown className="w-9 h-9 text-white/90" />
                            <div>
                                <p className="text-white/85 text-xs font-semibold">ملك الأسبوع</p>
                                <h3 className="text-3xl md:text-4xl font-black mt-1">{kingName}</h3>
                                <p className="text-white/70 text-[11px] mt-3">اضغط للتفاصيل ↺</p>
                            </div>
                        </div>
                    }
                    back={
                        <div className="h-full flex flex-col justify-center gap-3 min-h-[260px]">
                            <p className="text-2xl font-black">👑 {kingName}</p>
                            <p className="flex items-center gap-2 text-base">
                                <Calendar className="w-5 h-5" /> {day}
                            </p>
                            <p className="flex items-center gap-2 text-base">
                                <MapPin className="w-5 h-5" /> {restaurant}
                            </p>
                            <p className="text-white/80 text-xs">
                                دورة {currentWeek.cycleNumber} · أسبوع {currentWeek.weekNumber}
                            </p>
                            <p className="text-white/70 text-[11px] mt-1">اضغط للرجوع ↺</p>
                        </div>
                    }
                />

                {/* Restaurant */}
                <Tile
                    id="restaurant"
                    openId={open}
                    onToggle={toggle}
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                    front={
                        <div className="h-full flex flex-col justify-between">
                            <MapPin className="w-6 h-6" />
                            <div>
                                <p className="text-white/85 text-[10px] font-semibold">المطعم</p>
                                <h3 className="text-base font-bold mt-0.5 line-clamp-2">{restaurant}</h3>
                            </div>
                        </div>
                    }
                    back={
                        <div className="h-full flex flex-col justify-center text-sm gap-1.5">
                            <p className="font-bold">{restaurant}</p>
                            {currentWeek.activity && (
                                <p className="text-white/85 text-xs">🎯 {currentWeek.activity}</p>
                            )}
                            <p className="text-white/75 text-[11px]">دورة {currentWeek.cycleNumber}</p>
                        </div>
                    }
                />

                {/* Day */}
                <Tile
                    id="day"
                    openId={open}
                    onToggle={toggle}
                    gradient="bg-gradient-to-br from-fuchsia-500 to-purple-600"
                    front={
                        <div className="h-full flex flex-col justify-between">
                            <Calendar className="w-6 h-6" />
                            <div>
                                <p className="text-white/85 text-[10px] font-semibold">اليوم</p>
                                <h3 className="text-xl font-bold mt-0.5">{day}</h3>
                            </div>
                        </div>
                    }
                    back={
                        <div className="h-full flex flex-col justify-center gap-1 text-sm">
                            <p className="font-bold text-base">📅 {day}</p>
                            <p className="text-white/85 text-xs">
                                الحالة:{" "}
                                {currentWeek.status === "completed"
                                    ? "اكتمل ✅"
                                    : currentWeek.status === "skipped"
                                    ? "متخطّى ⏭"
                                    : "قيد التنفيذ ⏳"}
                            </p>
                            {currentWeek.dayVotingEnabled && (
                                <p className="text-white/80 text-[11px]">تصويت اليوم مفعّل 🗳️</p>
                            )}
                        </div>
                    }
                />

                {/* Vote tile — span 2 if active */}
                <Tile
                    id="vote"
                    openId={open}
                    onToggle={toggle}
                    gradient="bg-gradient-to-br from-sky-500 to-indigo-600"
                    span={votingActive ? "col-span-2" : ""}
                    front={
                        <div className="h-full flex flex-col justify-between">
                            <Vote className="w-6 h-6" />
                            <div>
                                <p className="text-white/85 text-[10px] font-semibold">التصويت</p>
                                <h3 className="text-base font-bold mt-0.5">
                                    {votingActive
                                        ? voteLeader
                                            ? `${voteLeader} يتصدّر`
                                            : "ابدأ التصويت"
                                        : currentWeek.restaurantVotingMode === "democratic"
                                        ? "ديموقراطي"
                                        : "دكتاتوري 👑"}
                                </h3>
                            </div>
                        </div>
                    }
                    back={
                        <div className="h-full flex flex-col justify-center gap-1.5">
                            {votingActive && candidates.length > 0 ? (
                                <>
                                    <p className="text-[10px] text-white/85 text-center mb-0.5">
                                        {myVote ? `صوّتت لـ ${myVote} — اضغط لتغيير` : "اضغط مطعمك"}
                                    </p>
                                    {candidates.map((c) => {
                                        const count = voteCounts[c] || 0;
                                        const isMine = myVote === c;
                                        return (
                                            <div
                                                key={c}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    castVote(c);
                                                }}
                                                role="button"
                                                className={`rounded-lg px-2 py-1.5 cursor-pointer transition-all ${
                                                    isMine
                                                        ? "bg-white text-indigo-700 font-bold"
                                                        : "bg-white/15 hover:bg-white/25"
                                                } ${busy === "vote" ? "opacity-50 pointer-events-none" : ""}`}
                                            >
                                                <div className="flex justify-between text-[11px] mb-0.5">
                                                    <span className="font-semibold">{c}</span>
                                                    <span>{count}</span>
                                                </div>
                                                <div className={`h-1 ${isMine ? "bg-indigo-200" : "bg-white/25"} rounded-full`}>
                                                    <div
                                                        className={`h-1 ${isMine ? "bg-indigo-700" : "bg-white"} rounded-full transition-all`}
                                                        style={{ width: `${totalVotes ? (count / totalVotes) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : voteEntries.length > 0 ? (
                                voteEntries.map(([name, count]) => (
                                    <div key={name}>
                                        <div className="flex justify-between text-[11px] mb-0.5">
                                            <span className="font-semibold">{name}</span>
                                            <span>{count}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/25 rounded-full">
                                            <div
                                                className="h-1.5 bg-white rounded-full transition-all"
                                                style={{ width: `${totalVotes ? (count / totalVotes) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-white/80 text-sm text-center">لم يبدأ التصويت بعد</p>
                            )}
                        </div>
                    }
                />

                {/* Attendance */}
                <Tile
                    id="attendance"
                    openId={open}
                    onToggle={toggle}
                    gradient="bg-gradient-to-br from-rose-500 to-pink-600"
                    front={
                        <div className="h-full flex flex-col justify-between">
                            <Users className="w-6 h-6" />
                            <div>
                                <p className="text-white/85 text-[10px] font-semibold">الحضور</p>
                                <h3 className="text-base font-bold mt-0.5">
                                    {attendeesCount}/{attendeesCount + absenteesCount || 6}
                                </h3>
                            </div>
                        </div>
                    }
                    back={
                        <div className="h-full flex flex-col justify-center gap-1.5 text-xs">
                            <p className="text-white/95">
                                ✅ {attendeesCount} · ❌ {absenteesCount}
                            </p>
                            {userName && currentWeek.king !== userName && (
                                <div className="flex gap-1.5 mt-1">
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAttendance(false);
                                        }}
                                        className={`flex-1 rounded-lg py-1.5 px-1 flex items-center justify-center gap-1 font-bold cursor-pointer transition-all ${
                                            myAttendance === "present"
                                                ? "bg-white text-emerald-700"
                                                : "bg-white/15 hover:bg-white/25"
                                        } ${busy === "attendance" ? "opacity-50 pointer-events-none" : ""}`}
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        <span className="text-[11px]">حاضر</span>
                                    </div>
                                    <div
                                        role="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAttendance(true);
                                        }}
                                        className={`flex-1 rounded-lg py-1.5 px-1 flex items-center justify-center gap-1 font-bold cursor-pointer transition-all ${
                                            myAttendance === "absent"
                                                ? "bg-white text-rose-700"
                                                : "bg-white/15 hover:bg-white/25"
                                        } ${busy === "attendance" ? "opacity-50 pointer-events-none" : ""}`}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span className="text-[11px]">معذرة</span>
                                    </div>
                                </div>
                            )}
                            {userName && currentWeek.king === userName && (
                                <p className="text-white/85 text-[11px] mt-1">أنت الملك 👑</p>
                            )}
                        </div>
                    }
                />

                {/* Past week summary — wide */}
                {pastWeek && (
                    <Tile
                        id="past"
                        openId={open}
                        onToggle={toggle}
                        gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
                        span="col-span-2"
                        front={
                            <div className="h-full flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Star className="w-6 h-6 text-yellow-200" />
                                    <div className="text-right">
                                        <p className="text-white/85 text-[10px] font-semibold">آخر أسبوع</p>
                                        <h3 className="text-base font-bold mt-0.5">
                                            {pastWeek.king || "—"} · {pastWeek.restaurant || "—"}
                                        </h3>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/70" />
                            </div>
                        }
                        back={
                            <div className="h-full flex flex-col justify-center text-sm gap-1.5">
                                <p className="font-bold">👑 {pastWeek.king || "—"}</p>
                                <p className="flex items-center gap-2 text-xs">
                                    <Calendar className="w-3.5 h-3.5" /> {pastWeek.day || "—"}
                                </p>
                                <p className="flex items-center gap-2 text-xs">
                                    <MapPin className="w-3.5 h-3.5" /> {pastWeek.restaurant || "—"}
                                </p>
                                {pastWeek.activity && (
                                    <p className="text-xs text-white/85">🎯 {pastWeek.activity}</p>
                                )}
                            </div>
                        }
                    />
                )}
            </div>

            {/* Switch to full view */}
            <button
                onClick={onSwitchToFullView}
                className="w-full mt-2 bg-white/10 hover:bg-white/15 backdrop-blur border border-white/25 text-white rounded-2xl py-3 text-sm font-semibold transition-colors"
            >
                افتح العرض الكامل للتفاعل (تصويت، حضور، إلخ)
            </button>
        </div>
    );
}
