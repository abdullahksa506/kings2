"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    X, Copy, Crown, Users, Play, LogOut, Mic, MicOff, ShieldAlert,
    Swords, RefreshCw, Check, Coins, Eye, Volume2,
} from "lucide-react";
import {
    coupServices,
    PublicGameState,
    CoupHand,
    CoupVoicePresence,
    Character,
    ActionType,
    CHARACTER_AR,
    CHARACTER_EMOJI,
    CHARACTER_DESC,
    ACTION_AR,
    ACTION_BLOCKERS,
} from "@/lib/coupServices";
import { useCoupVoice } from "@/hooks/useCoupVoice";

interface CoupArenaProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
}

const REACTION_EMOJIS = ["😏", "😱", "🤔", "😂", "🔥", "🤥", "👀", "🤝"];
const ALL_CHARACTERS: Character[] = ["duke", "assassin", "captain", "ambassador", "contessa"];

const PHASE_LABEL: Record<string, string> = {
    awaitChallenge: "نافذة التحدّي؟؟ ⚔️✨",
    awaitBlock: "نافذة الصدّ؟؟ 🛡️✨",
    awaitBlockChallenge: "تحدّي الصدّ؟؟ 🤺💥",
    loseInfluence: "خسارة ورقه؟؟ 😅💔",
    exchange: "تبدييل أوراق؟؟ 🔄✨",
};

function RemoteAudio({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.srcObject = stream;
        el.muted = false;
        el.volume = 1;
        const tryPlay = () => el.play().catch(() => {});
        tryPlay();
        // Browsers may block autoplay until a user gesture — retry on next interaction.
        const onInteract = () => tryPlay();
        document.addEventListener("click", onInteract);
        document.addEventListener("touchstart", onInteract);
        return () => {
            document.removeEventListener("click", onInteract);
            document.removeEventListener("touchstart", onInteract);
        };
    }, [stream]);
    return <audio ref={ref} autoPlay playsInline />;
}

export default function CoupArena({ isOpen, onClose, userName }: CoupArenaProps) {
    const [roomId, setRoomId] = useState<string | null>(null);
    const [room, setRoom] = useState<PublicGameState | null>(null);
    const [hand, setHand] = useState<CoupHand | null>(null);
    const [openRooms, setOpenRooms] = useState<PublicGameState[]>([]);
    const [voicePresence, setVoicePresence] = useState<CoupVoicePresence[]>([]);
    const [joinCode, setJoinCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [targetingAction, setTargetingAction] = useState<ActionType | null>(null);
    const [exchangeSel, setExchangeSel] = useState<number[]>([]);
    const [nowTs, setNowTs] = useState(Date.now());

    // Restore room on mount.
    useEffect(() => {
        if (!isOpen) return;
        const saved = typeof window !== "undefined" ? localStorage.getItem("coup_room_id") : null;
        if (saved) setRoomId(saved);
    }, [isOpen]);

    // Browse open rooms while in the lobby.
    useEffect(() => {
        if (!isOpen || roomId) return;
        return coupServices.listenToOpenRooms(setOpenRooms);
    }, [isOpen, roomId]);

    // Listen to the active room.
    useEffect(() => {
        if (!roomId) {
            setRoom(null);
            return;
        }
        localStorage.setItem("coup_room_id", roomId);
        const unsub = coupServices.listenToRoom(roomId, (state) => {
            if (!state) {
                setRoom(null);
                setRoomId(null);
                localStorage.removeItem("coup_room_id");
                return;
            }
            setRoom(state);
        });
        const unsubVoice = coupServices.listenToVoice(roomId, setVoicePresence);
        return () => {
            unsub();
            unsubVoice();
        };
    }, [roomId]);

    // Fetch my private hand whenever the game state changes.
    useEffect(() => {
        if (!roomId || room?.status !== "playing") {
            setHand(null);
            return;
        }
        let cancelled = false;
        coupServices.getHand(roomId).then((h) => !cancelled && setHand(h)).catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [roomId, room?.status, room?.version]);

    // Countdown ticker.
    useEffect(() => {
        if (!isOpen) return;
        const t = setInterval(() => setNowTs(Date.now()), 500);
        return () => clearInterval(t);
    }, [isOpen]);

    // Self-healing: nudge the server to process an expired window.
    useEffect(() => {
        if (!roomId || !room?.deadline) return;
        const remaining = room.deadline - Date.now();
        const myIdx = room.players.findIndex((p) => p.name === userName);
        const jitter = 400 + (myIdx < 0 ? 0 : myIdx) * 300;
        const t = setTimeout(() => {
            coupServices.tick(roomId).catch(() => {});
        }, Math.max(0, remaining) + jitter);
        return () => clearTimeout(t);
    }, [roomId, room?.deadline, room?.version, userName, room?.players]);

    // Reset exchange selection when exchange ends.
    useEffect(() => {
        if (room?.phase !== "exchange" || room?.pendingExchange?.player !== userName) setExchangeSel([]);
    }, [room?.phase, room?.pendingExchange?.player, userName]);

    const inRoom = !!room && room.players.some((p) => p.name === userName);
    const voicePeers = useMemo(
        () => voicePresence.filter((v) => v.joined && v.name !== userName).map((v) => v.name),
        [voicePresence, userName],
    );
    const voice = useCoupVoice(roomId, userName, voicePeers);

    const run = async (fn: () => Promise<any>) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (e: any) {
            setError(e?.message || "أحسس صار خطأ؟؟ 😅💥 والله شوف مدري 🤷✨");
        } finally {
            setBusy(false);
        }
    };

    const handleLeave = async () => {
        voice.leave();
        const rid = roomId;
        setRoomId(null);
        setRoom(null);
        localStorage.removeItem("coup_room_id");
        if (rid) await coupServices.leaveRoom(rid).catch(() => {});
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto" dir="rtl">
            {/* hidden remote audios */}
            {Object.entries(voice.remoteStreams).map(([name, stream]) => (
                <RemoteAudio key={name} stream={stream} />
            ))}

            <div className="max-w-2xl mx-auto p-3 md:p-5 min-h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-rose-500/20 p-2 rounded-xl text-rose-400">
                            <Swords className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Coup — انقلاب؟؟ ⚔️👑✨</h2>
                    </div>
                    <button
                        onClick={() => {
                            voice.leave();
                            onClose();
                        }}
                        className="text-slate-400 hover:text-white p-2"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {error && (
                    <div className="mb-3 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm rounded-xl px-4 py-2">
                        {error}
                    </div>
                )}

                {!inRoom && LobbyView()}
                {inRoom && room!.status === "lobby" && RoomLobbyView()}
                {inRoom && room!.status === "playing" && GameView()}
                {inRoom && room!.status === "finished" && GameOverView()}
            </div>
        </div>
    );

    // ---------------- Lobby (no room) ----------------
    function LobbyView() {
        return (
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-rose-900/30 to-slate-900 border border-rose-500/20 rounded-2xl p-5">
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                        والله شوف لعبة خداع وذكاء لـ 2-4 لاعبيين؟؟ ادّعِ الشخصيات، اكذب، وتحدّى خصومك يعني! 🎭✨
                        آخر لاعب يحتفظ بورقه يفووز 🏆💥 تكلموا بالصوت داخل اللعبه عشان الكذب يصير واقعي أحس 🤥🔊
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            disabled={busy}
                            onClick={() =>
                                run(async () => {
                                    const { roomId: rid } = await coupServices.createRoom();
                                    setRoomId(rid);
                                })
                            }
                            className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5 fill-current" /> إنشاء غرفه جديده؟؟ 🎮✨ لو تبي
                        </button>
                        <div className="flex gap-2">
                            <input
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="رمز الغرفه؟؟ 🔑✨"
                                maxLength={6}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center tracking-widest font-mono"
                            />
                            <button
                                disabled={busy || joinCode.length < 4}
                                onClick={() =>
                                    run(async () => {
                                        await coupServices.joinRoom(joinCode);
                                        setRoomId(joinCode);
                                        setJoinCode("");
                                    })
                                }
                                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-5 rounded-xl"
                            >
                                دخوول؟؟ 🚀💥
                            </button>
                        </div>
                    </div>
                </div>

                {openRooms.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-slate-400 text-sm font-bold px-1">غرف مفتووحه؟؟ 🚪✨ والله شوف</h3>
                        {openRooms.map((r) => {
                            const mine = r.players.some((p) => p.name === userName);
                            return (
                                <div
                                    key={r.roomId}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-amber-400 tracking-widest">{r.roomId}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                                {r.status === "lobby" ? "بالانتظاار ⏳" : "تلعب الحيين؟؟ 🎮💥"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {r.players.map((p) => p.name).join("، ")} ({r.players.length}/4)
                                        </p>
                                    </div>
                                    <button
                                        disabled={busy || (!mine && (r.status !== "lobby" || r.players.length >= 4))}
                                        onClick={() =>
                                            run(async () => {
                                                if (!mine) await coupServices.joinRoom(r.roomId);
                                                setRoomId(r.roomId);
                                            })
                                        }
                                        className="bg-rose-500/90 hover:bg-rose-400 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm"
                                    >
                                        {mine ? "العوده؟؟ 🔙" : "انضمامم؟؟ 🚀💥"}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {CharacterGuide()}
            </div>
        );
    }

    // ---------------- Room lobby (waiting) ----------------
    function RoomLobbyView() {
        const isHost = room!.hostName === userName;
        return (
            <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
                    <p className="text-slate-400 text-sm mb-1">رمز الغرفه؟؟ — شاركه مع الشباب 🔑📤✨</p>
                    <button
                        onClick={() => navigator.clipboard?.writeText(room!.roomId)}
                        className="inline-flex items-center gap-2 text-3xl font-mono font-bold text-amber-400 tracking-[0.3em]"
                    >
                        {room!.roomId} <Copy className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3 text-slate-300">
                        <Users className="w-5 h-5" /> <span className="font-bold">اللاعبوون؟؟ ({room!.players.length}/4) 👥✨</span>
                    </div>
                    <div className="space-y-2">
                        {room!.players.map((p) => (
                            <div key={p.name} className="flex items-center justify-between bg-slate-950/50 rounded-xl px-4 py-2">
                                <span className="text-white font-semibold">{p.name}</span>
                                {p.isHost && (
                                    <span className="flex items-center gap-1 text-xs text-amber-400">
                                        <Crown className="w-4 h-4" /> المضييف 👑
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {VoiceBar()}

                <div className="flex gap-2">
                    {isHost ? (
                        <button
                            disabled={busy || room!.players.length < 2}
                            onClick={() => run(() => coupServices.startGame(room!.roomId))}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            {room!.players.length < 2 ? "بانتظاار لاعب آخر... ⏳" : "ابدأ اللعبه؟؟ 🎮✨"}
                        </button>
                    ) : (
                        <div className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl text-center text-sm">
                            بانتظاار المضيف ليبدأ... ⏳👑✨
                        </div>
                    )}
                    <button onClick={handleLeave} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 rounded-xl">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {CharacterGuide()}
            </div>
        );
    }

    // ---------------- In-game ----------------
    function GameView() {
        const me = room!.players.find((p) => p.name === userName)!;
        const isMyTurn = room!.currentPlayer === userName && room!.phase === "turn";
        const opponents = room!.players.filter((p) => p.name !== userName);
        const remaining = room!.deadline ? Math.max(0, Math.ceil((room!.deadline - nowTs) / 1000)) : null;

        return (
            <div className="space-y-3 pb-28">
                {/* Phase / timer banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                    <div className="text-sm">
                        <span className="text-slate-400">المرحله؟؟: </span>
                        <span className="text-white font-bold">
                            {room!.phase === "turn" ? `دور ${room!.currentPlayer}` : PHASE_LABEL[room!.phase] || room!.phase}
                        </span>
                    </div>
                    {remaining !== null && (
                        <div className={`text-sm font-mono font-bold ${remaining <= 5 ? "text-rose-400" : "text-slate-300"}`}>
                            ⏱ {remaining}s
                        </div>
                    )}
                </div>

                {/* Opponents */}
                <div className="grid grid-cols-1 gap-2">
                    {opponents.map((p) => (
                        <div key={p.name}>
                            {PlayerSeat({
                                player: p,
                                isCurrent: room!.currentPlayer === p.name,
                                clickableTarget: !!targetingAction && !p.eliminated,
                                onTarget: () => doTargeted(p.name),
                            })}
                        </div>
                    ))}
                </div>

                {/* Action log */}
                {ActionLog()}

                {/* My area */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-white flex items-center gap-2">
                            {me.name} {me.eliminated && <span className="text-rose-400 text-sm">(خرجت)</span>}
                        </span>
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <Coins className="w-4 h-4" /> {me.coins}
                        </span>
                    </div>
                    <div className="flex gap-2 justify-center">
                        {hand?.influence.map((inf, i) => (
                            <div
                                key={i}
                                className={`flex-1 max-w-[120px] rounded-xl p-3 text-center border-2 ${
                                    inf.revealed
                                        ? "bg-slate-800/50 border-slate-700 opacity-50"
                                        : "bg-gradient-to-br from-amber-500/20 to-rose-500/10 border-amber-500/40"
                                }`}
                            >
                                <div className="text-2xl">{CHARACTER_EMOJI[inf.character]}</div>
                                <div className="text-xs font-bold text-white mt-1">{CHARACTER_AR[inf.character]}</div>
                                {inf.revealed && <div className="text-[10px] text-rose-400 mt-0.5">مكشوفة</div>}
                            </div>
                        ))}
                        {!hand && <div className="text-slate-500 text-sm py-4">جاري تحميل أوراقك...</div>}
                    </div>
                </div>

                {/* Action bar / response panel */}
                {isMyTurn && !me.eliminated && ActionBar({ me })}
                {ResponsePanel()}
                {LoseInfluencePanel()}
                {ExchangePanel()}

                {/* Reactions */}
                {ReactionBar()}

                {/* Voice + leave */}
                <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-slate-800 p-3">
                    <div className="max-w-2xl mx-auto flex items-center gap-2">
                        {VoiceControls()}
                        <button onClick={handleLeave} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-sm">
                            انسحاب
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    function GameOverView() {
        const won = room!.winner === userName;
        return (
            <div className="space-y-4 text-center py-8">
                <div className="text-6xl">{won ? "🏆" : "🎭"}</div>
                <h3 className="text-2xl font-bold text-white">
                    {room!.winner ? `${room!.winner} فاز باللعبة!` : "انتهت اللعبة"}
                </h3>
                {won && <p className="text-amber-400">مبروك! 👑</p>}
                {ActionLog()}
                <button
                    onClick={handleLeave}
                    className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-3 px-8 rounded-xl inline-flex items-center gap-2"
                >
                    <RefreshCw className="w-5 h-5" /> الخروج للوبي
                </button>
            </div>
        );
    }

    // ---------------- sub-components ----------------

    function PlayerSeat({
        player,
        isCurrent,
        clickableTarget,
        onTarget,
    }: {
        player: PublicGameState["players"][number];
        isCurrent: boolean;
        clickableTarget: boolean;
        onTarget: () => void;
    }) {
        const voiceP = voicePresence.find((v) => v.name === player.name);
        return (
            <button
                disabled={!clickableTarget}
                onClick={onTarget}
                className={`text-right w-full rounded-xl p-3 border transition-all ${
                    player.eliminated
                        ? "bg-slate-900/40 border-slate-800 opacity-50"
                        : isCurrent
                        ? "bg-amber-500/10 border-amber-500/50"
                        : "bg-slate-900 border-slate-800"
                } ${clickableTarget ? "ring-2 ring-rose-500/60 cursor-pointer hover:bg-rose-500/10" : "cursor-default"}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{player.name}</span>
                        {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                        {isCurrent && !player.eliminated && <span className="text-[10px] text-amber-400">● دوره</span>}
                        {voiceP?.joined && (
                            voiceP.muted ? <MicOff className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {player.eliminated && <span className="text-xs text-rose-400">خرج</span>}
                    </div>
                    <span className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                        <Coins className="w-3.5 h-3.5" /> {player.coins}
                    </span>
                </div>
                <div className="flex gap-1.5 mt-2">
                    {player.influence.map((slot, i) => (
                        <div
                            key={i}
                            className={`w-9 h-12 rounded-md flex items-center justify-center text-lg border ${
                                slot.revealed
                                    ? "bg-rose-950/40 border-rose-500/40"
                                    : "bg-gradient-to-br from-indigo-600/40 to-slate-800 border-indigo-500/30"
                            }`}
                        >
                            {slot.revealed ? CHARACTER_EMOJI[slot.character] : "🂠"}
                        </div>
                    ))}
                </div>
            </button>
        );
    }

    function ActionBar({ me }: { me: PublicGameState["players"][number] }) {
        const mustCoup = me.coins >= 10;
        const btn = (type: ActionType, label: string, hint: string, enabled: boolean, targeted: boolean) => (
            <button
                key={type}
                disabled={busy || !enabled}
                onClick={() => (targeted ? setTargetingAction(type) : doAction(type))}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl p-2.5 text-center"
            >
                <div className="text-sm font-bold text-white">{label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{hint}</div>
            </button>
        );

        if (targetingAction) {
            return (
                <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-3 text-center">
                    <p className="text-rose-200 text-sm mb-2">اختر هدفًا لـ «{ACTION_AR[targetingAction]}» من اللاعبين بالأعلى</p>
                    <button onClick={() => setTargetingAction(null)} className="text-slate-400 text-sm underline">
                        إلغاء
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                <p className="text-xs text-slate-400 mb-2 text-center">دورك — اختر إجراءً</p>
                <div className="grid grid-cols-3 gap-2">
                    {btn("income", "دخل", "+1 ذهب", !mustCoup, false)}
                    {btn("foreign_aid", "معونة", "+2 (يُصد)", !mustCoup, false)}
                    {btn("tax", "ضريبة 👑", "+3 دوق", !mustCoup, false)}
                    {btn("steal", "سرقة ⚓", "+2 كابتن", !mustCoup, true)}
                    {btn("exchange", "تبديل 🎭", "سفير", !mustCoup, false)}
                    {btn("assassinate", "اغتيال 🗡️", "-3 ذهب", me.coins >= 3 && !mustCoup, true)}
                    {btn("coup", "انقلاب", "-7 ذهب", me.coins >= 7, true)}
                </div>
                {mustCoup && <p className="text-rose-400 text-xs text-center mt-2">معك 10+ ذهب — يجب تنفيذ انقلاب</p>}
            </div>
        );
    }

    function ResponsePanel() {
        if (!room || !room.pending) return null;
        const pa = room.pending;
        const me = room.players.find((p) => p.name === userName);
        if (!me || me.eliminated) return null;

        const passed = pa.passed.includes(userName);

        // Challenge windows
        if (room.phase === "awaitChallenge" || room.phase === "awaitBlockChallenge") {
            const subject = room.phase === "awaitChallenge" ? pa.actor : pa.block?.blocker;
            if (subject === userName) {
                return WaitingNote({ text: "بانتظار رد الخصوم على ادعائك..." });
            }
            if (passed) return WaitingNote({ text: "مرّرت — بانتظار الآخرين" });
            const claim =
                room.phase === "awaitChallenge"
                    ? pa.claimedCharacter
                    : pa.block?.claimedCharacter;
            return (
                <div className="bg-indigo-500/10 border border-indigo-500/40 rounded-2xl p-3">
                    <p className="text-sm text-indigo-100 mb-2 text-center">
                        {subject} يدّعي أنه <b>{claim ? CHARACTER_AR[claim] : "?"}</b>
                        {room.phase === "awaitChallenge" ? ` (${ACTION_AR[pa.type]})` : " ليصدّ"} — تصدّقه؟
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={busy}
                            onClick={() => doRespond("challenge")}
                            className="flex-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1"
                        >
                            <ShieldAlert className="w-4 h-4" /> تحدّي!
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => doRespond("pass")}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl"
                        >
                            تمرير
                        </button>
                    </div>
                </div>
            );
        }

        // Block window
        if (room.phase === "awaitBlock") {
            const blockers = ACTION_BLOCKERS[pa.type];
            const eligible =
                pa.type === "foreign_aid"
                    ? pa.actor !== userName
                    : pa.target === userName;
            if (pa.actor === userName) return WaitingNote({ text: "بانتظار رد الخصوم..." });
            if (!eligible) return WaitingNote({ text: `بانتظار ${pa.type === "foreign_aid" ? "اللاعبين" : pa.target}...` });
            if (passed) return WaitingNote({ text: "مرّرت — بانتظار الآخرين" });
            return (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3">
                    <p className="text-sm text-amber-100 mb-2 text-center">
                        {pa.actor} ينفّذ «{ACTION_AR[pa.type]}»{pa.target ? ` عليك` : ""} — تريد الصدّ؟
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {blockers.map((c) => (
                            <button
                                key={c}
                                disabled={busy}
                                onClick={() => doRespond("block", c)}
                                className="flex-1 min-w-[120px] bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-2.5 rounded-xl text-sm"
                            >
                                صدّ بـ {CHARACTER_EMOJI[c]} {CHARACTER_AR[c]}
                            </button>
                        ))}
                        <button
                            disabled={busy}
                            onClick={() => doRespond("pass")}
                            className="flex-1 min-w-[100px] bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl"
                        >
                            تمرير
                        </button>
                    </div>
                </div>
            );
        }

        return null;
    }

    function LoseInfluencePanel() {
        if (room?.phase !== "loseInfluence" || room.pendingLose?.player !== userName) return null;
        const live = (hand?.influence || []).filter((i) => !i.revealed);
        return (
            <div className="bg-rose-500/15 border border-rose-500/40 rounded-2xl p-4">
                <p className="text-rose-100 font-bold text-center mb-1">اخترت ورقة لتخسرها</p>
                <p className="text-xs text-rose-300/80 text-center mb-3">السبب: {room.pendingLose?.reason}</p>
                <div className="flex gap-2 justify-center">
                    {live.map((inf, i) => (
                        <button
                            key={i}
                            disabled={busy}
                            onClick={() => doResolveLose(i)}
                            className="flex-1 max-w-[130px] bg-slate-800 hover:bg-rose-500/30 border border-slate-700 hover:border-rose-500 rounded-xl p-3 text-center"
                        >
                            <div className="text-2xl">{CHARACTER_EMOJI[inf.character]}</div>
                            <div className="text-xs font-bold text-white mt-1">{CHARACTER_AR[inf.character]}</div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    function ExchangePanel() {
        if (room?.phase !== "exchange" || room.pendingExchange?.player !== userName) return null;
        const options = hand?.exchangeOptions || [];
        const keepCount = hand?.exchangeKeepCount || 0;
        const toggle = (i: number) => {
            setExchangeSel((prev) => {
                if (prev.includes(i)) return prev.filter((x) => x !== i);
                if (prev.length >= keepCount) return prev;
                return [...prev, i];
            });
        };
        return (
            <div className="bg-indigo-500/15 border border-indigo-500/40 rounded-2xl p-4">
                <p className="text-indigo-100 font-bold text-center mb-1">التبديل (السفير)</p>
                <p className="text-xs text-indigo-300/80 text-center mb-3">اختر {keepCount} ورقة للاحتفاظ بها</p>
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                    {options.map((c, i) => {
                        const sel = exchangeSel.includes(i);
                        return (
                            <button
                                key={i}
                                onClick={() => toggle(i)}
                                className={`w-24 rounded-xl p-3 text-center border-2 ${
                                    sel ? "bg-emerald-500/20 border-emerald-500" : "bg-slate-800 border-slate-700"
                                }`}
                            >
                                <div className="text-2xl">{CHARACTER_EMOJI[c]}</div>
                                <div className="text-xs font-bold text-white mt-1">{CHARACTER_AR[c]}</div>
                                {sel && <Check className="w-4 h-4 text-emerald-400 mx-auto mt-1" />}
                            </button>
                        );
                    })}
                </div>
                <button
                    disabled={busy || exchangeSel.length !== keepCount}
                    onClick={() => doResolveExchange()}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold py-2.5 rounded-xl"
                >
                    تأكيد ({exchangeSel.length}/{keepCount})
                </button>
            </div>
        );
    }

    function ReactionBar() {
        const recent = (room?.reactions || []).filter((r) => nowTs - r.atMs < 5000);
        return (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-2">
                {recent.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 justify-center">
                        {recent.map((r) => (
                            <span key={r.id} className="text-sm bg-slate-800 rounded-full px-2 py-0.5">
                                {r.emoji} <span className="text-slate-400 text-xs">{r.player}</span>
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex gap-1 justify-center flex-wrap">
                    {REACTION_EMOJIS.map((e) => (
                        <button
                            key={e}
                            onClick={() => coupServices.reaction(room!.roomId, e).catch(() => {})}
                            className="text-xl hover:scale-125 transition-transform p-1"
                        >
                            {e}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    function ActionLog() {
        const log = room?.log || [];
        return (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 max-h-32 overflow-y-auto">
                <div className="space-y-1">
                    {log.slice(-8).reverse().map((e, i) => (
                        <p
                            key={i}
                            className={`text-xs ${
                                e.kind === "win"
                                    ? "text-amber-400 font-bold"
                                    : e.kind === "challenge"
                                    ? "text-rose-300"
                                    : e.kind === "block"
                                    ? "text-indigo-300"
                                    : e.kind === "reveal"
                                    ? "text-fuchsia-300"
                                    : "text-slate-400"
                            }`}
                        >
                            {e.text}
                        </p>
                    ))}
                </div>
            </div>
        );
    }

    function VoiceBar() {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-sm text-slate-300 flex items-center gap-2">
                    <Mic className="w-4 h-4" /> الدردشة الصوتية
                </span>
                {VoiceControls()}
            </div>
        );
    }

    function VoiceControls() {
        if (!voice.joined) {
            return (
                <button
                    disabled={voice.connecting}
                    onClick={() => voice.join()}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1"
                >
                    <Mic className="w-4 h-4" /> {voice.connecting ? "..." : "دخول الصوت"}
                </button>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={voice.toggleMute}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 ${
                        voice.muted ? "bg-slate-700 text-slate-300" : "bg-emerald-500 text-slate-950"
                    }`}
                >
                    {voice.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {voice.muted ? "مكتوم" : "مفتوح"}
                </button>
                <button onClick={voice.leave} className="bg-slate-800 text-slate-400 px-3 py-2 rounded-xl text-sm">
                    خروج
                </button>
            </div>
        );
    }

    function WaitingNote({ text }: { text: string }) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center text-sm text-slate-400">
                {text}
            </div>
        );
    }

    function CharacterGuide() {
        return (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3 text-slate-300">
                    <Eye className="w-4 h-4" /> <span className="font-bold text-sm">الشخصيات</span>
                </div>
                <div className="space-y-2">
                    {ALL_CHARACTERS.map((c) => (
                        <div key={c} className="flex items-start gap-2 text-xs">
                            <span className="text-lg">{CHARACTER_EMOJI[c]}</span>
                            <div>
                                <span className="font-bold text-white">{CHARACTER_AR[c]}</span>
                                <span className="text-slate-400"> — {CHARACTER_DESC[c]}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ---------------- action handlers ----------------
    function doAction(type: ActionType, target?: string) {
        run(() => coupServices.action(room!.roomId, type, target));
    }
    function doTargeted(target: string) {
        const t = targetingAction;
        setTargetingAction(null);
        if (t) run(() => coupServices.action(room!.roomId, t, target));
    }
    function doRespond(response: "pass" | "challenge" | "block", blockCharacter?: Character) {
        run(() => coupServices.respond(room!.roomId, response, blockCharacter));
    }
    function doResolveLose(cardIndex: number) {
        run(() => coupServices.resolveLose(room!.roomId, cardIndex));
    }
    function doResolveExchange() {
        run(() => coupServices.resolveExchange(room!.roomId, exchangeSel));
    }
}
