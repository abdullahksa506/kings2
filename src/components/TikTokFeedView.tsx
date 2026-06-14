"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, MapPin, Calendar, Share2, Music, ChevronUp, Vote, Users, Check, X, Trophy, Rewind, Volume2, VolumeX, Settings } from "lucide-react";
import { toast } from "sonner";
import { WeekSession, VALID_NAMES, services, ChatMessage } from "@/lib/services";

/**
 * Real music — Kevin MacLeod (incompetech.com) — Creative Commons BY 4.0.
 * Each track is a full composition (not algorithmic). Track moods are picked
 * to match each card vibe. Attribution is shown on each music caption.
 */
const TRACKS: Array<{ url: string; title: string; artist: string }> = [
    // King — heroic fanfare
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Mining%20by%20Moonlight.mp3", title: "Mining by Moonlight", artist: "Kevin MacLeod" },
    // Restaurant — chill jazz
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3", title: "Carefree", artist: "Kevin MacLeod" },
    // Day vote — sneaky comedy
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3", title: "Sneaky Snitch", artist: "Kevin MacLeod" },
    // Attendance — funky upbeat
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Funky%20Chunk.mp3", title: "Funky Chunk", artist: "Kevin MacLeod" },
    // Restaurant vote — competitive build
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Builder.mp3", title: "The Builder", artist: "Kevin MacLeod" },
    // Past week — nostalgic mellow
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3", title: "Wallpaper", artist: "Kevin MacLeod" },
    // Leaderboard — serious jazzy
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lobby%20Time.mp3", title: "Lobby Time", artist: "Kevin MacLeod" },
    // Bathroom — silly playful
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3", title: "Monkeys Spinning Monkeys", artist: "Kevin MacLeod" },
    // Map / recent — adventurous epic
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pamgaea.mp3", title: "Pamgaea", artist: "Kevin MacLeod" },
    // Chat — upbeat happy
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hyperfun.mp3", title: "Hyperfun", artist: "Kevin MacLeod" },
    // Bonus — relaxed mood music
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Local%20Forecast%20-%20Elevator.mp3", title: "Local Forecast", artist: "Kevin MacLeod" },
    { url: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wholesome.mp3", title: "Wholesome", artist: "Kevin MacLeod" },
];

interface TikTokFeedViewProps {
    currentWeek: WeekSession | null;
    pastWeek: WeekSession | null;
    userName: string;
    topMember?: { name: string; score: number } | null;
    onSwitchToFullView: () => void;
    onNavigate?: (tab: "leaderboard" | "bathroom" | "map" | "more") => void;
}

interface ActionRailItem {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
}

function ActionRail({
    items,
    profile,
    onShare,
}: {
    items?: ActionRailItem[];
    profile?: string;
    onShare?: () => void;
}) {
    return (
        <div className="absolute bottom-12 right-2 z-30 flex flex-col items-center gap-4">
            {/* Profile circle (decorative — but kept as visual anchor like real TikTok) */}
            {profile && (
                <div className="w-12 h-12 rounded-full overflow-hidden border-[2.5px] border-white bg-gradient-to-br from-pink-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center text-2xl mb-1">
                    {profile}
                </div>
            )}

            {/* Custom items (interactive buttons specific to card) */}
            {items?.map((item, i) => (
                <button
                    key={i}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform disabled:opacity-40"
                >
                    <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            item.active
                                ? "bg-pink-500 scale-110 shadow-lg shadow-pink-500/60"
                                : "bg-black/45 backdrop-blur"
                        }`}
                    >
                        {item.icon}
                    </div>
                    <span className="text-[11px] text-white font-bold drop-shadow-lg">{item.label}</span>
                </button>
            ))}

            {/* Share — opens WhatsApp with prefilled text */}
            {onShare && (
                <button onClick={onShare} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                    <div className="w-12 h-12 rounded-full bg-black/45 backdrop-blur flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[11px] text-white font-bold drop-shadow-lg">شارك</span>
                </button>
            )}

            {/* Rotating music disc — purely visual (matches the music caption) */}
            <div className="mt-1 w-10 h-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-pink-600 via-fuchsia-700 to-black flex items-center justify-center animate-spin-slow">
                <div className="w-3 h-3 rounded-full bg-black border-2 border-white/40" />
            </div>
        </div>
    );
}

function CaptionOverlay({
    username,
    caption,
    music,
    artist,
}: {
    username: string;
    caption: string;
    music?: string;
    artist?: string;
}) {
    const musicLine = music && artist ? `${music} — ${artist}` : music || "";
    return (
        <div className="absolute bottom-12 left-4 right-24 z-30 text-white">
            <p className="font-black text-base mb-1 drop-shadow-lg">@{username}</p>
            <p className="text-sm leading-relaxed drop-shadow-lg mb-2">{caption}</p>
            {music && (
                <div className="flex items-center gap-1.5 text-xs">
                    <Music className="w-3 h-3" />
                    <div className="overflow-hidden whitespace-nowrap">
                        <span className="inline-block animate-marquee">♪ {musicLine} ♪ {musicLine} ♪</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TikTokFeedView({
    currentWeek,
    pastWeek,
    userName,
    topMember,
    onSwitchToFullView,
    onNavigate,
}: TikTokFeedViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);
    const [muted, setMuted] = useState(true);
    const [audioReady, setAudioReady] = useState(false);

    // ── Live data for inline sections (no buttons, just content) ──
    const [leaderboard, setLeaderboard] = useState<{ name: string; avg: number; weeks: number }[]>([]);
    const [bathroomTop, setBathroomTop] = useState<{ restaurant: string; avg: number; count: number }[]>([]);
    const [recentRestaurants, setRecentRestaurants] = useState<{ name: string; king: string | null; week: number }[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        // Leaderboard: avg score per king across completed weeks
        services.getAllCompletedWeeks().then((rows) => {
            const stats: Record<string, { sum: number; n: number }> = {};
            for (const r of rows) {
                const k = r.week.king;
                if (!k || r.averageScore <= 0) continue;
                if (!stats[k]) stats[k] = { sum: 0, n: 0 };
                stats[k].sum += r.averageScore;
                stats[k].n += 1;
            }
            const list = Object.entries(stats)
                .map(([name, { sum, n }]) => ({ name, avg: sum / n, weeks: n }))
                .sort((a, b) => b.avg - a.avg);
            setLeaderboard(list);

            // Recent restaurants (last 5 visited)
            const sortedRecent = rows
                .filter((r) => r.week.restaurant)
                .sort((a, b) => b.week.createdAt.toMillis() - a.week.createdAt.toMillis())
                .slice(0, 5)
                .map((r) => ({
                    name: r.week.restaurant as string,
                    king: r.week.king,
                    week: r.week.weekNumber,
                }));
            setRecentRestaurants(sortedRecent);
        }).catch(() => {});

        // Bathroom top
        services.getAllBathroomRatings().then((rows) => {
            const byRest: Record<string, { sum: number; n: number }> = {};
            for (const r of rows) {
                const key = (r.restaurantName || r.bathroomName || "").trim();
                if (!key) continue;
                if (!byRest[key]) byRest[key] = { sum: 0, n: 0 };
                byRest[key].sum += r.score;
                byRest[key].n += 1;
            }
            const list = Object.entries(byRest)
                .filter(([, v]) => v.n >= 1)
                .map(([restaurant, { sum, n }]) => ({ restaurant, avg: sum / n, count: n }))
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 5);
            setBathroomTop(list);
        }).catch(() => {});

        // Live chat
        const unsub = services.listenToChatMessages((msgs) => {
            setChatMessages(msgs.slice(-5).reverse());
        });
        return () => { try { unsub(); } catch {} };
    }, []);

    // Swap music per-card. Cards are rendered in order so we index TRACKS by activeIdx.
    const currentTrack = TRACKS[activeIdx % TRACKS.length];

    // Update audio source when card changes
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        if (a.src !== currentTrack.url) {
            const wasPlaying = !a.paused;
            a.src = currentTrack.url;
            a.load();
            if (wasPlaying && !muted) {
                a.play().catch(() => {});
            }
        }
    }, [currentTrack.url, muted]);

    // First user interaction → enable audio (browser autoplay policy)
    const enableAudio = () => {
        const a = audioRef.current;
        if (!a) return;
        setMuted(false);
        a.muted = false;
        a.volume = 0.35;
        a.play().then(() => setAudioReady(true)).catch(() => {
            toast.error("ما قدرنا نشغل الموسيقى");
        });
    };

    const toggleMute = () => {
        const a = audioRef.current;
        if (!a) return;
        if (muted) {
            enableAudio();
        } else {
            setMuted(true);
            a.muted = true;
            a.pause();
        }
    };

    // Track which card is currently in view
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const idx = Math.round(el.scrollTop / el.clientHeight);
            setActiveIdx(idx);
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    if (!currentWeek) {
        return (
            <div className="h-[80vh] flex items-center justify-center text-white text-center px-6">
                <p>لا توجد جلسة الآن. ارجع للعرض الكامل.</p>
            </div>
        );
    }

    const isMember = VALID_NAMES.includes(userName);
    const kingName = currentWeek.king || (currentWeek.isRandom ? "عشوائي 🎲" : "—");
    const restaurant = currentWeek.restaurant || "لم يُختر";
    const day = currentWeek.day;
    const responded = currentWeek.responded || [];
    const absentees = currentWeek.absentees || [];
    const dayVotes = currentWeek.dayVotes || {};
    const myAttendance = responded.includes(userName)
        ? absentees.includes(userName)
            ? "absent"
            : "present"
        : "pending";
    const attendingCount = VALID_NAMES.filter(
        (n) => (responded.includes(n) && !absentees.includes(n)) || n === currentWeek.king,
    ).length;

    // Vote tally for day
    let thuCount = 0;
    let friCount = 0;
    let bothCount = 0;
    for (const [name, d] of Object.entries(dayVotes)) {
        if (!responded.includes(name) || absentees.includes(name)) continue;
        if (d === "الخميس") thuCount += 1;
        else if (d === "الجمعة") friCount += 1;
        else if (d === "الخميس والجمعة") bothCount += 1;
    }
    const myDayVote = dayVotes[userName];

    // Restaurant voting
    const votingActive = currentWeek.restaurantVotingActive;
    const candidates = currentWeek.restaurantCandidates || [];
    const restaurantVotes = currentWeek.restaurantVotes || {};
    const restaurantTally: Record<string, number> = {};
    Object.values(restaurantVotes).forEach((r) => {
        restaurantTally[r] = (restaurantTally[r] || 0) + 1;
    });
    const myRestaurantVote = restaurantVotes[userName];

    // ── Actions ──
    const markAttendance = async (isAbsent: boolean) => {
        if (busy || !isMember) return;
        setBusy("att");
        try {
            await services.toggleAttendance(currentWeek.id, userName, isAbsent);
            toast.success(isAbsent ? "تم تسجيل المعذرة" : "تم تأكيد الحضور");
        } catch (e) {
            toast.error("صار خطأ");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const castDayVote = async (d: "الخميس" | "الجمعة" | "الخميس والجمعة") => {
        if (busy || !isMember) return;
        if (myAttendance !== "present") {
            toast.error("أكّد حضورك أولاً");
            return;
        }
        setBusy("day");
        try {
            const res = await services.submitDayVote(currentWeek.id, userName, d);
            const auto = (res as { autoAppliedDay?: string | null })?.autoAppliedDay;
            toast.success(auto ? `تم الحسم: ${auto} 🎉` : `صوّتت ${d}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "خطأ");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const castRestaurantVote = async (r: string) => {
        if (busy || !isMember) return;
        setBusy("rest");
        try {
            await services.submitRestaurantVote(currentWeek.id, r);
            toast.success(`صوّتت لـ ${r}`);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "خطأ");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const shareKing = () => {
        const text = `👑 ملك الخميس هذا الأسبوع: ${kingName}\n📅 ${day || "لم يحدد"}\n🍽️ ${restaurant}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank");
    };

    // ── Build cards ──
    type Card = { id: string; render: () => React.ReactNode };
    const cards: Card[] = [];

    // 1) King card
    cards.push({
        id: "king",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 flex items-center justify-center">
                <Crown className="absolute opacity-10 w-[600px] h-[600px] -rotate-12 text-white" />
                <div className="relative text-center text-white px-6 z-20">
                    <p className="text-2xl font-bold mb-2 drop-shadow-2xl">👑 ملك الأسبوع</p>
                    <h1 className="text-7xl font-black drop-shadow-2xl tracking-tight" style={{ WebkitTextStroke: "1px rgba(0,0,0,0.2)" }}>
                        {kingName}
                    </h1>
                    <p className="text-lg mt-4 opacity-90 drop-shadow-lg">دورة {currentWeek.cycleNumber} · أسبوع {currentWeek.weekNumber}</p>
                </div>
                <CaptionOverlay
                    username="king_of_thursday"
                    caption={`الملك ${kingName} بنفسه 👑 الكل يحضّر! 🔥`}
                    music={TRACKS[0].title}
                    artist={TRACKS[0].artist}
                />
                <ActionRail profile="👑" onShare={shareKing} />
            </div>
        ),
    });

    // 2) Restaurant card
    cards.push({
        id: "rest",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">🍽️</span>
                <div className="relative text-center text-white px-6 z-20">
                    <p className="text-2xl font-bold mb-2 drop-shadow-2xl">🍽️ المطعم</p>
                    <h1 className="text-5xl font-black drop-shadow-2xl px-4">{restaurant}</h1>
                </div>
                <CaptionOverlay
                    username="restaurant_pick"
                    caption={`الطلعة في ${restaurant} 🤤 يا حلو الأكل!`}
                    music={TRACKS[1].title}
                    artist={TRACKS[1].artist}
                />
                <ActionRail
                    profile="🍔"
                    onShare={() => {
                        const url = `https://wa.me/?text=${encodeURIComponent(`🍽️ مطعم الطلعة: ${restaurant}`)}`;
                        window.open(url, "_blank");
                    }}
                />
            </div>
        ),
    });

    // 3) Day card — voting
    cards.push({
        id: "day",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 flex items-center justify-center">
                <Calendar className="absolute opacity-10 w-[500px] h-[500px] text-white" />
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-2 drop-shadow-2xl">📅 يوم الطلعة</p>
                    {day ? (
                        <h1 className="text-7xl font-black drop-shadow-2xl">{day}</h1>
                    ) : (
                        <>
                            <h1 className="text-5xl font-black drop-shadow-2xl mb-6">صوّت!</h1>
                            <div className="space-y-2">
                                {(["الخميس", "الجمعة", "الخميس والجمعة"] as const).map((d) => {
                                    const n = d === "الخميس" ? thuCount : d === "الجمعة" ? friCount : bothCount;
                                    const isMine = myDayVote === d;
                                    return (
                                        <button
                                            key={d}
                                            onClick={() => castDayVote(d)}
                                            disabled={busy !== null || !isMember || myAttendance !== "present"}
                                            className={`w-full rounded-2xl py-3 px-4 font-bold text-lg backdrop-blur transition-all disabled:opacity-50 ${
                                                isMine
                                                    ? "bg-white text-fuchsia-700 scale-105 shadow-2xl"
                                                    : "bg-white/15 hover:bg-white/25"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span>{d}</span>
                                                <span className="text-sm opacity-80">{n} صوت</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {myAttendance !== "present" && (
                                <p className="mt-3 text-xs text-white/80">⚠️ أكّد حضورك من الكارد التالي عشان تصوّت</p>
                            )}
                        </>
                    )}
                </div>
                <CaptionOverlay
                    username="day_vote"
                    caption={day ? "محسوم ✅" : "اسحب يمين أو صوّت ↑"}
                    music={TRACKS[2].title}
                    artist={TRACKS[2].artist}
                />
                <ActionRail
                    profile="📅"
                    onShare={() => {
                        const url = `https://wa.me/?text=${encodeURIComponent("📅 صوّت ليوم الطلعة!")}`;
                        window.open(url, "_blank");
                    }}
                />
            </div>
        ),
    });

    // 4) Attendance card
    cards.push({
        id: "att",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700 flex items-center justify-center">
                <Users className="absolute opacity-10 w-[500px] h-[500px] text-white" />
                <div className="relative text-center text-white px-6 z-20">
                    <p className="text-2xl font-bold mb-2 drop-shadow-2xl">جاي ولا لا؟ 🤔</p>
                    <h1 className="text-8xl font-black drop-shadow-2xl">{attendingCount}<span className="text-5xl">/6</span></h1>
                    <p className="text-lg mt-2 drop-shadow-lg">جاي للطلعة</p>
                    {isMember && currentWeek.king !== userName && (
                        <p className="mt-4 text-sm bg-black/30 backdrop-blur px-4 py-2 rounded-full inline-block">
                            وضعك: {myAttendance === "present" ? "✅ حاضر" : myAttendance === "absent" ? "❌ معذور" : "⌛ ما ردّيت"}
                        </p>
                    )}
                </div>
                <CaptionOverlay
                    username="attendance"
                    caption={`${attendingCount} حاضر من ٦ 🔥`}
                    music={TRACKS[3].title}
                    artist={TRACKS[3].artist}
                />
                <ActionRail
                    profile={myAttendance === "present" ? "✅" : myAttendance === "absent" ? "❌" : "🤔"}
                    onShare={() => {
                        const url = `https://wa.me/?text=${encodeURIComponent(`✅ ${attendingCount} حاضر للطلعة`)}`;
                        window.open(url, "_blank");
                    }}
                    items={[
                        {
                            icon: <Check className="w-6 h-6 text-white" />,
                            label: "حاضر",
                            onClick: () => markAttendance(false),
                            active: myAttendance === "present",
                            disabled: !isMember || currentWeek.king === userName,
                        },
                        {
                            icon: <X className="w-6 h-6 text-white" />,
                            label: "معذرة",
                            onClick: () => markAttendance(true),
                            active: myAttendance === "absent",
                            disabled: !isMember || currentWeek.king === userName,
                        },
                    ]}
                />
            </div>
        ),
    });

    // 5) Restaurant voting card — only if active
    if (votingActive && candidates.length > 0) {
        cards.push({
            id: "rvote",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-600 to-purple-700 flex items-center justify-center">
                    <Vote className="absolute opacity-10 w-[500px] h-[500px] text-white" />
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-2 drop-shadow-2xl">🗳️ صوّت للمطعم</p>
                        <div className="space-y-2 mt-4">
                            {candidates.map((c) => {
                                const n = restaurantTally[c] || 0;
                                const isMine = myRestaurantVote === c;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => castRestaurantVote(c)}
                                        disabled={busy !== null || !isMember}
                                        className={`w-full rounded-2xl py-3 px-4 font-bold text-lg backdrop-blur transition-all disabled:opacity-50 ${
                                            isMine ? "bg-white text-indigo-700 scale-105 shadow-2xl" : "bg-white/15 hover:bg-white/25"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="line-clamp-1">{c}</span>
                                            <span className="text-sm opacity-80">{n}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <CaptionOverlay
                        username="resto_vote"
                        caption="مين راح يكسب؟ 🥁"
                        music={TRACKS[4].title}
                    artist={TRACKS[4].artist}
                    />
                    <ActionRail profile="🗳️" />
                </div>
            ),
        });
    }

    // 6) Top leader card
    if (topMember) {
        cards.push({
            id: "top",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 flex items-center justify-center">
                    <Trophy className="absolute opacity-10 w-[500px] h-[500px] text-white" />
                    <div className="relative text-center text-white px-6 z-20">
                        <p className="text-2xl font-bold mb-2 drop-shadow-2xl">🏆 المتصدّر</p>
                        <h1 className="text-7xl font-black drop-shadow-2xl">{topMember.name}</h1>
                        <p className="text-5xl font-black mt-2 drop-shadow-lg">{topMember.score} نقطة</p>
                    </div>
                    <CaptionOverlay
                        username="leaderboard"
                        caption={`${topMember.name} يحكم اللوحة 👑`}
                        music={TRACKS[5].title}
                    artist={TRACKS[5].artist}
                    />
                    <ActionRail profile="🏆" />
                </div>
            ),
        });
    }

    // 7) Past week recap
    if (pastWeek) {
        cards.push({
            id: "past",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
                    <Rewind className="absolute opacity-10 w-[500px] h-[500px] text-white" />
                    <div className="relative text-center text-white px-6 z-20">
                        <p className="text-2xl font-bold mb-2 drop-shadow-2xl">⏪ آخر طلعة</p>
                        <h1 className="text-5xl font-black drop-shadow-2xl">{pastWeek.king || "—"}</h1>
                        <p className="text-xl mt-3 drop-shadow-lg">{pastWeek.day || "—"} · {pastWeek.restaurant || "—"}</p>
                    </div>
                    <CaptionOverlay
                        username="last_week"
                        caption={`ذكريات أسبوع ${pastWeek.weekNumber} 📸`}
                        music={TRACKS[6].title}
                    artist={TRACKS[6].artist}
                    />
                    <ActionRail profile="🎞️" />
                </div>
            ),
        });
    }

    // ── Leaderboard card: real podium with avg scores ──
    cards.push({
        id: "leader",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-yellow-500 via-amber-600 to-orange-700 flex items-center justify-center">
                <Trophy className="absolute opacity-10 w-[500px] h-[500px] text-white" />
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🏆 لوحة الترتيب</p>
                    <p className="text-xs text-white/80 mb-4">معدل التقييم كملك</p>
                    {leaderboard.length === 0 ? (
                        <p className="text-white/85 text-sm">لا توجد بيانات بعد</p>
                    ) : (
                        <div className="space-y-2 text-right">
                            {leaderboard.slice(0, 6).map((m, i) => (
                                <div
                                    key={m.name}
                                    className={`rounded-2xl px-4 py-3 flex items-center justify-between backdrop-blur ${
                                        i === 0
                                            ? "bg-white text-orange-700"
                                            : i === 1
                                            ? "bg-white/85 text-orange-700"
                                            : i === 2
                                            ? "bg-white/70 text-orange-700"
                                            : "bg-white/15"
                                    } ${m.name === userName ? "ring-2 ring-cyan-300" : ""}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣"][i]}</span>
                                        <div>
                                            <p className="font-black text-lg">{m.name}</p>
                                            <p className="text-[10px] opacity-70">{m.weeks} أسابيع كملك</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-xl">⭐ {m.avg.toFixed(1)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <CaptionOverlay
                    username="leaderboard_legend"
                    caption="مين أحسن ملك من ناحية التقييم؟ 👑📊"
                    music={TRACKS[7].title}
                    artist={TRACKS[7].artist}
                />
                <ActionRail profile="🏆" />
            </div>
        ),
    });

    // ── Bathroom top card: real top-rated bathrooms ──
    cards.push({
        id: "bath",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-700 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">🚽</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🚽 أفضل الحمّامات</p>
                    <p className="text-xs text-white/80 mb-4">حسب تقييماتنا</p>
                    {bathroomTop.length === 0 ? (
                        <p className="text-white/85 text-sm">ما فيه تقييمات بعد</p>
                    ) : (
                        <div className="space-y-2 text-right">
                            {bathroomTop.slice(0, 5).map((b, i) => (
                                <div
                                    key={b.restaurant}
                                    className={`rounded-2xl px-4 py-3 flex items-center justify-between backdrop-blur ${
                                        i === 0 ? "bg-white text-teal-700" : "bg-white/15"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                                        <div>
                                            <p className="font-bold text-base line-clamp-1">{b.restaurant}</p>
                                            <p className="text-[10px] opacity-70">{b.count} تقييم</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-lg">⭐ {b.avg.toFixed(1)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <CaptionOverlay
                    username="bathroom_critic"
                    caption="ما تنسى الحمّام الزين 🧻✨"
                    music={TRACKS[8].title}
                    artist={TRACKS[8].artist}
                />
                <ActionRail profile="🚽" />
            </div>
        ),
    });

    // ── Recent restaurants card (alternative to map) ──
    cards.push({
        id: "recent",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 flex items-center justify-center">
                <MapPin className="absolute opacity-10 w-[500px] h-[500px] text-white" />
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🗺️ آخر مطاعم زرناها</p>
                    <p className="text-xs text-white/80 mb-4">من أحدث طلعة</p>
                    {recentRestaurants.length === 0 ? (
                        <p className="text-white/85 text-sm">ما فيه طلعات سابقة</p>
                    ) : (
                        <div className="space-y-2 text-right">
                            {recentRestaurants.map((r, i) => (
                                <div key={`${r.name}-${i}`} className="rounded-2xl px-4 py-3 bg-white/15 backdrop-blur">
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl">📍</span>
                                        <div className="flex-1 text-right mr-3">
                                            <p className="font-bold text-base line-clamp-1">{r.name}</p>
                                            <p className="text-[11px] opacity-80">
                                                أسبوع {r.week} · ملك: {r.king || "—"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <CaptionOverlay
                    username="map_memories"
                    caption="ذكريات في كل مطعم 🍽️📍"
                    music={TRACKS[9].title}
                    artist={TRACKS[9].artist}
                />
                <ActionRail profile="🗺️" />
            </div>
        ),
    });

    // ── Live chat card ──
    cards.push({
        id: "chat",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">💬</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">💬 آخر الرسائل</p>
                    <p className="text-xs text-white/80 mb-4">من شات الجلسة</p>
                    {chatMessages.length === 0 ? (
                        <p className="text-white/85 text-sm">ما فيه رسائل بعد</p>
                    ) : (
                        <div className="space-y-2 text-right">
                            {chatMessages.map((m) => (
                                <div key={m.id} className="rounded-2xl px-4 py-3 bg-white/15 backdrop-blur">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">💬</span>
                                        <div className="flex-1 text-right">
                                            <p className="font-bold text-sm text-pink-200">{m.nickName || m.userName}</p>
                                            <p className="text-sm line-clamp-2">{m.text}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <CaptionOverlay
                    username="group_chat"
                    caption="كلام الجلسة هنا 🗨️"
                    music={TRACKS[10].title}
                    artist={TRACKS[10].artist}
                />
                <ActionRail profile="💬" />
            </div>
        ),
    });

    return (
        <div className="fixed inset-0 z-50 bg-black" style={{ touchAction: "pan-y" }}>
            {/* Hidden audio element — cycles per card */}
            <audio
                ref={audioRef}
                loop
                muted={muted}
                preload="auto"
                playsInline
                onCanPlay={() => {
                    if (!muted) audioRef.current?.play().catch(() => {});
                }}
            />

            {/* Mute / play toggle — top left */}
            <button
                onClick={toggleMute}
                className="absolute top-3 left-3 z-50 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition-transform"
                aria-label={muted ? "تشغيل الصوت" : "كتم"}
            >
                {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-pink-400" />}
            </button>

            {/* TikTok top tabs: Following | For You */}
            <div className="absolute top-3 left-0 right-0 z-40 flex items-center justify-center px-4 pt-2">
                {/* Top-right: ONLY settings gear (user-approved exception to navigate to theme picker) */}
                <button
                    onClick={() => onNavigate?.("more")}
                    className="absolute right-3 top-1 text-white/90 active:scale-90 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
                    aria-label="إعدادات / غيّر الثيم"
                >
                    <Settings className="w-5 h-5 drop-shadow-lg" />
                </button>
                <div className="text-base font-black text-white drop-shadow-lg relative pb-1">
                    لك
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-white rounded-full" />
                </div>
            </div>

            {/* Progress dots (subtle, under tabs) */}
            <div className="absolute top-14 left-0 right-0 z-40 flex justify-center gap-1 px-4 pointer-events-none">
                {cards.map((_, i) => (
                    <div
                        key={i}
                        className={`h-0.5 flex-1 max-w-[28px] rounded-full transition-all ${
                            i === activeIdx ? "bg-white" : "bg-white/25"
                        }`}
                    />
                ))}
            </div>

            {/* Feed */}
            <div
                ref={scrollRef}
                className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
                style={{ scrollSnapType: "y mandatory" }}
            >
                {cards.map((c) => (
                    <section
                        key={c.id}
                        className="h-full w-full snap-start snap-always relative"
                        style={{ scrollSnapAlign: "start", height: "100dvh" }}
                    >
                        {c.render()}
                    </section>
                ))}
            </div>

            {/* Swipe-up hint on first card */}
            {activeIdx === 0 && cards.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 text-white/80 flex flex-col items-center gap-1 animate-bounce pointer-events-none">
                    <ChevronUp className="w-6 h-6" />
                    <span className="text-[10px]">اسحب فوق</span>
                </div>
            )}
        </div>
    );
}
