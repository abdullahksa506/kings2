"use client";

import { useState, useEffect } from "react";
import { services, BathroomRating, WeekSession } from "@/lib/services";
import { Bath } from "lucide-react";

export default function BathroomRatingsDisplay() {
    const [bathroomRatings, setBathroomRatings] = useState<BathroomRating[]>([]);
    const [weeks, setWeeks] = useState<Map<string, WeekSession>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const allRatings = await services.getAllBathroomRatings();
                setBathroomRatings(allRatings);

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
            <p className="text-slate-500">ما في تقييمات حماماات للحين؟؟ 🚽📭 أحس 🤷✨</p>
        </div>
    );

    const resolveBathroomLabel = (rating: BathroomRating): string => {
        const fromRating = typeof rating.bathroomName === "string" ? rating.bathroomName.trim() : "";
        if (fromRating) return fromRating;

        const fromRestaurant = typeof rating.restaurantName === "string" ? rating.restaurantName.trim() : "";
        if (fromRestaurant) return `حمام ${fromRestaurant}`;

        const weekRestaurant = weeks.get(rating.weekId)?.restaurant?.trim() || "";
        if (weekRestaurant) return `حمام ${weekRestaurant}`;

        return "حمام غير محدد؟؟ 🚽🤷";
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
                جمييع تقييمات حماماات هشام؟؟ 🚽👑✨ والله شوف
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
                                متوسط؟؟: {average.toFixed(1)} / 5 ⭐✨
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
                    </div>
                );
            })}
        </div>
    );
}
