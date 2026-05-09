"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Crown,
    Calendar,
    Star,
    Trophy,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";

const STORAGE_KEY = "king_onboarding_completed_v1";

interface OnboardingStep {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
    accent: string;
}

const STEPS: OnboardingStep[] = [
    {
        icon: Crown,
        title: "أهلاً في عرش الخميس 👑",
        body: "كل أسبوع نختار ملك يقرر يوم الطلعة والمطعم. الترتيب بالتناوب، وكل ٧ أسابيع يصير في أسبوع عشوائي.",
        accent: "from-amber-500/30 to-amber-700/15 border-amber-400/40 text-amber-300",
    },
    {
        icon: Calendar,
        title: "أكد حضورك أو اعتذارك",
        body: "بمجرد ما يبدأ الأسبوع، ادخل بطاقة الأسبوع وأكد. لو ما حدد الملك اليوم، تقدر تصوّت.",
        accent: "from-emerald-500/30 to-emerald-700/15 border-emerald-400/40 text-emerald-300",
    },
    {
        icon: Star,
        title: "قيّم الطلعة بسرية",
        body: "بعد الطلعة، يفتح العميد التقييم. تقييمك مجهول الهوية ويدخل في الإحصائيات وقائمة الشرف.",
        accent: "from-violet-500/30 to-purple-700/15 border-violet-400/40 text-violet-300",
    },
    {
        icon: Trophy,
        title: "تابع لوحات الصدارة 🏆",
        body: "شف ترتيب الملوك والمطاعم، إنجازاتك الشخصية، وإحصائيات شاملة عن الطلعات.",
        accent: "from-sky-500/30 to-cyan-700/15 border-sky-400/40 text-sky-300",
    },
];

export default function Onboarding() {
    const [show, setShow] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        try {
            const seen = localStorage.getItem(STORAGE_KEY);
            if (!seen) setShow(true);
        } catch {
            // ignore
        }
    }, []);

    const finish = () => {
        try {
            localStorage.setItem(STORAGE_KEY, "1");
        } catch {
            // ignore
        }
        setShow(false);
    };

    if (!show) return null;

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const Icon = current.icon;

    return (
        <AnimatePresence>
            {show && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                    data-no-swipe
                >
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.96 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-400/20 rounded-3xl p-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden"
                    >
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(251,191,36,0.15),transparent_55%)]" />

                        <button
                            onClick={finish}
                            className="absolute top-3 left-3 bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-slate-300 p-1.5 rounded-xl"
                            aria-label="تخطي"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className={`bg-gradient-to-br ${current.accent} p-5 rounded-3xl border shadow-[0_0_30px_rgba(245,158,11,0.15)] mb-5`}>
                                <Icon className="w-10 h-10" />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
                            <p className="text-sm text-slate-300 leading-relaxed max-w-xs">{current.body}</p>

                            <div className="flex items-center justify-center gap-2 mt-7 mb-6">
                                {STEPS.map((_, idx) => (
                                    <span
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all ${
                                            idx === step
                                                ? "bg-amber-400 w-8"
                                                : idx < step
                                                    ? "bg-amber-400/40 w-2"
                                                    : "bg-slate-700 w-2"
                                        }`}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between gap-3 w-full">
                                <button
                                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                                    disabled={step === 0}
                                    className="bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700 text-slate-300 p-3 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    aria-label="السابق"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold py-3 rounded-2xl transition-all shadow-[0_8px_25px_rgba(245,158,11,0.35)]"
                                >
                                    {isLast ? "ابدأ الاستخدام" : "التالي"}
                                </button>

                                <button
                                    onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                                    disabled={isLast}
                                    className="bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700 text-slate-300 p-3 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    aria-label="التالي"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            </div>

                            <button
                                onClick={finish}
                                className="text-xs text-slate-500 hover:text-slate-300 mt-4"
                            >
                                تخطي التعريف
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
