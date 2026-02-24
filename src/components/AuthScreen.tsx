"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { services } from "@/lib/services";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Lock, User, AlertCircle, ArrowRight, KeyRound, CheckCircle2 } from "lucide-react";

const VALID_NAMES = ["خالد", "طلال", "شوكا", "حكير", "هشام", "نواف"];

export default function AuthScreen() {
    const { login, register, registeredNamesCount } = useAuth();

    const [isRegistering, setIsRegistering] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState<1 | 2>(1);
    const [resetCode, setResetCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [selectedName, setSelectedName] = useState(VALID_NAMES[0]);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // If 6 or more are registered, we permanently hide registration
    const allRegistered = registeredNamesCount >= 6;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        setLoading(true);

        try {
            if (isForgotPassword) {
                if (forgotPasswordStep === 1) {
                    await services.requestPasswordReset(selectedName);
                    setSuccessMsg("تم إرسال كود الاسترجاع إلى العميد. يرجى التواصل معه للحصول على الكود.");
                    setForgotPasswordStep(2);
                } else {
                    await services.resetPasswordWithCode(selectedName, resetCode, newPassword);
                    setSuccessMsg("تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
                    setIsForgotPassword(false);
                    setForgotPasswordStep(1);
                    setPassword("");
                    setResetCode("");
                    setNewPassword("");
                }
            } else if (isRegistering && !allRegistered) {
                await register(selectedName, password);
            } else {
                await login(selectedName, password);
            }
        } catch (err: any) {
            setError(err.message || "حدث خطأ ما");
        } finally {
            setLoading(false);
        }
    };

    const toggleForgotPassword = () => {
        setIsForgotPassword(!isForgotPassword);
        setIsRegistering(false);
        setForgotPasswordStep(1);
        setError("");
        setSuccessMsg("");
        setPassword("");
        setResetCode("");
        setNewPassword("");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
            {/* Background glowing effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/30">
                        <Crown className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
                        ملك الخميس
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm text-center">
                        دستور 2026: ولست بخيركم فأن رأيتموني على حق أطيعوني
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm"
                            >
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-400 text-sm"
                            >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{successMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300">الاسم</label>
                        <div className="relative">
                            <select
                                value={selectedName}
                                onChange={(e) => setSelectedName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all appearance-none text-white"
                                disabled={isForgotPassword && forgotPasswordStep === 2}
                            >
                                {VALID_NAMES.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {!isForgotPassword ? (
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-300">الرمز السري</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 pr-10 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-white placeholder-slate-600 font-mono"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                    <Lock className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        forgotPasswordStep === 2 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-300">كود الاسترجاع (من العميد)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={resetCode}
                                            onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                            placeholder="1234"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 pr-10 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-white placeholder-slate-600 font-mono tracking-widest text-center"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                            <KeyRound className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-300">كلمة المرور الجديدة</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 pr-10 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-white placeholder-slate-600 font-mono"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {isForgotPassword
                                    ? (forgotPasswordStep === 1 ? "طلب كود الاسترجاع" : "تأكيد كلمة المرور الجديدة")
                                    : (isRegistering && !allRegistered ? "إنشاء حساب" : "تسجيل الدخول")}
                                <ArrowRight className="w-4 h-4 rotate-180" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 flex flex-col gap-3 text-center text-sm text-slate-500">
                    {!isForgotPassword && (
                        <button
                            type="button"
                            onClick={toggleForgotPassword}
                            className="text-slate-400 hover:text-amber-400 font-medium transition-colors"
                        >
                            نسيت كلمة المرور؟
                        </button>
                    )}

                    {isForgotPassword ? (
                        <button
                            type="button"
                            onClick={toggleForgotPassword}
                            className="text-slate-400 hover:text-amber-400 font-medium transition-colors"
                        >
                            العودة لتسجيل الدخول
                        </button>
                    ) : (
                        !allRegistered && (
                            <div>
                                {isRegistering ? "لديك حساب مسبقاً؟ " : "لم تسجل بعد؟ "}
                                <button
                                    type="button"
                                    onClick={() => setIsRegistering(!isRegistering)}
                                    className="text-amber-500 hover:text-amber-400 font-medium transition-colors"
                                >
                                    {isRegistering ? "تسجيل الدخول" : "إنشاء حساب"}
                                </button>
                            </div>
                        )
                    )}
                </div>
            </motion.div>
        </div>
    );
}
