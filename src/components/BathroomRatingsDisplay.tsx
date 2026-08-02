"use client";

import { useState, useEffect } from "react";
import { services, BathroomRating, WeekSession } from "@/lib/services";
import { useAuth } from "@/context/AuthContext";
import { Bath } from "lucide-react";

// Hisham's review for one bathroom — read-only for everyone, editable for Hisham.
function ReviewSection({ label, review, isHisham }: { label: string; review?: string; isHisham: boolean }) {
    const [draft, setDraft] = useState(review || "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    useEffect(() => { setDraft(review || ""); }, [review]);
    if (!isHisham && !review) return null;

    const save = async () => {
        setSaving(true);
        try { await services.submitBathroomReview(label, draft.trim()); setSaved(true); setTimeout(() => setSaved(false), 2000); }
        catch { /* ignore */ } finally { setSaving(false); }
    };

    return (
        <div className="mt-3 pt-3 border-t border-slate-800">
            {review && !isHisham && (
                <p className="text-sm text-sky-100/90 leading-relaxed whitespace-pre-wrap">
                    <span className="text-sky-400 font-bold">📝 ريفيو هشام: </span>{review}
                </p>
            )}
            {isHisham && (
                <div className="space-y-2">
                    <p className="text-[11px] font-bold text-sky-400">📝 ريفيو هشام (يظهر للجميع)</p>
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} dir="rtl"
                        placeholder="اكتب ريفيوك عن هذا الحمام..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500" />
                    <button onClick={save} disabled={saving || draft.trim() === (review || "").trim()}
                        className="text-xs bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-lg px-3 py-1.5">
                        {saving ? "يحفظ..." : saved ? "تم الحفظ ✓" : "حفظ الريفيو"}
                    </button>
                </div>
            )}
        </div>
    );
}

export default function BathroomRatingsDisplay() {
    const { user } = useAuth();
    const isHisham = user?.name === "هشام";
    const [bathroomRatings, setBathroomRatings] = useState<BathroomRating[]>([]);
    const [weeks, setWeeks] = useState<Map<string, WeekSession>>(new Map());
    const [reviews, setReviews] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [allRatings, reviewList] = await Promise.all([
                    services.getAllBathroomRatings(),
                    services.getBathroomReviews().catch(() => []),
                ]);
                setBathroomRatings(allRatings);
                const rmap: Record<string, string> = {};
                reviewList.forEach((rv) => { if (rv?.label) rmap[rv.label.trim()] = rv.review || ""; });
                setReviews(rmap);

                // Fetch week data for restaurant names
                const weekIds = [...new Set(allRatings.map(r => r.weekId))];
                const weeksMap = new Map<string, WeekSession>();
                for (const wid of weekIds) {
                    try {
                        const { getDoc, doc } = await import("firebase/firestore");
                        const { db } = await import("@/lib/firebase");
                        const weekSnap = await getDoc(doc(db, "weeks", wid));
                        if (weekSnap.exists()) {
                            weeksMap.set(wid, { id: weekSnap.id, ...weekSnap.data() } as WeekSession);
                        }
                    } catch {}
                }
                setWeeks(weeksMap);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
    );

    if (bathroomRatings.length === 0) return (
        <div className="text-center p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-slate-500">لا توجد تقييمات حمامات بعد</p>
        </div>
    );

    const resolveBathroomLabel = (rating: BathroomRating): string => {
        const fromRating = typeof rating.bathroomName === "string" ? rating.bathroomName.trim() : "";
        if (fromRating) return fromRating;

        const fromRestaurant = typeof rating.restaurantName === "string" ? rating.restaurantName.trim() : "";
        if (fromRestaurant) return `حمام ${fromRestaurant}`;

        const weekRestaurant = weeks.get(rating.weekId)?.restaurant?.trim() || "";
        if (weekRestaurant) return `حمام ${weekRestaurant}`;

        return "حمام غير محدد";
    };

    type BathroomGroup = {
        key: string;
        weekId: string;
        label: string;
        ratings: BathroomRating[];
        latestAt: number;
    };

    // Group ratings by (week + bathroom label) so custom bathroom names appear separately.
    const grouped = new Map<string, BathroomGroup>();
    for (const r of bathroomRatings) {
        const label = resolveBathroomLabel(r);
        const key = `${r.weekId}::${label}`;
        const createdAtMs = r.createdAt?.toMillis?.() ?? 0;
        if (!grouped.has(key)) {
            grouped.set(key, { key, weekId: r.weekId, label, ratings: [], latestAt: createdAtMs });
        }

        const group = grouped.get(key)!;
        group.ratings.push(r);
        if (createdAtMs > group.latestAt) group.latestAt = createdAtMs;
    }

    const sortedGroups = [...grouped.values()].sort((a, b) => b.latestAt - a.latestAt);

    const EMOJIS = ["🤢", "😕", "😐", "🙂", "✨"];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-sky-400 flex items-center gap-2">
                <Bath className="w-5 h-5" />
                جميع تقييمات حمامات هشام
            </h3>
            {sortedGroups.map((group) => {
                const week = weeks.get(group.weekId);
                const average = group.ratings.reduce((acc, r) => acc + r.score, 0) / group.ratings.length;

                return (
                    <div key={group.key} className="bg-slate-900/50 border border-sky-900/30 rounded-2xl p-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                            <span className="text-slate-300 font-medium">
                                <span className="text-sky-300 font-bold">{group.label}</span>
                                {week?.restaurant && (
                                    <span className="text-xs text-slate-500 mr-2">({week.restaurant})</span>
                                )}
                            </span>
                            <span className="text-sm bg-sky-900/30 text-sky-400 px-3 py-1 rounded-full border border-sky-800/50">
                                متوسط: {average.toFixed(1)} / 5
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.ratings.map(r => (
                                <div key={r.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-sky-800/30">
                                    <span className="text-slate-300 font-medium">{r.userName}</span>
                                    <span className="text-2xl drop-shadow-md">
                                        {EMOJIS[r.score - 1]}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <ReviewSection label={group.label} review={reviews[group.label.trim()]} isHisham={isHisham} />
                    </div>
                );
            })}
        </div>
    );
}
