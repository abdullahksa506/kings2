"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تحب المانجا؟"
 * قال: "لأني أقرأ ٢٠٠ صفحة بثانية... بس لسا ما فهمت ليش الجميع يصيح على نفس المشهد 😂📖"
 *
 * ⚠️ صفحة معزولة بالكامل — للعميد فقط. حذف الميزة = حذف src/app/manga + src/app/api/manga + رابط العميد.
 */

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Search, Loader2, BookOpen, Upload, Languages, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";

type MangaSource = "mangadex" | "vortex";
interface MangaResult { id: string; source: MangaSource; title: string; year: number | null; coverUrl: string | null; availableLangs: string[]; kind?: string; }
interface Chapter { id: string; chapter: string | null; title: string; pages: number; }
interface Block { ar: string; x: number; y: number; w: number; h: number; }

const LANGS = [
    { code: "en", label: "إنجليزي" },
    { code: "ja", label: "ياباني" },
    { code: "ar", label: "عربي (جاهز)" },
];

function authHeaders(): Record<string, string> {
    const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
    return { "Content-Type": "application/json", "x-user-name": encodeURIComponent(name), "x-user-token": token };
}

// Fetch a dean-protected proxied image with auth headers → object URL.
async function fetchBlobUrl(proxyUrl: string): Promise<string> {
    const res = await fetch(proxyUrl, { headers: authHeaders() });
    if (!res.ok) throw new Error("img");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

function proxied(src: string): string {
    return `/api/manga/image?src=${encodeURIComponent(src)}`;
}

// Small auth-aware image (used for cover thumbnails).
function AuthImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        let obj: string | null = null;
        let alive = true;
        fetchBlobUrl(src).then((u) => { if (alive) { obj = u; setUrl(u); } }).catch(() => {});
        return () => { alive = false; if (obj) URL.revokeObjectURL(obj); };
    }, [src]);
    if (!url) return <div className={`bg-slate-800 animate-pulse ${className || ""}`} />;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={className} />;
}

export default function MangaPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // ── gate: dean only ──
    useEffect(() => {
        if (!loading && (!user || user.role !== "dean")) router.replace("/");
    }, [loading, user, router]);

    // ── search ──
    const [query, setQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<MangaResult[]>([]);
    const [searchErr, setSearchErr] = useState("");

    // ── selection ──
    const [manga, setManga] = useState<MangaResult | null>(null);
    const [lang, setLang] = useState("en");
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loadingChapters, setLoadingChapters] = useState(false);

    // ── reading ──
    const [pages, setPages] = useState<string[]>([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [pageIdx, setPageIdx] = useState(0);
    const [displayUrl, setDisplayUrl] = useState<string | null>(null);
    const [translating, setTranslating] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [msg, setMsg] = useState("");

    // caches (avoid refetch / re-translate cost)
    const blobCache = useRef<Map<string, string>>(new Map());
    const transCache = useRef<Map<string, Block[]>>(new Map());
    const [blocks, setBlocks] = useState<Block[]>([]);

    // measure rendered image for font sizing
    const imgWrapRef = useRef<HTMLDivElement>(null);
    const [wrapH, setWrapH] = useState(0);
    useEffect(() => {
        const el = imgWrapRef.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver((entries) => setWrapH(entries[0].contentRect.height));
        ro.observe(el);
        return () => ro.disconnect();
    }, [displayUrl]);

    const runSearch = async () => {
        const q = query.trim();
        if (!q) return;
        setSearching(true); setSearchErr(""); setResults([]);
        try {
            const res = await fetch(`/api/manga/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            setResults(json.results || []);
            if ((json.results || []).length === 0) setSearchErr("ما لقينا نتائج");
        } catch (e) { setSearchErr(e instanceof Error ? e.message : "فشل البحث"); }
        finally { setSearching(false); }
    };

    const loadChapters = useCallback(async (m: MangaResult, l: string) => {
        setLoadingChapters(true); setChapters([]); setPages([]); setDisplayUrl(null); setBlocks([]);
        try {
            const res = await fetch(`/api/manga/chapters?source=${m.source}&mangaId=${encodeURIComponent(m.id)}&lang=${l}`, { headers: authHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            setChapters(json.chapters || []);
        } catch { setChapters([]); }
        finally { setLoadingChapters(false); }
    }, []);

    const openManga = (m: MangaResult) => {
        setManga(m);
        // MangaDex has per-language chapters; Vortex is pre-translated (lang ignored).
        const preferred = m.source === "vortex"
            ? "en"
            : (m.availableLangs.includes("en") ? "en" : (m.availableLangs.includes("ar") ? "ar" : (m.availableLangs[0] || "en")));
        setLang(preferred);
        loadChapters(m, preferred);
    };

    const openChapter = async (c: Chapter) => {
        setLoadingPages(true); setPages([]); setPageIdx(0); setDisplayUrl(null); setBlocks([]); setMsg("");
        blobCache.current.clear(); transCache.current.clear();
        try {
            const res = await fetch(`/api/manga/pages?source=${manga?.source || "mangadex"}&chapterId=${encodeURIComponent(c.id)}`, { headers: authHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            setPages(json.pages || []);
            setPageIdx(0);
        } catch (e) { setMsg(e instanceof Error ? e.message : "تعذّر فتح الفصل"); }
        finally { setLoadingPages(false); }
    };

    // load the current page image (blob) whenever pageIdx/pages change
    useEffect(() => {
        if (pages.length === 0) return;
        const src = pages[pageIdx];
        if (!src) return;
        setBlocks(transCache.current.get(src) || []);
        const cached = blobCache.current.get(src);
        if (cached) { setDisplayUrl(cached); return; }
        let alive = true;
        setDisplayUrl(null);
        fetchBlobUrl(proxied(src)).then((u) => {
            if (!alive) { URL.revokeObjectURL(u); return; }
            blobCache.current.set(src, u);
            setDisplayUrl(u);
        }).catch(() => setMsg("تعذّر تحميل الصفحة"));
        return () => { alive = false; };
    }, [pages, pageIdx]);

    const translateCurrent = async () => {
        if (translating) return;
        setTranslating(true); setMsg("");
        try {
            let payload: any;
            if (pages.length > 0) payload = { imageUrl: pages[pageIdx] };
            else if (uploadDataRef.current) payload = { imageBase64: uploadDataRef.current };
            else return;
            const res = await fetch(`/api/manga/translate`, { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            const b: Block[] = json.blocks || [];
            setBlocks(b);
            setShowOverlay(true);
            if (pages.length > 0) transCache.current.set(pages[pageIdx], b);
            if (b.length === 0) setMsg("ما لقيت نص في هالصفحة");
        } catch (e) { setMsg(e instanceof Error ? e.message : "فشلت الترجمة"); }
        finally { setTranslating(false); }
    };

    // ── manual upload fallback ──
    const uploadDataRef = useRef<string | null>(null);
    const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result || "");
            // downscale large images to keep the Gemini payload sane
            const img = new Image();
            img.onload = () => {
                const maxW = 1400;
                const scale = img.width > maxW ? maxW / img.width : 1;
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const jpeg = canvas.toDataURL("image/jpeg", 0.9);
                uploadDataRef.current = jpeg;
                setManga(null); setChapters([]); setPages([]); setResults([]);
                setBlocks([]); setDisplayUrl(jpeg); setPageIdx(0); setMsg("");
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const backToLibrary = () => {
        setManga(null); setChapters([]); setPages([]); setDisplayUrl(null); setBlocks([]);
        uploadDataRef.current = null; setMsg("");
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;
    }
    if (!user || user.role !== "dean") return null;

    // Stay in the reader while inside a chapter (pages loaded) OR an uploaded image.
    // Previously this was `!!displayUrl` alone, so the split-second a new page's
    // image was loading (displayUrl briefly null) the whole viewer unmounted and
    // kicked the user back to the chapter list — making paging feel broken.
    const hasViewer = pages.length > 0 || !!displayUrl;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
            <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 pt-safe">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 active:scale-90 transition" aria-label="رجوع">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <h1 className="text-base font-bold">قارئ المانجا المترجم <span className="text-[10px] text-indigo-300/70 font-normal">· تجريبي · العميد فقط</span></h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
                {/* ── Search + upload (hidden while reading a page) ── */}
                {!hasViewer && (
                    <>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                                    placeholder="اكتب اسم المانجا (إنجليزي أفضل)..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pr-10 pl-4 py-3 text-sm focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <button onClick={runSearch} disabled={searching} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-2xl px-5 font-bold text-sm flex items-center gap-2">
                                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} بحث
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="h-px bg-slate-800 flex-1" /> أو <div className="h-px bg-slate-800 flex-1" />
                        </div>
                        <label className="flex items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl py-3 text-sm text-slate-300 cursor-pointer transition">
                            <Upload className="w-4 h-4" /> ارفع صورة صفحة من جهازك
                            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                        </label>
                        {searchErr && <p className="text-center text-sm text-rose-400">{searchErr}</p>}
                    </>
                )}

                {/* ── Search results ── */}
                {!manga && !hasViewer && results.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {results.map((m) => (
                            <button key={`${m.source}-${m.id}`} onClick={() => openManga(m)} className="group text-right">
                                <div className="aspect-[3/4] rounded-xl overflow-hidden border border-slate-800 group-hover:border-indigo-500 transition relative">
                                    {m.coverUrl ? <AuthImg src={proxied(m.coverUrl)} alt={m.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center"><BookOpen className="w-6 h-6 text-slate-600" /></div>}
                                    {m.kind && (
                                        <span className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${m.source === "vortex" ? "bg-fuchsia-600/90 text-white" : "bg-indigo-600/90 text-white"}`}>{m.kind}</span>
                                    )}
                                </div>
                                <p className="text-[11px] mt-1 line-clamp-2 text-slate-300">{m.title}{m.year ? ` (${m.year})` : ""}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Chapter list ── */}
                {manga && !hasViewer && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <button onClick={backToLibrary} className="text-sm text-slate-400 hover:text-white flex items-center gap-1"><ArrowRight className="w-4 h-4" /> رجوع للبحث</button>
                            <h2 className="font-bold text-sm truncate">{manga.title}</h2>
                        </div>

                        {manga.source === "mangadex" && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <Languages className="w-4 h-4 text-slate-500" />
                                {LANGS.map((l) => (
                                    <button key={l.code} onClick={() => { setLang(l.code); loadChapters(manga, l.code); }}
                                        className={`text-xs px-3 py-1.5 rounded-full border ${lang === l.code ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {loadingChapters ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        ) : chapters.length === 0 ? (
                            <p className="text-center text-sm text-slate-500 py-6">ما فيه فصول متاحة — جرّب عنوان ثاني{manga.source === "mangadex" ? " أو لغة ثانية" : ""}.</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                                {chapters.map((c) => (
                                    <button key={c.id} onClick={() => openChapter(c)} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500 rounded-xl px-3 py-2.5 text-right transition">
                                        <p className="text-sm font-bold">فصل {c.chapter || "؟"}</p>
                                        <p className="text-[10px] text-slate-500 truncate">{c.title || `${c.pages} صفحة`}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Page viewer + overlay ── */}
                {hasViewer && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <button onClick={pages.length > 0 ? () => { setPages([]); setDisplayUrl(null); setBlocks([]); } : backToLibrary}
                                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"><ArrowRight className="w-4 h-4" /> {pages.length > 0 ? "الفصول" : "رجوع"}</button>
                            <div className="flex items-center gap-2">
                                {blocks.length > 0 && (
                                    <button onClick={() => setShowOverlay((v) => !v)} className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 flex items-center gap-1">
                                        {showOverlay ? <><EyeOff className="w-3.5 h-3.5" /> الأصل</> : <><Eye className="w-3.5 h-3.5" /> الترجمة</>}
                                    </button>
                                )}
                                <button onClick={translateCurrent} disabled={translating} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-1.5">
                                    {translating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> يترجم...</> : <><Languages className="w-3.5 h-3.5" /> ترجم الصفحة</>}
                                </button>
                            </div>
                        </div>

                        {msg && <p className="text-center text-xs text-amber-400">{msg}</p>}

                        {/* image + absolute overlay boxes */}
                        <div ref={imgWrapRef} className="relative mx-auto bg-slate-900 rounded-xl overflow-hidden max-w-2xl min-h-[200px]">
                            {displayUrl ? (
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={displayUrl} alt="صفحة" className="w-full h-auto block select-none" />
                                    {showOverlay && blocks.map((b, i) => {
                                        const fontPx = Math.max(9, Math.min(30, b.h * wrapH * 0.42));
                                        return (
                                            <div key={i}
                                                className="absolute flex items-center justify-center text-center bg-white text-black rounded-[3px] leading-tight overflow-hidden px-0.5"
                                                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, fontSize: `${fontPx}px`, fontWeight: 700 }}>
                                                <span style={{ wordBreak: "break-word" }}>{b.ar}</span>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="flex items-center justify-center py-24">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                </div>
                            )}
                        </div>

                        {/* page navigation (manga mode) */}
                        {pages.length > 0 && (
                            <div className="flex items-center justify-between gap-3">
                                <button disabled={pageIdx === 0} onClick={() => setPageIdx((i) => Math.max(0, i - 1))} className="flex items-center gap-1 text-sm bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 disabled:opacity-40"><ArrowRight className="w-4 h-4" /> السابقة</button>
                                <span className="text-xs text-slate-400">{pageIdx + 1} / {pages.length}</span>
                                <button disabled={pageIdx >= pages.length - 1} onClick={() => setPageIdx((i) => Math.min(pages.length - 1, i + 1))} className="flex items-center gap-1 text-sm bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 disabled:opacity-40">التالية <ArrowLeft className="w-4 h-4" /></button>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-600 text-center">🔒 المصدر: MangaDex · الترجمة عبر الذكاء الاصطناعي (تقريبية) · للاستخدام الخاص</p>
                    </div>
                )}

                {loadingPages && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>}
            </div>
        </main>
    );
}
