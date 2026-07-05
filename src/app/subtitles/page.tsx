"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تترجم الترجمة سطر سطر؟"
 * قال: "عشان ما يصير مثل ترجمات زمان: البطل يقول I love you والترجمة 'اهرب! 😂🎬'"
 *
 * ⚠️ صفحة معزولة — للعميد فقط. حذفها = حذف src/app/subtitles + src/app/api/subtitles + رابط العميد.
 */

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2, Captions, Upload, Download, CheckCircle2 } from "lucide-react";

interface Cue { index: number; time: string; text: string }

function authHeaders(): Record<string, string> {
    const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
    return { "Content-Type": "application/json", "x-user-name": encodeURIComponent(name), "x-user-token": token };
}

// Parse an .srt file into cues (index · time · text).
function parseSRT(raw: string): Cue[] {
    const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/);
    const cues: Cue[] = [];
    let idx = 1;
    for (const b of blocks) {
        const lines = b.split("\n").filter((l) => l.length > 0);
        const t = lines.findIndex((l) => l.includes("-->"));
        if (t === -1) continue;
        const time = lines[t].trim();
        const text = lines.slice(t + 1).join("\n").trim();
        cues.push({ index: idx++, time, text });
    }
    return cues;
}

function buildSRT(cues: Cue[], translated: string[]): string {
    return cues
        .map((c, i) => `${c.index}\n${c.time}\n${translated[i] ?? c.text}`)
        .join("\n\n") + "\n";
}

const BATCH = 45;

export default function SubtitlesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== "dean")) router.replace("/");
    }, [loading, user, router]);

    const [fileName, setFileName] = useState("");
    const [cues, setCues] = useState<Cue[]>([]);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(0);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [err, setErr] = useState("");

    // Validate by CONTENT, not extension — iOS often can't select ".srt" when the
    // input is restricted to that type, so we accept any file and check inside.
    const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setErr(""); setResultUrl(null); setDone(0); setCues([]);
        const reader = new FileReader();
        reader.onload = () => {
            const raw = String(reader.result || "");
            const parsed = parseSRT(raw);
            if (parsed.length === 0) {
                setErr("ما قدرنا نقرأ ملف ترجمة صحيح — تأكد إنه ملف .srt (فيه توقيتات -->).");
                setFileName("");
                return;
            }
            setCues(parsed);
            setFileName(file.name || "subtitle.srt");
        };
        reader.onerror = () => setErr("تعذّرت قراءة الملف");
        reader.readAsText(file, "utf-8");
    };

    const translate = async () => {
        if (busy || cues.length === 0) return;
        setBusy(true); setErr(""); setDone(0); setResultUrl(null);
        const translated: string[] = new Array(cues.length).fill("");
        try {
            for (let i = 0; i < cues.length; i += BATCH) {
                const slice = cues.slice(i, i + BATCH);
                // Empty-text cues (music cues etc.) stay as-is — don't waste a call.
                const nonEmptyIdx: number[] = [];
                const lines: string[] = [];
                slice.forEach((c, j) => { if (c.text.trim()) { nonEmptyIdx.push(j); lines.push(c.text); } else translated[i + j] = c.text; });

                if (lines.length > 0) {
                    const res = await fetch("/api/subtitles/translate", { method: "POST", headers: authHeaders(), body: JSON.stringify({ lines }) });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json?.error || "خطأ");
                    (json.translations || []).forEach((tr: string, k: number) => { translated[i + nonEmptyIdx[k]] = tr; });
                }
                setDone(Math.min(i + BATCH, cues.length));
            }
            const srt = buildSRT(cues, translated);
            const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
            setResultUrl(URL.createObjectURL(blob));
        } catch (e) {
            setErr(e instanceof Error ? e.message : "فشلت الترجمة");
        } finally {
            setBusy(false);
        }
    };

    const downloadName = fileName.replace(/\.srt$/i, "") + ".ar.srt";

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-sky-500" /></div>;
    }
    if (!user || user.role !== "dean") return null;

    const pct = cues.length > 0 ? Math.round((done / cues.length) * 100) : 0;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
            <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 pt-safe">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 active:scale-90 transition" aria-label="رجوع">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <Captions className="w-5 h-5 text-sky-400" />
                    <h1 className="text-base font-bold">مترجم الترجمات (SRT) <span className="text-[10px] text-sky-300/70 font-normal">· إنجليزي → عربي · العميد فقط</span></h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
                <label className="flex flex-col items-center justify-center gap-2 bg-slate-900 border border-dashed border-slate-700 hover:border-sky-500 rounded-2xl py-8 text-sm text-slate-300 cursor-pointer transition">
                    <Upload className="w-7 h-7 text-sky-400" />
                    <span className="font-bold">ارفع ملف الترجمة (.srt)</span>
                    <span className="text-[11px] text-slate-500">إنجليزي → عربي · كل سطر يُترجم</span>
                    <input type="file" className="hidden" onChange={onUpload} />
                </label>

                {err && <p className="text-center text-sm text-rose-400">{err}</p>}

                {cues.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300 truncate">📄 {fileName}</span>
                            <span className="text-slate-500">{cues.length} سطر</span>
                        </div>

                        {busy || done > 0 ? (
                            <div className="space-y-2">
                                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-l from-sky-500 to-cyan-400 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-xs text-slate-400 text-center">{busy ? `يترجم... ${done}/${cues.length} (${pct}%)` : `تمت ترجمة ${done} سطر ✅`}</p>
                            </div>
                        ) : null}

                        {!resultUrl ? (
                            <button onClick={translate} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold rounded-2xl py-3 transition">
                                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> يترجم...</> : <><Captions className="w-4 h-4" /> ترجم كل السطور</>}
                            </button>
                        ) : (
                            <a href={resultUrl} download={downloadName} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl py-3 transition">
                                <Download className="w-4 h-4" /> نزّل الترجمة العربية
                            </a>
                        )}

                        {resultUrl && (
                            <p className="flex items-center justify-center gap-1.5 text-xs text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> جاهز! نزّل الملف وشغّله مع الفيلم
                            </p>
                        )}
                    </div>
                )}

                <p className="text-[10px] text-slate-600 text-center">🔒 الترجمة عبر خدمة مجانية · تُحفظ التوقيتات كما هي · بدون AI أو مفاتيح</p>
            </div>
        </main>
    );
}
