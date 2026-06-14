"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, MapPin, Calendar, Share2, Music, ChevronUp, Vote, Users, Check, X, Trophy, Rewind, Volume2, VolumeX, Settings, Heart } from "lucide-react";
import { toast } from "sonner";
import { WeekSession, VALID_NAMES, services, ChatMessage, Suggestion, FUTURE_FEATURE_SEEDS } from "@/lib/services";

/**
 * Track type — fetched dynamically from iTunes Preview API.
 * iTunes Preview API is public, no auth, free; returns 30-sec audio snippets
 * of real songs (Arabic + global). This is exactly how Apple's own iTunes
 * Store does song previews. Anyone with a browser can play these.
 */
interface Track {
    url: string;          // 30-second preview .m4a URL
    title: string;        // Song title
    artist: string;       // Artist name
    artwork: string;      // 600x600 album artwork URL
}

/**
 * 60 song queries — 40 Saudi/Khaleeji + 20 American pop. Order is shuffled
 * client-side on each load so the feed feels fresh. Each search returns the
 * top match from iTunes Preview API (real 30-sec snippet).
 * country=SA → Saudi storefront (best for Arab catalog); US queries use US.
 */
const SEARCH_TERMS: Array<{ q: string; country: string }> = [
    // ── Saudi & Khaleeji (40) ─────────────────────────────
    { q: "محمد عبده",          country: "SA" },
    { q: "محمد عبده الأماكن",    country: "SA" },
    { q: "محمد عبده ابعاد",      country: "SA" },
    { q: "طلال مداح",          country: "SA" },
    { q: "طلال مداح مقادير",    country: "SA" },
    { q: "عبدالمجيد عبدالله",   country: "SA" },
    { q: "عبدالمجيد عبدالله أسأل عليك", country: "SA" },
    { q: "راشد الماجد",        country: "SA" },
    { q: "راشد الماجد كلمة",    country: "SA" },
    { q: "رابح صقر",            country: "SA" },
    { q: "رابح صقر آه يا قلبي", country: "SA" },
    { q: "خالد عبدالرحمن",     country: "SA" },
    { q: "خالد عبدالرحمن جرحي قديم", country: "SA" },
    { q: "عبدالله الرويشد",    country: "SA" },
    { q: "نوال الكويتية",       country: "SA" },
    { q: "أصالة",               country: "SA" },
    { q: "حسين الجسمي",        country: "SA" },
    { q: "حسين الجسمي بشرة خير", country: "SA" },
    { q: "حسين الجسمي بشرة الخير", country: "SA" },
    { q: "ماجد المهندس",       country: "SA" },
    { q: "ماجد المهندس ولاني",  country: "SA" },
    { q: "وليد الشامي",         country: "SA" },
    { q: "فؤاد عبدالواحد",     country: "SA" },
    { q: "أصيل أبو بكر",        country: "SA" },
    { q: "أبو بكر سالم",        country: "SA" },
    { q: "محمد السالم",         country: "SA" },
    { q: "أيوب طارش",          country: "SA" },
    { q: "ميامي بند",           country: "SA" },
    { q: "ميامي مغرور",        country: "SA" },
    { q: "ميامي بليلة الصيف",  country: "SA" },
    { q: "فايز السعيد",        country: "SA" },
    { q: "نبيل شعيل",          country: "SA" },
    { q: "عبادي الجوهر",       country: "SA" },
    { q: "محمد الشحي",         country: "SA" },
    { q: "عيضة المنهالي",      country: "SA" },
    { q: "بدر الشعيبي",        country: "SA" },
    { q: "أحلام",               country: "SA" },
    { q: "أحلام تعالي",         country: "SA" },
    { q: "كاظم الساهر",        country: "SA" },
    { q: "عمرو دياب نور العين", country: "SA" },

    // ── More Saudi & Khaleeji (35) — مجموع ٧٥ ──────────────
    { q: "محمد عبده فوق هام السحب",        country: "SA" },
    { q: "محمد عبده ابعاد",                  country: "SA" },
    { q: "محمد عبده الرسايل",                country: "SA" },
    { q: "محمد عبده يا غايب",                country: "SA" },
    { q: "طلال مداح فوق هام السحب",         country: "SA" },
    { q: "طلال مداح زمان الصمت",             country: "SA" },
    { q: "طلال مداح وردك يا زارع الورد",     country: "SA" },
    { q: "عبدالمجيد عبدالله بحبك إنت",       country: "SA" },
    { q: "عبدالمجيد عبدالله حلم",            country: "SA" },
    { q: "عبدالمجيد عبدالله بداية",          country: "SA" },
    { q: "راشد الماجد إستاهل",               country: "SA" },
    { q: "راشد الماجد سايبني",                country: "SA" },
    { q: "خالد عبدالرحمن جرحي قديم",         country: "SA" },
    { q: "خالد عبدالرحمن لا يا قلبي",        country: "SA" },
    { q: "ماجد المهندس قولوا لها",           country: "SA" },
    { q: "ماجد المهندس حياة",                 country: "SA" },
    { q: "حسين الجسمي بقلبي",                country: "SA" },
    { q: "حسين الجسمي إذا ودك",              country: "SA" },
    { q: "وليد الشامي رمشة عين",              country: "SA" },
    { q: "فؤاد عبدالواحد",                    country: "SA" },
    { q: "أصالة عقول",                       country: "SA" },
    { q: "أصالة شخصية عنيدة",                country: "SA" },
    { q: "أحلام الشامسي",                    country: "SA" },
    { q: "كاظم الساهر الحب المستحيل",         country: "SA" },
    { q: "كاظم الساهر زيديني عشقاً",         country: "SA" },
    { q: "عمرو دياب تمللي معاك",              country: "SA" },
    { q: "عمرو دياب وماله",                  country: "SA" },
    { q: "عمرو دياب أحلى",                    country: "SA" },
    { q: "محمد منير شبابيك",                 country: "SA" },
    { q: "نانسي عجرم لمس إيدي",               country: "SA" },
    { q: "إليسا تعبت منك",                    country: "SA" },
    { q: "إليسا عيشالك",                     country: "SA" },
    { q: "تامر حسني نقول إيه",               country: "SA" },
    { q: "تامر حسني يا بنت الإيه",            country: "SA" },
    { q: "محمد حماقي ما تخافيش",              country: "SA" },

    // ── American Pop & Global (25) — مجموع ٢٥ ──────────────
    { q: "Taylor Swift Shake It Off",          country: "US" },
    { q: "Taylor Swift Blank Space",           country: "US" },
    { q: "Taylor Swift Anti Hero",             country: "US" },
    { q: "Bruno Mars Uptown Funk",             country: "US" },
    { q: "Bruno Mars 24K Magic",               country: "US" },
    { q: "Ed Sheeran Shape of You",            country: "US" },
    { q: "Ed Sheeran Perfect",                 country: "US" },
    { q: "The Weeknd Blinding Lights",         country: "US" },
    { q: "The Weeknd Save Your Tears",         country: "US" },
    { q: "Dua Lipa Levitating",                country: "US" },
    { q: "Dua Lipa Don't Start Now",           country: "US" },
    { q: "Billie Eilish Bad Guy",              country: "US" },
    { q: "Olivia Rodrigo Drivers License",     country: "US" },
    { q: "Olivia Rodrigo Vampire",             country: "US" },
    { q: "Justin Bieber Peaches",              country: "US" },
    { q: "Ariana Grande 7 Rings",              country: "US" },
    { q: "Harry Styles Watermelon Sugar",      country: "US" },
    { q: "Harry Styles As It Was",             country: "US" },
    { q: "Post Malone Sunflower",              country: "US" },
    { q: "Doja Cat Say So",                    country: "US" },
    { q: "Lady Gaga Bad Romance",              country: "US" },
    { q: "Beyonce Halo",                       country: "US" },
    { q: "Adele Rolling in the Deep",          country: "US" },
    { q: "Adele Hello",                        country: "US" },
    { q: "Maroon 5 Sugar",                     country: "US" },
];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

async function fetchTracks(): Promise<Track[]> {
    // Parallel fetch all 60 searches; shuffle order client-side
    const queries = shuffle(SEARCH_TERMS);
    const results = await Promise.all(
        queries.map(async ({ q, country }) => {
            try {
                const res = await fetch(
                    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=1&country=${country}`,
                );
                const json = await res.json();
                const r = json?.results?.[0];
                if (r?.previewUrl) {
                    return {
                        url: r.previewUrl,
                        title: r.trackName || "غير معروف",
                        artist: r.artistName || "غير معروف",
                        artwork: (r.artworkUrl100 || "").replace("100x100", "600x600"),
                    } as Track;
                }
            } catch {
                /* swallow */
            }
            return null;
        }),
    );
    return results.filter((t): t is Track => t !== null);
}

interface TikTokFeedViewProps {
    currentWeek: WeekSession | null;
    pastWeek: WeekSession | null;
    userName: string;
    topMember?: { name: string; score: number } | null;
    isDean?: boolean;
    hasRatedPastWeek?: boolean;
    hasRatedBathroomPastWeek?: boolean;
    onRatedPast?: () => void;
    onRatedBathroomPast?: () => void;
    onSwitchToFullView: () => void;
    onNavigate?: (tab: "leaderboard" | "bathroom" | "map" | "more") => void;
    // Modal openers — modals overlay on top of the feed (not navigation to a tab)
    onOpenStats?: () => void;
    onOpenProfile?: () => void;
    onOpenConstitution?: () => void;
    onOpenPlanner?: () => void;
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
    playing,
}: {
    items?: ActionRailItem[];
    profile?: string;
    onShare?: () => void;
    playing?: boolean;
}) {
    return (
        <div className="absolute bottom-12 right-2 z-30 flex flex-col items-center gap-4">
            {/* Profile circle (decorative — but kept as visual anchor like real TikTok) */}
            {profile && (
                <div className={`w-12 h-12 rounded-full overflow-hidden border-[2.5px] border-white bg-gradient-to-br from-pink-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center text-2xl mb-1 ${playing ? "animate-glow" : ""}`}>
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
            <div className={`mt-1 w-10 h-10 rounded-full border-2 border-white/30 bg-gradient-to-br from-pink-600 via-fuchsia-700 to-black flex items-center justify-center ${playing ? "animate-spin-slow" : ""}`}>
                <div className={`w-3 h-3 rounded-full bg-black border-2 ${playing ? "border-pink-300" : "border-white/40"}`} />
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
    isDean,
    hasRatedPastWeek,
    hasRatedBathroomPastWeek,
    onRatedPast,
    onRatedBathroomPast,
    onSwitchToFullView,
    onNavigate,
    onOpenStats,
    onOpenProfile,
    onOpenConstitution,
    onOpenPlanner,
}: TikTokFeedViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [busy, setBusy] = useState<string | null>(null);
    const [muted, setMuted] = useState(true);
    const [audioReady, setAudioReady] = useState(false);
    const [likedCards, setLikedCards] = useState<Record<string, boolean>>({});
    const [doubleTapHeart, setDoubleTapHeart] = useState<{ id: number; x: number; y: number } | null>(null);
    const lastTapRef = useRef<{ time: number; cardId: string }>({ time: 0, cardId: "" });
    const [tracks, setTracks] = useState<Track[]>([]);

    // Fetch real song previews from iTunes API (no auth, free, ~30s clips)
    useEffect(() => {
        fetchTracks().then((list) => {
            if (list.length > 0) setTracks(list);
        });
    }, []);

    // TikTok signature: double-tap anywhere on a card → animated heart + like
    const handleCardTap = (cardId: string, e: React.MouseEvent | React.TouchEvent) => {
        const now = Date.now();
        const last = lastTapRef.current;
        const isDouble = last.cardId === cardId && now - last.time < 320;
        lastTapRef.current = { time: now, cardId };
        if (!isDouble) return;
        // Capture tap coords for floating heart
        const ev = "touches" in e && e.touches[0] ? e.touches[0] : (e as React.MouseEvent);
        setDoubleTapHeart({ id: now, x: ev.clientX, y: ev.clientY });
        setLikedCards((s) => ({ ...s, [cardId]: true }));
        setTimeout(() => setDoubleTapHeart((h) => (h?.id === now ? null : h)), 900);
    };

    // ── Live data for inline sections (no buttons, just content) ──
    const [leaderboard, setLeaderboard] = useState<{ name: string; avg: number; weeks: number }[]>([]);
    const [bathroomTop, setBathroomTop] = useState<{ restaurant: string; avg: number; count: number }[]>([]);
    const [recentRestaurants, setRecentRestaurants] = useState<{ name: string; king: string | null; week: number }[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [suggestionText, setSuggestionText] = useState("");
    const [stats, setStats] = useState<{
        totalOutings: number;
        uniqueRestaurants: number;
        suggestionsCount: number;
        avgAttendance: number;
        mostKing?: { name: string; count: number } | null;
        highestRatedKing?: { name: string; score: number } | null;
    } | null>(null);
    // Best & worst weeks for the global leaderboard card
    const [topWeeks, setTopWeeks] = useState<{ kingName: string; restaurant: string; weekNumber: number; avg: number }[]>([]);
    // Inline rating state per card
    const [pastWeekScore, setPastWeekScore] = useState(0);
    const [pastBathroomScore, setPastBathroomScore] = useState(0);

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

            // Top-rated weeks (week-level leaderboard)
            const tops = rows
                .filter((r) => r.averageScore > 0)
                .sort((a, b) => b.averageScore - a.averageScore)
                .slice(0, 5)
                .map((r) => ({
                    kingName: r.week.king || "—",
                    restaurant: r.week.restaurant || "—",
                    weekNumber: r.week.weekNumber,
                    avg: r.averageScore,
                }));
            setTopWeeks(tops);
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

        // Suggestions list (just last few for preview)
        services.getAllSuggestions().then((rows) => {
            const sorted = [...rows].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setSuggestions(sorted.slice(0, 5));
        }).catch(() => {});

        // Statistics totals
        services.getStatistics().then((s) => {
            setStats({
                totalOutings: s?.totalOutings ?? 0,
                uniqueRestaurants: s?.uniqueRestaurants ?? 0,
                suggestionsCount: s?.suggestionsCount ?? 0,
                avgAttendance: s?.avgAttendancePerWeek ?? 0,
                mostKing: s?.funFacts?.mostKing ?? null,
                highestRatedKing: s?.funFacts?.highestRatedKing ?? null,
            });
        }).catch(() => {});

        return () => { try { unsub(); } catch {} };
    }, []);

    const submitPastRating = async () => {
        if (!pastWeek || busy || pastWeekScore < 1) return;
        setBusy("rate");
        try {
            await services.submitRating({
                weekId: pastWeek.id,
                rating: pastWeekScore,
                restaurantName: pastWeek.restaurant ?? undefined,
            });
            toast.success(`تقييمك ⭐ × ${pastWeekScore} وصل!`);
            onRatedPast?.();
        } catch (e) {
            toast.error("ما قدرنا نسجل التقييم");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const submitBathroomRating = async () => {
        if (!pastWeek || busy || pastBathroomScore < 1) return;
        setBusy("brate");
        try {
            await services.submitBathroomRating(
                pastWeek.id,
                userName,
                pastBathroomScore,
                undefined,
                pastWeek.restaurant ?? undefined,
            );
            toast.success(`قيمت الحمّام ⭐ × ${pastBathroomScore}`);
            onRatedBathroomPast?.();
        } catch (e) {
            toast.error("ما قدرنا نسجل تقييم الحمّام");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    const sendSuggestion = async () => {
        const text = suggestionText.trim();
        if (!text || busy) return;
        setBusy("suggest");
        try {
            await services.submitSuggestion(text);
            setSuggestionText("");
            toast.success("شكراً! اقتراحك وصل للعميد ✨");
        } catch (e) {
            toast.error("ما قدرنا نرسل");
            console.error(e);
        } finally {
            setBusy(null);
        }
    };

    // Swap music per-card. Use dynamic fetched tracks (real songs from iTunes).
    const currentTrack: Track | undefined = tracks.length > 0 ? tracks[activeIdx % tracks.length] : undefined;

    // Update audio source when card changes
    useEffect(() => {
        const a = audioRef.current;
        if (!a || !currentTrack) return;
        if (a.src !== currentTrack.url) {
            const wasPlaying = !a.paused;
            a.src = currentTrack.url;
            a.load();
            if (wasPlaying && !muted) {
                a.play().catch(() => {});
            }
        }
    }, [currentTrack?.url, muted, currentTrack]);

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
                    music={tracks[0]?.title}
                    artist={tracks[0]?.artist}
                />
                <ActionRail profile="👑" onShare={shareKing} playing={!muted && audioReady} />
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
                    music={tracks[1]?.title}
                    artist={tracks[1]?.artist}
                />
                <ActionRail
                    profile="🍔"
                    playing={!muted && audioReady}
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
                    music={tracks[2]?.title}
                    artist={tracks[2]?.artist}
                />
                <ActionRail
                    profile="📅"
                    playing={!muted && audioReady}
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
                    music={tracks[3]?.title}
                    artist={tracks[3]?.artist}
                />
                <ActionRail
                    profile={myAttendance === "present" ? "✅" : myAttendance === "absent" ? "❌" : "🤔"}
                    playing={!muted && audioReady}
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
                        music={tracks[4]?.title}
                    artist={tracks[4]?.artist}
                    />
                    <ActionRail profile="🗳️" playing={!muted && audioReady} />
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
                        music={tracks[5]?.title}
                    artist={tracks[5]?.artist}
                    />
                    <ActionRail profile="🏆" playing={!muted && audioReady} />
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
                        music={tracks[6]?.title}
                    artist={tracks[6]?.artist}
                    />
                    <ActionRail profile="🎞️" playing={!muted && audioReady} />
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
                    music={tracks[7]?.title}
                    artist={tracks[7]?.artist}
                />
                <ActionRail profile="🏆" playing={!muted && audioReady} />
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
                    music={tracks[8]?.title}
                    artist={tracks[8]?.artist}
                />
                <ActionRail profile="🚽" playing={!muted && audioReady} />
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
                    music={tracks[9]?.title}
                    artist={tracks[9]?.artist}
                />
                <ActionRail profile="🗺️" playing={!muted && audioReady} />
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
                    music={tracks[10]?.title}
                    artist={tracks[10]?.artist}
                />
                <ActionRail profile="💬" playing={!muted && audioReady} />
            </div>
        ),
    });

    // ── Rate past meal card (RatingForm inline) ──
    if (pastWeek && pastWeek.restaurant && pastWeek.ratingEnabled !== false && isMember && currentWeek?.king !== userName) {
        cards.push({
            id: "rate-past",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-yellow-400 via-amber-500 to-red-600 flex items-center justify-center">
                    <span className="absolute opacity-10 text-[400px] select-none">⭐</span>
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-1 drop-shadow-2xl">⭐ قيّم آخر طلعة</p>
                        <p className="text-xs text-white/85 mb-3">{pastWeek.restaurant} · أسبوع {pastWeek.weekNumber}</p>
                        {hasRatedPastWeek ? (
                            <div className="bg-white/15 backdrop-blur rounded-2xl py-5 px-4">
                                <p className="text-4xl mb-2">🎉</p>
                                <p className="text-base font-bold">قيّمت هالطلعة — مشكور!</p>
                            </div>
                        ) : (
                            <div className="bg-white/15 backdrop-blur rounded-3xl p-5">
                                <div className="flex justify-center gap-1.5 mb-4">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setPastWeekScore(s)}
                                            className="text-4xl active:scale-90 transition-transform"
                                        >
                                            {pastWeekScore >= s ? "⭐" : "☆"}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-white/85 mb-3">
                                    {pastWeekScore === 0 ? "اختر نجوم" :
                                     pastWeekScore <= 2 ? "ما عجبني 😬" :
                                     pastWeekScore === 3 ? "عادي 😐" :
                                     pastWeekScore === 4 ? "حلو 🤤" : "ممتاز! 🤩"}
                                </p>
                                <button
                                    onClick={submitPastRating}
                                    disabled={pastWeekScore < 1 || busy !== null}
                                    className="bg-white text-orange-700 font-black px-6 py-2.5 rounded-full text-sm disabled:opacity-50 active:scale-95"
                                >
                                    أرسل التقييم
                                </button>
                            </div>
                        )}
                    </div>
                    <CaptionOverlay
                        username="rate_the_meal"
                        caption={`${pastWeek.restaurant} ${hasRatedPastWeek ? "✅" : "⭐"}`}
                        music={tracks[8]?.title}
                        artist={tracks[8]?.artist}
                    />
                    <ActionRail profile="⭐" playing={!muted && audioReady} />
                </div>
            ),
        });
    }

    // ── Rate bathroom card ──
    if (pastWeek && pastWeek.restaurant && isMember && currentWeek?.king !== userName) {
        cards.push({
            id: "rate-bath",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-700 flex items-center justify-center">
                    <span className="absolute opacity-10 text-[400px] select-none">🚽</span>
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🚽 قيّم الحمّام</p>
                        <p className="text-xs text-white/85 mb-3">حمّام {pastWeek.restaurant}</p>
                        {hasRatedBathroomPastWeek ? (
                            <div className="bg-white/15 backdrop-blur rounded-2xl py-5 px-4">
                                <p className="text-4xl mb-2">🚽✨</p>
                                <p className="text-base font-bold">قيّمت الحمّام — برافو!</p>
                            </div>
                        ) : (
                            <div className="bg-white/15 backdrop-blur rounded-3xl p-5">
                                <div className="flex justify-center gap-1.5 mb-4">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setPastBathroomScore(s)}
                                            className="text-4xl active:scale-90 transition-transform"
                                        >
                                            {pastBathroomScore >= s ? "⭐" : "☆"}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-white/85 mb-3">
                                    {pastBathroomScore === 0 ? "كيف كان الحمّام؟" :
                                     pastBathroomScore <= 2 ? "وسخ 🤢" :
                                     pastBathroomScore === 3 ? "عادي" :
                                     pastBathroomScore === 4 ? "نضيف 👌" : "5 نجوم نضافة 🤩"}
                                </p>
                                <button
                                    onClick={submitBathroomRating}
                                    disabled={pastBathroomScore < 1 || busy !== null}
                                    className="bg-white text-cyan-700 font-black px-6 py-2.5 rounded-full text-sm disabled:opacity-50 active:scale-95"
                                >
                                    أرسل تقييم الحمّام
                                </button>
                            </div>
                        )}
                    </div>
                    <CaptionOverlay
                        username="bathroom_judge"
                        caption="نضيف ولا لا؟ 🧻"
                        music={tracks[9]?.title}
                        artist={tracks[9]?.artist}
                    />
                    <ActionRail profile="🚽" playing={!muted && audioReady} />
                </div>
            ),
        });
    }

    // ── Member status grid (current week) ──
    cards.push({
        id: "members",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-700 via-purple-700 to-fuchsia-800 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">👥</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">👥 الستة الكبار</p>
                    <p className="text-xs text-white/85 mb-4">حالة الحضور لأسبوع {currentWeek?.weekNumber ?? "-"}</p>
                    {currentWeek ? (
                        <div className="grid grid-cols-2 gap-2">
                            {VALID_NAMES.map((n) => {
                                const isKing = currentWeek.king === n;
                                const present = (currentWeek.responded || []).includes(n) && !(currentWeek.absentees || []).includes(n);
                                const absent = (currentWeek.absentees || []).includes(n);
                                const bg = isKing
                                    ? "bg-amber-400 text-amber-900"
                                    : present
                                    ? "bg-emerald-500 text-white"
                                    : absent
                                    ? "bg-rose-500 text-white"
                                    : "bg-white/15 text-white/80";
                                const icon = isKing ? "👑" : present ? "✅" : absent ? "❌" : "⌛";
                                const label = isKing ? "الملك" : present ? "حاضر" : absent ? "معذور" : "ما رد";
                                return (
                                    <div key={n} className={`rounded-2xl px-3 py-3 backdrop-blur ${bg}`}>
                                        <div className="text-3xl">{icon}</div>
                                        <p className="font-black text-base mt-1">{n}</p>
                                        <p className="text-[10px] opacity-85">{label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-white/85 text-sm">لا توجد جلسة</p>
                    )}
                </div>
                <CaptionOverlay
                    username="the_six"
                    caption="مين جاي ومين هرب 🏃‍♂️"
                    music={tracks[10]?.title}
                    artist={tracks[10]?.artist}
                />
                <ActionRail profile="👥" playing={!muted && audioReady} />
            </div>
        ),
    });

    // ── Best Weeks Leaderboard (week-level avg score) ──
    cards.push({
        id: "best-weeks",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-rose-500 via-pink-600 to-purple-700 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">🌟</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🌟 أحسن طلعات</p>
                    <p className="text-xs text-white/85 mb-4">معدّل تقييم الطلعة</p>
                    {topWeeks.length === 0 ? (
                        <p className="text-white/85 text-sm">ما فيه تقييمات بعد</p>
                    ) : (
                        <div className="space-y-2 text-right">
                            {topWeeks.map((w, i) => (
                                <div
                                    key={`${w.weekNumber}-${i}`}
                                    className={`rounded-2xl px-4 py-3 flex items-center justify-between backdrop-blur ${
                                        i === 0 ? "bg-white text-pink-700" : "bg-white/15"
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                                        <div>
                                            <p className="font-bold text-sm line-clamp-1">{w.restaurant}</p>
                                            <p className="text-[10px] opacity-80">👑 {w.kingName} · أسبوع {w.weekNumber}</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-lg">⭐ {w.avg.toFixed(1)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <CaptionOverlay
                    username="best_outings"
                    caption="أحسن طلعاتنا — وثّقوها 📸"
                    music={tracks[11]?.title}
                    artist={tracks[11]?.artist}
                />
                <ActionRail profile="🌟" playing={!muted && audioReady} />
            </div>
        ),
    });

    // ── Admin tools card (DEAN ONLY) ──
    if (isDean) {
        cards.push({
            id: "admin-tools",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-zinc-800 via-stone-900 to-black flex items-center justify-center">
                    <span className="absolute opacity-10 text-[400px] select-none">🛠️</span>
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🛠️ أدوات الإدارة</p>
                        <p className="text-xs text-white/80 mb-4">صلاحياتك المتقدمة</p>
                        <div className="space-y-2 text-right">
                            <div className="rounded-2xl px-4 py-3 bg-white/10 backdrop-blur border border-amber-500/30">
                                <p className="font-bold text-sm">📥 استيراد بيانات تاريخية</p>
                                <p className="text-[10px] text-white/70">ضع JSON من الأسابيع القديمة</p>
                            </div>
                            <div className="rounded-2xl px-4 py-3 bg-white/10 backdrop-blur border border-violet-500/30">
                                <p className="font-bold text-sm">🧹 تنظيف أسماء المطاعم</p>
                                <p className="text-[10px] text-white/70">ادمج المكرّرات وأصلح الإملاء</p>
                            </div>
                            <div className="rounded-2xl px-4 py-3 bg-white/10 backdrop-blur border border-rose-500/30">
                                <p className="font-bold text-sm">⚙️ إدارة الدورة</p>
                                <p className="text-[10px] text-white/70">إعادة تعيين، تغيير الملك</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-white/60 mt-3">افتح تبويب "المزيد" للوصول الفعلي 👇</p>
                    </div>
                    <CaptionOverlay
                        username="admin_panel"
                        caption="صلاحيات العميد الكاملة 🗝️"
                        music={tracks[12]?.title}
                        artist={tracks[12]?.artist}
                    />
                    <ActionRail profile="🛠️" playing={!muted && audioReady} />
                </div>
            ),
        });
    }

    // ── Statistics card ──
    cards.push({
        id: "stats",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">📊</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">📊 إحصائيات الجلسة</p>
                    <p className="text-xs text-white/80 mb-4">عبر كل الدورات</p>
                    {stats ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl px-3 py-4 bg-white/15 backdrop-blur">
                                <p className="text-4xl font-black">{stats.totalOutings}</p>
                                <p className="text-xs text-white/85 mt-1">طلعة كاملة</p>
                            </div>
                            <div className="rounded-2xl px-3 py-4 bg-white/15 backdrop-blur">
                                <p className="text-4xl font-black">{stats.uniqueRestaurants}</p>
                                <p className="text-xs text-white/85 mt-1">مطعم مختلف</p>
                            </div>
                            <div className="rounded-2xl px-3 py-4 bg-white/15 backdrop-blur">
                                <p className="text-4xl font-black">{stats.avgAttendance}</p>
                                <p className="text-xs text-white/85 mt-1">معدل الحضور</p>
                            </div>
                            <div className="rounded-2xl px-3 py-4 bg-white/15 backdrop-blur">
                                <p className="text-4xl font-black">{stats.suggestionsCount}</p>
                                <p className="text-xs text-white/85 mt-1">اقتراح</p>
                            </div>
                            {stats.mostKing && (
                                <div className="rounded-2xl px-3 py-3 bg-white/15 backdrop-blur col-span-2">
                                    <p className="text-xs text-white/70">👑 أكثر واحد كان ملك</p>
                                    <p className="text-lg font-bold">{stats.mostKing.name} <span className="text-sm opacity-80">({stats.mostKing.count} مرة)</span></p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-white/85 text-sm">يحمّل...</p>
                    )}
                    {onOpenStats && (
                        <button
                            onClick={onOpenStats}
                            className="mt-4 bg-white text-violet-700 font-black px-5 py-2 rounded-full text-sm hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                        >
                            افتح الإحصائيات الكاملة ↗
                        </button>
                    )}
                </div>
                <CaptionOverlay
                    username="stats_genius"
                    caption="أرقام تكلّم بنفسها 📈"
                    music={tracks[3]?.title}
                    artist={tracks[3]?.artist}
                />
                <ActionRail profile="📊" playing={!muted && audioReady} />
            </div>
        ),
    });

    // ── Suggestions card (inline input) ──
    cards.push({
        id: "suggest",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-pink-500 via-rose-600 to-red-700 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">💡</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">💡 صندوق الاقتراحات</p>
                    <p className="text-xs text-white/80 mb-4">للعميد فقط (مجهول)</p>
                    {suggestions.length > 0 && (
                        <div className="space-y-1.5 text-right mb-3">
                            {suggestions.slice(0, 3).map((s) => (
                                <div key={s.id} className="rounded-xl px-3 py-2 bg-white/15 backdrop-blur text-sm line-clamp-2">
                                    {s.text}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <input
                            value={suggestionText}
                            onChange={(e) => setSuggestionText(e.target.value)}
                            placeholder="اكتب اقتراحك..."
                            className="flex-1 bg-white/15 backdrop-blur border border-white/30 rounded-full px-4 py-2 text-white text-sm outline-none placeholder:text-white/60"
                            dir="rtl"
                        />
                        <button
                            onClick={sendSuggestion}
                            disabled={busy !== null || !suggestionText.trim()}
                            className="bg-white text-rose-700 font-black px-4 py-2 rounded-full text-sm disabled:opacity-50"
                        >
                            أرسل
                        </button>
                    </div>
                </div>
                <CaptionOverlay
                    username="suggestion_box"
                    caption="عندك فكرة؟ ارمها هنا 📝"
                    music={tracks[7]?.title}
                    artist={tracks[7]?.artist}
                />
                <ActionRail profile="💡" playing={!muted && audioReady} />
            </div>
        ),
    });

    // ── Future Features Voting card ──
    cards.push({
        id: "future",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-700 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">🔮</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🔮 ميزات المستقبل</p>
                    <p className="text-xs text-white/80 mb-4">صوّت لأي ميزة تبيها</p>
                    <div className="space-y-2 text-right">
                        {FUTURE_FEATURE_SEEDS.slice(0, 4).map((f) => (
                            <div key={f.id} className="rounded-2xl px-4 py-3 bg-white/15 backdrop-blur flex items-start gap-3">
                                <span className="text-2xl">{f.icon}</span>
                                <div className="flex-1 text-right">
                                    <p className="font-bold text-sm">{f.title}</p>
                                    <p className="text-[11px] text-white/75 line-clamp-2">{f.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-white/70 mt-3">افتح "المزيد" للتصويت الفعلي 👇</p>
                </div>
                <CaptionOverlay
                    username="future_features"
                    caption="وش تبي يصير في الموقع؟ 🔮"
                    music={tracks[2]?.title}
                    artist={tracks[2]?.artist}
                />
                <ActionRail profile="🔮" playing={!muted && audioReady} />
            </div>
        ),
    });

    // ── Impromptu meetup card (status) ──
    cards.push({
        id: "impromptu",
        render: () => (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-orange-500 via-red-600 to-pink-700 flex items-center justify-center">
                <span className="absolute opacity-10 text-[400px] select-none">🚨</span>
                <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                    <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🚨 أنا فاضي!</p>
                    <p className="text-xs text-white/80 mb-4">لقاء مفاجئ — اضغط لو تبي تطلع الحين</p>
                    <p className="text-base text-white/95 leading-relaxed bg-white/10 backdrop-blur rounded-2xl p-4">
                        لو فيه أكثر من ٢ ضغطوا "أنا فاضي" خلال ربع ساعة، إشعار يطلع للكل لتنسيق طلعة فجائية.
                    </p>
                    <p className="text-[11px] text-white/70 mt-4">افتح تبويب "الأسبوع" لتفعّل لقاء مفاجئ 👇</p>
                </div>
                <CaptionOverlay
                    username="impromptu_meet"
                    caption="مين فاضي ينطّ نطلع؟ 🏃‍♂️💨"
                    music={tracks[4]?.title}
                    artist={tracks[4]?.artist}
                />
                <ActionRail profile="🚨" playing={!muted && audioReady} />
            </div>
        ),
    });

    // ── Outing Planner card (CTA opens modal) ──
    if (onOpenPlanner) {
        cards.push({
            id: "planner",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-amber-500 via-yellow-600 to-orange-700 flex items-center justify-center">
                    <span className="absolute opacity-10 text-[400px] select-none">🤖</span>
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-1 drop-shadow-2xl">🤖 المخطّط الذكي</p>
                        <p className="text-xs text-white/80 mb-4">ذكاء اصطناعي يقترح لك مطعم</p>
                        <p className="text-base bg-white/10 backdrop-blur rounded-2xl p-4 leading-relaxed">
                            ١١,٣٨٤ مطعم في الرياض بالـ AI 🍔🍣🥙<br />
                            قول لي مود الجلسة وكم الميزانية، أعطيك أحسن ٣ خيارات.
                        </p>
                        <button
                            onClick={onOpenPlanner}
                            className="mt-4 bg-white text-orange-700 font-black px-5 py-2 rounded-full text-sm hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                        >
                            افتح المخطّط ✨
                        </button>
                    </div>
                    <CaptionOverlay
                        username="ai_planner"
                        caption="محتار وين تطلع؟ خلني اقترح 🤖"
                        music={tracks[5]?.title}
                        artist={tracks[5]?.artist}
                    />
                    <ActionRail profile="🤖" playing={!muted && audioReady} />
                </div>
            ),
        });
    }

    // ── Member Profile card (CTA opens modal) ──
    if (onOpenProfile) {
        cards.push({
            id: "profile",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-cyan-600 via-teal-700 to-emerald-800 flex items-center justify-center">
                    <span className="absolute opacity-10 text-[400px] select-none">👤</span>
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-1 drop-shadow-2xl">👤 ملفك الشخصي</p>
                        <p className="text-xs text-white/80 mb-4">تاريخك، أرقامك، إنجازاتك</p>
                        <div className="bg-white/15 backdrop-blur rounded-3xl p-5">
                            <p className="text-3xl font-black mb-2">{userName || "—"}</p>
                            <p className="text-xs text-white/80">شوف كل تفاصيل حضورك وتقييماتك ومواقفك كملك</p>
                        </div>
                        <button
                            onClick={onOpenProfile}
                            className="mt-4 bg-white text-teal-700 font-black px-5 py-2 rounded-full text-sm hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                        >
                            افتح ملفك 👤
                        </button>
                    </div>
                    <CaptionOverlay
                        username="my_profile"
                        caption="كل أرقامك في مكان واحد 📊"
                        music={tracks[1]?.title}
                        artist={tracks[1]?.artist}
                    />
                    <ActionRail profile="👤" playing={!muted && audioReady} />
                </div>
            ),
        });
    }

    // ── Constitution card (CTA opens modal) ──
    if (onOpenConstitution) {
        cards.push({
            id: "constitution",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-stone-700 via-stone-800 to-stone-900 flex items-center justify-center">
                    <span className="absolute opacity-10 text-[400px] select-none">📜</span>
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-1 drop-shadow-2xl">📜 دستور الجلسة</p>
                        <p className="text-xs text-white/80 mb-4">القوانين الذهبية</p>
                        <div className="bg-white/10 backdrop-blur border border-amber-400/30 rounded-3xl p-5 text-right">
                            <p className="text-sm leading-relaxed text-amber-100">
                                ١. الملك يدور كل أسبوع 👑<br />
                                ٢. التصويت اختياري<br />
                                ٣. الميزانية ١٧٥ ريال للشخص<br />
                                ٤. الخميس مقدّس<br />
                                ٥. لا اعتذار بدون عذر شرعي
                            </p>
                        </div>
                        <button
                            onClick={onOpenConstitution}
                            className="mt-4 bg-amber-400 text-stone-900 font-black px-5 py-2 rounded-full text-sm hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                        >
                            افتح الدستور الكامل 📜
                        </button>
                    </div>
                    <CaptionOverlay
                        username="constitution"
                        caption="قوانين الجلسة الذهبية 👑"
                        music={tracks[6]?.title}
                        artist={tracks[6]?.artist}
                    />
                    <ActionRail profile="📜" playing={!muted && audioReady} />
                </div>
            ),
        });
    }

    // ── Dean Dashboard card (DEAN ONLY) ──
    if (isDean) {
        cards.push({
            id: "dean",
            render: () => (
                <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-purple-700 via-fuchsia-700 to-pink-800 flex items-center justify-center">
                    <span className="absolute opacity-10 text-[400px] select-none">👔</span>
                    <div className="relative text-center text-white px-6 z-20 w-full max-w-md">
                        <p className="text-2xl font-bold mb-1 drop-shadow-2xl">👔 لوحة العميد</p>
                        <p className="text-xs text-white/80 mb-4">صلاحياتك المخفية</p>
                        <div className="bg-white/15 backdrop-blur rounded-3xl p-5 text-right">
                            <p className="text-sm leading-relaxed">
                                ⚙️ إدارة الدورة والأسابيع<br />
                                👑 تعيين/تغيير الملك سرّاً<br />
                                📊 إدارة التقييمات والإحصائيات<br />
                                📥 استيراد بيانات تاريخية<br />
                                🔧 أدوات صيانة الجلسة
                            </p>
                        </div>
                        <p className="text-[10px] text-white/70 mt-3">
                            افتح تبويب "المزيد" لكل أدوات العميد 👇
                        </p>
                    </div>
                    <CaptionOverlay
                        username="the_dean"
                        caption="أنت العميد — معاك المفاتيح 🗝️"
                        music={tracks[0]?.title}
                        artist={tracks[0]?.artist}
                    />
                    <ActionRail profile="👔" playing={!muted && audioReady} />
                </div>
            ),
        });
    }

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
                        onClick={(e) => handleCardTap(c.id, e)}
                        onTouchStart={(e) => handleCardTap(c.id, e)}
                        className="h-full w-full snap-start snap-always relative"
                        style={{ scrollSnapAlign: "start", height: "100dvh" }}
                    >
                        {c.render()}
                        {/* Persistent like indicator (corner) — appears once a card is liked */}
                        {likedCards[c.id] && (
                            <div className="absolute top-16 right-3 z-40 pointer-events-none animate-pulse">
                                <Heart className="w-7 h-7 text-red-500 fill-current drop-shadow-2xl" />
                            </div>
                        )}
                    </section>
                ))}
            </div>

            {/* Floating heart on double-tap */}
            {doubleTapHeart && (
                <div
                    className="absolute z-[60] pointer-events-none"
                    style={{
                        left: doubleTapHeart.x - 48,
                        top: doubleTapHeart.y - 48,
                        animation: "tt-heart-pop 900ms ease-out forwards",
                    }}
                >
                    <Heart className="w-24 h-24 text-red-500 fill-current drop-shadow-2xl" />
                </div>
            )}

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
