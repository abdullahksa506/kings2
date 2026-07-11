"use client";

import { useEffect, useMemo, useState } from "react";
import { ListFilter, Search, Star } from "lucide-react";
import { PublicUserProfile, RatingExplorerWeek, services, VALID_NAMES } from "@/lib/services";
import { outingDateLabel } from "@/lib/outingDate";

type SortType = "newest" | "oldest" | "highest" | "lowest";

export default function RatingsExplorer() {
    const [data, setData] = useState<RatingExplorerWeek[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortType>("newest");
    const [selectedKing, setSelectedKing] = useState("all");
    const [selectedRater, setSelectedRater] = useState("all");
    const [minScore, setMinScore] = useState("all");
    const [searchText, setSearchText] = useState("");
    const [publicProfilesMap, setPublicProfilesMap] = useState<Record<string, PublicUserProfile>>({});

    useEffect(() => {
        const run = async () => {
            setLoading(true);
            const rows = await services.getRatingsExplorerData();
            setData(rows);
            setLoading(false);
        };
        run();
    }, []);

    useEffect(() => {
        const unsub = services.listenToPublicUserProfiles((profiles) => {
            const nextMap: Record<string, PublicUserProfile> = {};
            profiles.forEach((p) => {
                nextMap[p.userName] = p;
            });
            setPublicProfilesMap(nextMap);
        });
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        const normalizedSearch = searchText.trim().toLowerCase();
        const rows = data.filter(row => {
            if (selectedKing !== "all" && (row.week.king || "عشوائي") !== selectedKing) return false;
            if (selectedRater !== "all" && !row.ratings.some(r => r.userName === selectedRater)) return false;
            if (minScore !== "all" && row.averageScore < Number(minScore)) return false;
            if (normalizedSearch.length > 0) {
                const hay = `${row.week.restaurant || ""} ${row.week.activity || ""}`.toLowerCase();
                if (!hay.includes(normalizedSearch)) return false;
            }
            return true;
        });

        rows.sort((a, b) => {
            const ta = a.week.createdAt.toMillis();
            const tb = b.week.createdAt.toMillis();
            if (sortBy === "newest") return tb - ta;
            if (sortBy === "oldest") return ta - tb;
            if (sortBy === "highest") return b.averageScore - a.averageScore;
            return a.averageScore - b.averageScore;
        });
        return rows;
    }, [data, selectedKing, selectedRater, minScore, searchText, sortBy]);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl">
            <h3 className="font-semibold text-lg text-slate-200 flex items-center gap-2 mb-4">
                <ListFilter className="w-5 h-5 text-cyan-400" />
                فلترة متقدمة للتقييمات
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortType)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
                    <option value="newest">الأحدث</option>
                    <option value="oldest">الأقدم</option>
                    <option value="highest">الأعلى تقييماً</option>
                    <option value="lowest">الأقل تقييماً</option>
                </select>
                <select value={selectedKing} onChange={e => setSelectedKing(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
                    <option value="all">كل الملوك</option>
                    <option value="عشوائي">أسابيع عشوائية</option>
                    {VALID_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <select value={selectedRater} onChange={e => setSelectedRater(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
                    <option value="all">كل المقيمين</option>
                    {VALID_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <select value={minScore} onChange={e => setMinScore(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200">
                    <option value="all">أي تقييم</option>
                    <option value="4">4.0+ ⭐</option>
                    <option value="3">3.0+ ⭐</option>
                    <option value="2">2.0+ ⭐</option>
                </select>
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="بحث مطعم/نشاط" className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200" />
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-slate-500 py-6 text-center">جاري تحميل البيانات...</p>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">لا توجد نتائج مطابقة للفلاتر.</p>
            ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {filtered.map((row) => (
                        <div key={row.week.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                            {(() => {
                                const kingName = row.week.king || "عشوائي";
                                const kingProfile = row.week.king ? publicProfilesMap[row.week.king] : null;
                                const kingDisplayName = kingProfile?.nickName?.trim() || kingName;
                                const kingAvatar = kingProfile?.profileImage || null;
                                const kingInitial = kingDisplayName.charAt(0) || "؟";

                                return (
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-white font-semibold text-sm">{row.week.restaurant || "غير محدد"}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                                            {row.week.day || "يوم غير محدد"}
                                        </span>
                                        <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                            <span>- الملك:</span>
                                            <span className="w-5 h-5 rounded-full overflow-hidden border border-white/20 bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-200 shrink-0">
                                                {kingAvatar ? (
                                                    <img src={kingAvatar} alt={kingDisplayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{kingInitial}</span>
                                                )}
                                            </span>
                                            <span>{kingDisplayName}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="text-amber-400 text-sm font-bold flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                                    {row.averageScore > 0 ? row.averageScore.toFixed(1) : "—"}
                                </div>
                            </div>
                                );
                            })()}
                            <p className="text-[11px] text-slate-500 mt-2">
                                تاريخ الطلعة: {outingDateLabel(row.week)}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

