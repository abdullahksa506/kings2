"use client";

import { useState, useEffect } from "react";
import { services, BathroomRating } from "@/lib/services";
import { Bath } from "lucide-react";

export default function BathroomRatingsDisplay({ weekId, restaurantName }: { weekId?: string, restaurantName?: string }) {
    const [bathroomRatings, setBathroomRatings] = useState<BathroomRating[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (weekId && weekId.length > 0) {
                    const fetchedBathroomRatings = await services.getBathroomRatingsForWeek(weekId);
                    setBathroomRatings(fetchedBathroomRatings);
                } else {
                    setBathroomRatings([]);
                }
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchData();
    }, [weekId]);

    if (loading || !weekId) return null;

    if (bathroomRatings.length === 0) return null; // Only show section if there are actually ratings

    const average = bathroomRatings.reduce((acc, curr) => acc + curr.score, 0) / bathroomRatings.length;

    return (
        <div className="bg-slate-900/50 border border-sky-900/30 rounded-2xl p-6 mt-6">
            <h3 className="text-lg font-bold text-sky-400 mb-2 flex items-center gap-2">
                <Bath className="w-5 h-5" />
                تقييمات حمامات هشام (علنية)
            </h3>
            {restaurantName && (
                <p className="text-slate-300 font-medium mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                    <span>مطعم: <span className="text-sky-300 font-bold">{restaurantName}</span></span>
                    <span className="text-sm bg-sky-900/30 text-sky-400 px-3 py-1 rounded-full border border-sky-800/50">
                        متوسط التقييم: {average.toFixed(1)} / 5
                    </span>
                </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bathroomRatings.map(r => (
                    <div key={r.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-sky-800/30">
                        <span className="text-slate-300 font-medium">{r.userName}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sky-500/50 text-xs">قيم/ت:</span>
                            <span className="text-2xl drop-shadow-md">
                                {["🤢", "😕", "😐", "🙂", "✨"][r.score - 1]}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
