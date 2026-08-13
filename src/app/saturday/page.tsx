"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "تعرف مين عنده وصول لطلعة السبت؟"
 * قال: "أعرف... بس ما أقول. أنا AI مو نمّام 🤐😂"
 *
 * طلعة السبت السرّية — صفحة كاملة لا يوصلها إلا من سمح لهم عميد السبت (هشام).
 * كل البيانات تجي من السيرفر (المجموعات مقفلة على العميل)، فحتى وجود الطلعة سرّي.
 */

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { services, VALID_NAMES } from "@/lib/services";
import { SATURDAY_DEAN, saturdayLabel, formatTime, isValidTime, type SaturdayState, type SaturdayOuting } from "@/lib/saturday";
import { ChevronRight, Loader2, Lock, ScrollText, Users, Clock, Check, X, Bell, Save, History, Sparkles } from "lucide-react";

function authHeaders(): Record<string, string> {
    const name = typeof window !== "undefined" ? localStorage.getItem("king_user_name") || "" : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("king_user_token") || "" : "";
    return { "Content-Type": "application/json", "x-user-name": encodeURIComponent(name), "x-user-token": token };
}

/** One-time explainer — shown to the Saturday dean the first time only. */
function IntroOverlay({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto p-4 flex items-start justify-center">
            <div className="w-full max-w-lg my-6 bg-gradient-to-b from-slate-900 to-slate-950 border border-violet-500/30 rounded-3xl p-6 space-y-4">
                <div className="text-center">
                    <div className="text-5xl mb-2">🤫</div>
                    <h2 className="text-xl font-bold text-violet-200">أهلاً يا عميد السبت</h2>
                    <p className="text-xs text-slate-400 mt-1">هذي صفحتك أنت — هذا شرح سريع لكل شي فيها</p>
                </div>

                <div className="space-y-3 text-sm">
                    {[
                        { icon: "🔐", t: "أنت تتحكم بالوصول", d: "تختار مين يشوف هالصفحة. اللي ما تختاره ما يشوف الزر أصلاً — ولا يعرف إنها موجودة." },
                        { icon: "📜", t: "الدستور بيدك", d: "تكتب دستور السبت نص حر، والباقي يقرأونه بس — ما يقدرون يعدلون." },
                        { icon: "🗓️", t: "طلعة كل سبت تلقائياً", d: "كل أسبوع تُفتح طلعة سبت جديدة لحالها. تقدر تلغيها لو ما فيه طلعة." },
                        { icon: "⏰", t: "كل واحد يحدد ساعته", d: "ما فيه اختيار مطعم — كل واحد يقول بيجي أو لا، والساعة كم بيوصل. والكل يشوف أوقات بعض." },
                        { icon: "🔔", t: "تنبيه الجمعة", d: "كل جمعة العصر يوصل تنبيه لأصحاب الوصول يحددون موقفهم. وتقدر ترسله يدوياً وقت ما تبي." },
                        { icon: "📝", t: "توثيق بعد الطلعة", d: "تكتب ملاحظة عن وش صار في الطلعة، وتنحفظ في السجل." },
                    ].map((row) => (
                        <div key={row.t} className="flex gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                            <span className="text-xl shrink-0">{row.icon}</span>
                            <div>
                                <p className="font-bold text-slate-100 text-sm">{row.t}</p>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{row.d}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={onClose} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl py-3 transition">
                    فهمت، يلا نبدأ 🚀
                </button>
                <p className="text-[10px] text-slate-600 text-center">هذي الرسالة تظهر لك مرة وحدة بس</p>
            </div>
        </div>
    );
}

export default function SaturdayPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [state, setState] = useState<SaturdayState | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");
    const [showIntro, setShowIntro] = useState(false);

    // dean editors
    const [constDraft, setConstDraft] = useState("");
    const [editingConst, setEditingConst] = useState(false);
    const [noteDraft, setNoteDraft] = useState("");
    // Documentation is usually written AFTER the outing — by then it has moved to the
    // archive, so past outings stay editable by the dean too.
    const [editingNoteKey, setEditingNoteKey] = useState<string | null>(null);
    const [histNoteDraft, setHistNoteDraft] = useState("");
    // my rsvp
    const [myTime, setMyTime] = useState("20:00");

    const load = useCallback(async () => {
        try {
            const s = await services.saturdayGetState();
            setState(s);
            setConstDraft(s.constitution || "");
            setNoteDraft(s.current?.note || "");
            const mine = user?.name ? s.current?.responses?.[user.name] : null;
            if (mine?.time) setMyTime(mine.time);
            if (s.isSaturdayDean && !s.introSeen) setShowIntro(true);
        } catch {
            setState(null);
        } finally {
            setLoading(false);
        }
    }, [user?.name]);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    const dismissIntro = async () => {
        setShowIntro(false);
        try { await services.saturdayMarkIntroSeen(); } catch { /* non-critical */ }
    };

    const respond = async (coming: boolean) => {
        if (!state?.current || busy) return;
        if (coming && !isValidTime(myTime)) { setMsg("حدد ساعة صحيحة"); return; }
        setBusy(true); setMsg("");
        try {
            await services.saturdayRespond(state.current.key, coming, coming ? myTime : null);
            await load();
        } catch (e) {
            setMsg(e instanceof Error ? e.message : "ما قدرنا نحفظ ردك");
        } finally { setBusy(false); }
    };

    const saveConstitution = async () => {
        setBusy(true); setMsg("");
        try {
            await services.saturdaySetConstitution(constDraft);
            setEditingConst(false);
            await load();
        } catch (e) { setMsg(e instanceof Error ? e.message : "فشل الحفظ"); }
        finally { setBusy(false); }
    };

    const toggleAccess = async (name: string) => {
        if (!state || busy) return;
        const has = state.allowedMembers.includes(name);
        const next = has ? state.allowedMembers.filter((n) => n !== name) : [...state.allowedMembers, name];
        setBusy(true);
        try { await services.saturdaySetAccess(next); await load(); }
        catch (e) { setMsg(e instanceof Error ? e.message : "فشل التحديث"); }
        finally { setBusy(false); }
    };

    const saveNote = async () => {
        if (!state?.current) return;
        setBusy(true);
        try { await services.saturdaySetNote(state.current.key, noteDraft); await load(); setMsg("تم حفظ التوثيق ✓"); }
        catch (e) { setMsg(e instanceof Error ? e.message : "فشل الحفظ"); }
        finally { setBusy(false); }
    };

    const saveHistoryNote = async (key: string) => {
        setBusy(true);
        try {
            await services.saturdaySetNote(key, histNoteDraft);
            setEditingNoteKey(null);
            await load();
            setMsg("تم حفظ التوثيق ✓");
        } catch (e) { setMsg(e instanceof Error ? e.message : "فشل الحفظ"); }
        finally { setBusy(false); }
    };

    const toggleStatus = async () => {
        if (!state?.current) return;
        setBusy(true);
        try {
            await services.saturdaySetStatus(state.current.key, state.current.status === "open" ? "cancelled" : "open");
            await load();
        } finally { setBusy(false); }
    };

    const sendReminder = async () => {
        setBusy(true); setMsg("");
        try {
            const res = await fetch("/api/reminders/saturday-rsvp", { method: "POST", headers: authHeaders(), body: "{}" });
            const data = await res.json();
            setMsg(data?.message || data?.error || "تم");
        } catch { setMsg("فشل الإرسال"); }
        finally { setBusy(false); }
    };

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-violet-500" /></div>;
    }
    if (!user) return null;

    // No access → deliberately vague. We never confirm the page's contents exist.
    if (!state?.hasAccess) {
        return (
            <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6" dir="rtl">
                <div className="text-center max-w-sm">
                    <Lock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <h1 className="text-lg font-bold text-slate-300">هذي الصفحة مو متاحة لك</h1>
                    <p className="text-sm text-slate-500 mt-2">لو تعتقد إنه خطأ، كلّم {SATURDAY_DEAN}.</p>
                    <button onClick={() => router.push("/")} className="mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl px-5 py-2.5 text-sm font-semibold">
                        رجوع للرئيسية
                    </button>
                </div>
            </main>
        );
    }

    const isDean = state.isSaturdayDean;
    const current = state.current;
    const myResp = current?.responses?.[user.name];
    const coming = Object.entries(current?.responses || {}).filter(([, r]) => r.coming);
    const notComing = Object.entries(current?.responses || {}).filter(([, r]) => !r.coming);
    const accessList = Array.from(new Set([SATURDAY_DEAN, ...state.allowedMembers]));
    const noReply = accessList.filter((n) => !current?.responses?.[n]);

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
            {showIntro && <IntroOverlay onClose={dismissIntro} />}

            <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 pt-safe">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => router.push("/")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 active:scale-90 transition" aria-label="رجوع">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <span className="text-xl">🤫</span>
                    <h1 className="text-base font-bold">طلعة السبت السرّية
                        {isDean && <span className="text-[10px] text-violet-300/70 font-normal mr-2">· أنت العميد</span>}
                    </h1>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
                {msg && <p className="text-center text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl py-2">{msg}</p>}

                {/* ── This Saturday ── */}
                <section className="bg-gradient-to-br from-violet-900/40 to-slate-900 border border-violet-500/30 rounded-3xl p-5">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <h2 className="font-bold text-violet-100">{current ? saturdayLabel(current.key) : "—"}</h2>
                        {current?.status === "cancelled"
                            ? <span className="text-[11px] bg-red-500/20 text-red-300 border border-red-500/30 rounded-full px-2.5 py-1">ملغاة</span>
                            : <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-2.5 py-1">قائمة</span>}
                    </div>

                    {current?.status === "cancelled" ? (
                        <p className="text-sm text-slate-400">ما فيه طلعة هذا السبت.</p>
                    ) : (
                        <>
                            {/* My RSVP */}
                            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                                <p className="text-sm font-semibold text-slate-200">بتجي؟ وإذا بتجي، الساعة كم توصل؟</p>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                                    <input type="time" value={myTime} onChange={(e) => setMyTime(e.target.value)}
                                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
                                    <span className="text-xs text-slate-500">{isValidTime(myTime) ? formatTime(myTime) : ""}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => respond(true)} disabled={busy}
                                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-bold transition ${myResp?.coming ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                                        <Check className="w-4 h-4" /> بجي
                                    </button>
                                    <button onClick={() => respond(false)} disabled={busy}
                                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-bold transition ${myResp && !myResp.coming ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                                        <X className="w-4 h-4" /> ما بجي
                                    </button>
                                </div>
                            </div>

                            {/* Everyone's times */}
                            <div className="mt-4 space-y-2">
                                <p className="text-xs font-bold text-slate-400">الحاضرين ({coming.length})</p>
                                {coming.length === 0 ? (
                                    <p className="text-xs text-slate-600">ما حد أكّد بعد</p>
                                ) : coming
                                    .sort((a, b) => (a[1].time || "").localeCompare(b[1].time || ""))
                                    .map(([name, r]) => (
                                        <div key={name} className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                                            <span className="text-sm text-emerald-100">{name}</span>
                                            <span className="text-sm font-bold text-emerald-300">{r.time ? formatTime(r.time) : "—"}</span>
                                        </div>
                                    ))}

                                {notComing.length > 0 && (
                                    <>
                                        <p className="text-xs font-bold text-slate-400 pt-1">معتذرين ({notComing.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {notComing.map(([name]) => (
                                                <span key={name} className="text-[11px] bg-red-500/10 border border-red-500/20 text-red-200 rounded-lg px-2 py-1">{name}</span>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {noReply.length > 0 && (
                                    <>
                                        <p className="text-xs font-bold text-slate-400 pt-1">ما ردّوا ({noReply.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {noReply.map((name) => (
                                                <span key={name} className="text-[11px] bg-slate-800 border border-slate-700 text-slate-400 rounded-lg px-2 py-1">{name}</span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {isDean && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
                            <button onClick={sendReminder} disabled={busy}
                                className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl px-3 py-2 text-xs font-bold">
                                <Bell className="w-3.5 h-3.5" /> نبّه الكل الحين
                            </button>
                            <button onClick={toggleStatus} disabled={busy}
                                className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs font-bold">
                                {current?.status === "cancelled" ? "رجّعها" : "ألغِ طلعة هذا السبت"}
                            </button>
                        </div>
                    )}
                </section>

                {/* ── Constitution ── */}
                <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-slate-100 flex items-center gap-2"><ScrollText className="w-4 h-4 text-amber-400" /> دستور السبت</h2>
                        {isDean && !editingConst && (
                            <button onClick={() => setEditingConst(true)} className="text-xs text-amber-400 hover:text-amber-300">تعديل</button>
                        )}
                    </div>
                    {isDean && editingConst ? (
                        <div className="space-y-2">
                            <textarea value={constDraft} onChange={(e) => setConstDraft(e.target.value)} rows={10} dir="rtl"
                                placeholder="اكتب دستور طلعة السبت..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500 leading-relaxed" />
                            <div className="flex gap-2">
                                <button onClick={saveConstitution} disabled={busy}
                                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl px-4 py-2 text-sm">
                                    <Save className="w-4 h-4" /> حفظ
                                </button>
                                <button onClick={() => { setEditingConst(false); setConstDraft(state.constitution || ""); }}
                                    className="bg-slate-800 text-slate-300 rounded-xl px-4 py-2 text-sm">إلغاء</button>
                            </div>
                        </div>
                    ) : state.constitution ? (
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{state.constitution}</p>
                    ) : (
                        <p className="text-sm text-slate-600">{isDean ? "ما كتبت الدستور بعد — اضغط تعديل." : "العميد ما كتب الدستور بعد."}</p>
                    )}
                </section>

                {/* ── Access control (dean only) ── */}
                {isDean && (
                    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                        <h2 className="font-bold text-slate-100 flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-violet-400" /> مين عنده وصول</h2>
                        <p className="text-[11px] text-slate-500 mb-3">اللي ما تختاره ما يشوف الزر ولا الصفحة</p>
                        <div className="space-y-1.5">
                            {VALID_NAMES.filter((n) => n !== SATURDAY_DEAN).map((name) => {
                                const has = state.allowedMembers.includes(name);
                                return (
                                    <button key={name} onClick={() => toggleAccess(name)} disabled={busy}
                                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 border transition ${has ? "bg-violet-500/15 border-violet-500/40 text-violet-100" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}>
                                        <span className="text-sm font-semibold">{name}</span>
                                        <span className={`text-[11px] font-bold ${has ? "text-violet-300" : "text-slate-600"}`}>{has ? "عنده وصول ✓" : "ما عنده"}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── Documentation of this outing (dean writes) ── */}
                {isDean && current && (
                    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                        <h2 className="font-bold text-slate-100 mb-2">📝 توثيق الطلعة</h2>
                        <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} dir="rtl"
                            placeholder="وش صار في الطلعة؟ اكتب توثيق..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-3 py-2 text-sm text-white outline-none focus:border-violet-500" />
                        <button onClick={saveNote} disabled={busy}
                            className="mt-2 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl px-4 py-2 text-sm">
                            <Save className="w-4 h-4" /> حفظ التوثيق
                        </button>
                    </section>
                )}

                {/* ── Archive ── */}
                <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                    <h2 className="font-bold text-slate-100 flex items-center gap-2 mb-3"><History className="w-4 h-4 text-sky-400" /> سجل الطلعات</h2>
                    {state.history.length === 0 ? (
                        <p className="text-sm text-slate-600">ما فيه طلعات سابقة بعد.</p>
                    ) : (
                        <div className="space-y-2">
                            {state.history.map((o: SaturdayOuting) => {
                                const came = Object.entries(o.responses || {}).filter(([, r]) => r.coming).map(([n]) => n);
                                const editing = editingNoteKey === o.key;
                                return (
                                    <div key={o.key} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-200">{saturdayLabel(o.key)}</p>
                                            {o.status === "cancelled"
                                                ? <span className="text-[10px] text-red-300">ملغاة</span>
                                                : <span className="text-[10px] text-slate-500">{came.length} حضروا</span>}
                                        </div>
                                        {came.length > 0 && <p className="text-[11px] text-slate-500 mt-1">{came.join(" · ")}</p>}

                                        {editing ? (
                                            <div className="mt-2 space-y-2">
                                                <textarea value={histNoteDraft} onChange={(e) => setHistNoteDraft(e.target.value)} rows={3} dir="rtl"
                                                    placeholder="وش صار في هذي الطلعة؟"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-sky-500" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => saveHistoryNote(o.key)} disabled={busy}
                                                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg px-3 py-1.5 text-xs">حفظ</button>
                                                    <button onClick={() => setEditingNoteKey(null)}
                                                        className="bg-slate-800 text-slate-300 rounded-lg px-3 py-1.5 text-xs">إلغاء</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {o.note && <p className="text-sm text-sky-100/90 mt-2 whitespace-pre-wrap leading-relaxed">📝 {o.note}</p>}
                                                {isDean && (
                                                    <button
                                                        onClick={() => { setEditingNoteKey(o.key); setHistNoteDraft(o.note || ""); }}
                                                        className="mt-2 text-[11px] text-sky-400 hover:text-sky-300">
                                                        {o.note ? "تعديل التوثيق" : "+ أضف توثيق"}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <p className="text-[10px] text-slate-600 text-center flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" /> صفحة سرّية — محتواها ما يوصل إلا لأصحاب الوصول
                </p>
            </div>
        </main>
    );
}
