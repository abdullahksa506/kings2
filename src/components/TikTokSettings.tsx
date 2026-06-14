"use client";

import { ChevronRight, Palette, User, LogOut, Bell, Sparkles, X } from "lucide-react";

interface ThemeOption {
    id: string;
    name: string;
    previewA: string;
    previewB: string;
}

interface TikTokSettingsProps {
    themes: ThemeOption[];
    selectedTheme: string;
    userName: string;
    nickName?: string;
    profileImage?: string | null;
    role?: string;
    onSelectTheme: (id: string) => void;
    onClose: () => void;
    onLogout: () => void;
    onOpenProfile?: () => void;
    onOpenConstitution?: () => void;
    onOpenStats?: () => void;
}

export default function TikTokSettings({
    themes,
    selectedTheme,
    userName,
    nickName,
    profileImage,
    role,
    onSelectTheme,
    onClose,
    onLogout,
    onOpenProfile,
    onOpenConstitution,
    onOpenStats,
}: TikTokSettingsProps) {
    const displayName = nickName?.trim() || userName;

    return (
        <div className="fixed inset-0 z-[60] bg-gradient-to-b from-black via-zinc-950 to-black overflow-y-auto">
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                        aria-label="إغلاق"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="font-black text-white text-lg">الإعدادات ⚙️</h1>
                    <div className="w-9" />
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-5 pb-24 space-y-5">
                {/* Profile chip */}
                <div className="bg-gradient-to-br from-pink-500 via-fuchsia-600 to-purple-700 rounded-3xl p-5 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-[3px] border-white overflow-hidden bg-white/20 flex items-center justify-center text-3xl">
                            {profileImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                                "👤"
                            )}
                        </div>
                        <div className="flex-1 text-white">
                            <p className="font-black text-xl">@{displayName}</p>
                            <p className="text-xs text-white/80 mt-1">
                                {role === "dean" ? "🗝️ عميد الجلسة" : "عضو الجلسة"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Theme picker — main feature */}
                <section className="bg-white/5 backdrop-blur rounded-3xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <Palette className="w-5 h-5 text-pink-400" />
                        <h2 className="font-black text-white text-lg">الثيم</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {themes.map((theme) => {
                            const active = theme.id === selectedTheme;
                            return (
                                <button
                                    key={theme.id}
                                    onClick={() => onSelectTheme(theme.id)}
                                    className={`text-right rounded-2xl border p-3 transition-all active:scale-95 ${
                                        active
                                            ? "border-pink-400 bg-pink-500/20 ring-2 ring-pink-400/60"
                                            : "border-white/15 bg-white/5 hover:bg-white/10"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold ${active ? "text-pink-300" : "text-white/80"}`}>
                                            {theme.name}
                                        </span>
                                        {active && <span className="text-[10px] text-pink-300">✓</span>}
                                    </div>
                                    <div className="flex gap-1">
                                        <span className={`w-6 h-6 rounded-full ${theme.previewA}`} />
                                        <span className={`w-6 h-6 rounded-full ${theme.previewB}`} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Quick links */}
                <section className="bg-white/5 backdrop-blur rounded-3xl border border-white/10 overflow-hidden">
                    {onOpenProfile && (
                        <button
                            onClick={() => { onOpenProfile(); }}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 active:bg-white/10 border-b border-white/10"
                        >
                            <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                                <User className="w-4 h-4 text-cyan-300" />
                            </div>
                            <div className="flex-1 text-right">
                                <p className="text-white font-bold text-sm">ملفي الشخصي</p>
                                <p className="text-[11px] text-white/60">أرقامي، إنجازاتي، تاريخي</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 rotate-180" />
                        </button>
                    )}

                    {onOpenStats && (
                        <button
                            onClick={() => { onOpenStats(); }}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 active:bg-white/10 border-b border-white/10"
                        >
                            <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-400/40 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-violet-300" />
                            </div>
                            <div className="flex-1 text-right">
                                <p className="text-white font-bold text-sm">الإحصائيات</p>
                                <p className="text-[11px] text-white/60">كل الأرقام والتحاليل</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 rotate-180" />
                        </button>
                    )}

                    {onOpenConstitution && (
                        <button
                            onClick={() => { onOpenConstitution(); }}
                            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 active:bg-white/10 border-b border-white/10"
                        >
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                                <Bell className="w-4 h-4 text-amber-300" />
                            </div>
                            <div className="flex-1 text-right">
                                <p className="text-white font-bold text-sm">الدستور</p>
                                <p className="text-[11px] text-white/60">قوانين الجلسة الذهبية</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 rotate-180" />
                        </button>
                    )}

                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/10 active:bg-red-500/20"
                    >
                        <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-red-300" />
                        </div>
                        <div className="flex-1 text-right">
                            <p className="text-red-300 font-bold text-sm">خروج</p>
                            <p className="text-[11px] text-white/60">سجّل خروج من الجلسة</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/40 rotate-180" />
                    </button>
                </section>

                {/* Footer credit */}
                <p className="text-center text-white/40 text-[10px] mt-6">
                    عرش الخميس · موسيقى من iTunes Preview API
                </p>
            </div>
        </div>
    );
}
