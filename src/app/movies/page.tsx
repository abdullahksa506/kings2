"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "وش نشاهد الخميس؟"
 * قال: "أي شي... بس المهم ما يطلع نصكم نايم بالنص زي اجتماعات الشغل 😂😴"
 *
 * ⚠️ صفحة معزولة — للعميد فقط. حذف الميزة = حذف src/app/movies + src/app/api/movies + رابط العميد.
 * البيانات من OMDb (بيانات IMDb). لا يوجد أي تحميل/بث تورنت.
 */

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Search, Loader2, Film, Star, X, Youtube, ExternalLink } from "lucide-react";

interface MovieResult { id: string; title: string; year: string; poster: string | null; }
interface MovieDetails {
    id: string; title: string | null; year: string | null; rated: string | null; runtime: string | null;
    genre: string | null; director: string | null; actors: string | null; plot: string | null;
    poster: string | null; imdbRating: string | null; imdbVotes: string | null; language: string | null; country: string | null;
}

function authHeaders(): Record<string, string> {
    const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
    return { "Content-Type": "application/json", "x-user-name": encodeURIComponent(name), "x-user-token": token };
}

export default function MoviesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "dean")) router.replace("/");
    }, [loading, user, router]);

    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<MovieResult[]>([]);
    const [err, setErr] = useState("");

    const [detail, setDetail] = useState<MovieDetails | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const runSearch = async () => {
        const q = query.trim();
        if (!q) return;
        setSearching(true); setErr(""); setResults([]);
        try {
            const res = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            setResults(json.results || []);
            if ((json.results || []).length === 0) setErr("ما لقينا نتائج");
        } catch (e) { setErr(e instanceof Error ? e.message : "فشل البحث"); }
        finally { setSearching(false); }
    };

    const openDetail = async (id: string) => {
        setLoadingDetail(true); setDetail(null);
        try {
            const res = await fetch(`/api/movies/details?id=${encodeURIComponent(id)}`, { headers: authHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            setDetail(json.movie);
        } catch (e) { setErr(e instanceof Error ? e.message : "تعذّر جلب التفاصيل"); }
        finally { setLoadingDetail(false); }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>;
    }
    if (!user || user.role !== "dean") return null;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
            <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 pt-safe">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 active:scale-90 transition" aria-label="رجوع">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <Film className="w-5 h-5 text-amber-400" />
                    <h1 className="text-base font-bold">أفلام ليلة الخميس <span className="text-[10px] text-amber-300/70 font-normal">· العميد فقط · بيانات IMDb</span></h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && runSearch()}
                            placeholder="اكتب اسم الفيلم (إنجليزي)..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl pr-10 pl-4 py-3 text-sm focus:border-amber-500 outline-none"
                        />
                    </div>
                    <button onClick={runSearch} disabled={searching} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 rounded-2xl px-5 font-bold text-sm flex items-center gap-2">
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} بحث
                    </button>
                </div>

                {err && <p className="text-center text-sm text-rose-400">{err}</p>}

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {results.map((m) => (
                        <button key={m.id} onClick={() => openDetail(m.id)} className="group text-right">
                            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-slate-800 group-hover:border-amber-500 transition bg-slate-800 flex items-center justify-center">
                                {m.poster
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={m.poster} alt={m.title} className="w-full h-full object-cover" />
                                    : <Film className="w-7 h-7 text-slate-600" />}
                            </div>
                            <p className="text-[11px] mt-1 line-clamp-2 text-slate-300">{m.title} <span className="text-slate-500">({m.year})</span></p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Details modal */}
            {(loadingDetail || detail) && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-3 bg-slate-950/90 backdrop-blur-md overflow-y-auto" onClick={() => setDetail(null)}>
                    <div className="w-full max-w-lg my-4 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {loadingDetail || !detail ? (
                            <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
                        ) : (
                            <>
                                <div className="relative">
                                    <div className="flex gap-4 p-4">
                                        <div className="w-28 shrink-0 aspect-[2/3] rounded-xl overflow-hidden bg-slate-800">
                                            {detail.poster
                                                // eslint-disable-next-line @next/next/no-img-element
                                                ? <img src={detail.poster} alt={detail.title || ""} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-slate-600" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="font-bold text-lg text-white leading-tight">{detail.title} <span className="text-slate-400 font-normal">({detail.year})</span></h2>
                                            {detail.imdbRating && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                                    <span className="text-amber-300 font-bold">{detail.imdbRating}</span>
                                                    <span className="text-[11px] text-slate-500">IMDb {detail.imdbVotes ? `· ${detail.imdbVotes} صوت` : ""}</span>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
                                                {detail.rated && <span className="bg-slate-800 rounded px-1.5 py-0.5 text-slate-300">{detail.rated}</span>}
                                                {detail.runtime && <span className="bg-slate-800 rounded px-1.5 py-0.5 text-slate-300">{detail.runtime}</span>}
                                                {detail.genre && detail.genre.split(",").slice(0, 3).map((g) => <span key={g} className="bg-amber-500/15 text-amber-300 rounded px-1.5 py-0.5">{g.trim()}</span>)}
                                            </div>
                                        </div>
                                        <button onClick={() => setDetail(null)} className="absolute top-3 left-3 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="px-4 pb-4 space-y-3">
                                    {detail.plot && <p className="text-sm text-slate-300 leading-relaxed">{detail.plot}</p>}
                                    <div className="text-xs text-slate-400 space-y-1">
                                        {detail.director && <p><span className="text-slate-500">إخراج:</span> {detail.director}</p>}
                                        {detail.actors && <p><span className="text-slate-500">تمثيل:</span> {detail.actors}</p>}
                                        {detail.language && <p><span className="text-slate-500">اللغة:</span> {detail.language}</p>}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${detail.title} ${detail.year} trailer`)}`} target="_blank" rel="noreferrer"
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl py-2.5 text-sm font-bold">
                                            <Youtube className="w-4 h-4" /> التريلر
                                        </a>
                                        <a href={`https://www.imdb.com/title/${detail.id}/`} target="_blank" rel="noreferrer"
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl py-2.5 text-sm font-bold">
                                            <ExternalLink className="w-4 h-4" /> IMDb
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
