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
import { ChevronRight, Search, Loader2, BookOpen, Upload, Languages, ArrowRight, Eye, EyeOff } from "lucide-react";

type MangaSource = "mangadex" | "vortex" | "weeb";
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

const UPLOAD_KEY = "__upload__";

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

// One webtoon page in the continuous vertical scroll. Lazy-loads its own image;
// translation `blocks` are computed by the parent (whole-chapter translate) and
// passed in, so it's purely presentational.
function MangaPageView({ rawUrl, dataUrl, blocks, show }: { rawUrl?: string; dataUrl?: string; blocks?: Block[]; show: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(!!dataUrl);
    const [imgUrl, setImgUrl] = useState<string | null>(dataUrl || null);
    const [wrap, setWrap] = useState({ w: 0, h: 0 });
    const [err, setErr] = useState("");

    // Lazy: only fetch the image once it's about to scroll into view.
    useEffect(() => {
        if (dataUrl) return;
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return; }
        const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "1200px 0px" });
        io.observe(el);
        return () => io.disconnect();
    }, [dataUrl]);

    useEffect(() => {
        if (!near || dataUrl || !rawUrl) return;
        let alive = true; let obj: string | null = null;
        fetchBlobUrl(proxied(rawUrl)).then((u) => {
            if (!alive) { URL.revokeObjectURL(u); return; }
            obj = u; setImgUrl(u);
        }).catch(() => setErr("تعذّر تحميل الصفحة"));
        return () => { alive = false; if (obj) URL.revokeObjectURL(obj); };
    }, [near, rawUrl, dataUrl]);

    // Track the rendered size so overlay font-sizing fits the actual pixels.
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver((e) => setWrap({ w: e[0].contentRect.width, h: e[0].contentRect.height }));
        ro.observe(el);
        return () => ro.disconnect();
    }, [imgUrl]);

    return (
        <div ref={ref} className="relative bg-slate-900 min-h-[280px]">
            {imgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl} alt="صفحة" className="w-full h-auto block select-none" />
            ) : (
                <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            )}

            {show && blocks && blocks.map((b, i) => {
                // Auto-fit font to the box: area-per-character keeps long text from
                // overflowing small bubbles. Also expand the white box a touch so it
                // fully covers the original text underneath (no bleed like "AS").
                const boxW = b.w * wrap.w, boxH = b.h * wrap.h;
                const chars = Math.max(1, b.ar.trim().length);
                const areaFont = Math.sqrt((boxW * boxH * 0.5) / chars);
                const fontPx = Math.max(8, Math.min(26, areaFont, boxH * 0.85));
                const ex = b.w * 0.05, ey = b.h * 0.07;
                const left = Math.max(0, b.x - ex), top = Math.max(0, b.y - ey);
                const width = Math.min(1 - left, b.w + ex * 2), height = Math.min(1 - top, b.h + ey * 2);
                return (
                    <div key={i}
                        className="absolute flex items-center justify-center text-center bg-white text-black rounded-md overflow-hidden"
                        style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: `${width * 100}%`, height: `${height * 100}%`, fontSize: `${fontPx}px`, fontWeight: 700, lineHeight: 1.15, padding: "1px" }}>
                        <span style={{ wordBreak: "break-word" }}>{b.ar}</span>
                    </div>
                );
            })}

            {err && <span className="absolute bottom-2 right-2 z-10 text-[10px] text-amber-200 bg-black/70 px-2 py-1 rounded">{err}</span>}
        </div>
    );
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

    // ── reading (continuous webtoon scroll) ──
    const [pages, setPages] = useState<string[]>([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [uploadImg, setUploadImg] = useState<string | null>(null);
    const [msg, setMsg] = useState("");

    // ── whole-chapter translation (parent-owned; pages just display) ──
    const [translations, setTranslations] = useState<Record<string, Block[]>>({});
    const [translatingAll, setTranslatingAll] = useState(false);
    const [transDone, setTransDone] = useState(0);
    const [showTrans, setShowTrans] = useState(true);

    const translateChapter = async () => {
        if (translatingAll) return;
        const items = uploadImg
            ? [{ key: UPLOAD_KEY, payload: { imageBase64: uploadImg } as any }]
            : pages.map((u) => ({ key: u, payload: { imageUrl: u } as any }));
        if (items.length === 0) return;
        setTranslatingAll(true); setTransDone(0); setShowTrans(true); setMsg("");
        let done = 0, idx = 0;
        const worker = async () => {
            while (idx < items.length) {
                const cur = items[idx++];
                let blocks: Block[] = [];
                try {
                    const res = await fetch("/api/manga/translate", { method: "POST", headers: authHeaders(), body: JSON.stringify(cur.payload) });
                    const json = await res.json();
                    if (res.ok) blocks = json.blocks || [];
                } catch { /* skip failed page */ }
                setTranslations((prev) => ({ ...prev, [cur.key]: blocks }));
                done++; setTransDone(done);
            }
        };
        // Up to 3 pages in flight — fast without hammering the API.
        await Promise.all(Array.from({ length: Math.min(3, items.length) }, worker));
        setTranslatingAll(false);
    };

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
        setLoadingChapters(true); setChapters([]); setPages([]);
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
        setLoadingPages(true); setPages([]); setMsg(""); setTranslations({}); setTransDone(0);
        try {
            const res = await fetch(`/api/manga/pages?source=${manga?.source || "mangadex"}&chapterId=${encodeURIComponent(c.id)}`, { headers: authHeaders() });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "خطأ");
            setPages(json.pages || []);
            if (typeof window !== "undefined") window.scrollTo({ top: 0 });
        } catch (e) { setMsg(e instanceof Error ? e.message : "تعذّر فتح الفصل"); }
        finally { setLoadingPages(false); }
    };

    // ── manual upload fallback ──
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
                setManga(null); setChapters([]); setPages([]); setResults([]);
                setUploadImg(jpeg); setMsg(""); setTranslations({}); setTransDone(0);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };

    const backToLibrary = () => {
        setManga(null); setChapters([]); setPages([]); setUploadImg(null); setMsg("");
        setTranslations({}); setTransDone(0);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;
    }
    if (!user || user.role !== "dean") return null;

    const hasViewer = pages.length > 0 || !!uploadImg;

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
                                        <span className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${m.source === "vortex" ? "bg-fuchsia-600/90" : m.source === "weeb" ? "bg-emerald-600/90" : "bg-indigo-600/90"}`}>{m.kind}</span>
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

                {/* ── Continuous webtoon reader ── */}
                {hasViewer && (
                    <div className="space-y-3">
                        <div className="sticky top-[52px] z-30 -mx-4 px-4 py-2 bg-slate-950/90 backdrop-blur-sm flex items-center justify-between gap-2">
                            <button onClick={pages.length > 0 ? () => { setPages([]); setTranslations({}); } : backToLibrary}
                                className="text-sm text-slate-400 hover:text-white flex items-center gap-1"><ArrowRight className="w-4 h-4" /> {pages.length > 0 ? "الفصول" : "رجوع"}</button>
                            <div className="flex items-center gap-2">
                                {Object.keys(translations).length > 0 && (
                                    <button onClick={() => setShowTrans((v) => !v)} className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 flex items-center gap-1">
                                        {showTrans ? <><EyeOff className="w-3.5 h-3.5" /> الأصل</> : <><Eye className="w-3.5 h-3.5" /> الترجمة</>}
                                    </button>
                                )}
                                <button onClick={translateChapter} disabled={translatingAll} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-full px-4 py-1.5 text-xs font-bold flex items-center gap-1.5">
                                    {translatingAll
                                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> يترجم {transDone}/{uploadImg ? 1 : pages.length}</>
                                        : <><Languages className="w-3.5 h-3.5" /> ترجم الفصل كامل</>}
                                </button>
                            </div>
                        </div>

                        {msg && <p className="text-center text-xs text-amber-400">{msg}</p>}

                        {/* Pages stacked vertically — continuous scroll (webtoon style) */}
                        <div className="rounded-xl overflow-hidden bg-black mx-auto max-w-2xl">
                            {uploadImg ? (
                                <MangaPageView dataUrl={uploadImg} blocks={translations[UPLOAD_KEY]} show={showTrans} />
                            ) : (
                                pages.map((url) => <MangaPageView key={url} rawUrl={url} blocks={translations[url]} show={showTrans} />)
                            )}
                        </div>

                        {pages.length > 0 && (
                            <div className="flex items-center justify-center gap-3 pt-1">
                                <span className="text-xs text-slate-500">✦ نهاية الفصل ({pages.length} صفحة) ✦</span>
                            </div>
                        )}
                        <p className="text-[10px] text-slate-600 text-center">🔒 المصدر: MangaDex / VortexScans · ترجمة AI تقريبية · للاستخدام الخاص</p>
                    </div>
                )}

                {loadingPages && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>}
            </div>
        </main>
    );
}
