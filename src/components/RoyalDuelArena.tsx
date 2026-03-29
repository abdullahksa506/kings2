"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Swords, Users, X, Bot, Copy, RefreshCw } from "lucide-react";
import {
    DuelCardId,
    DuelDeployCommand,
    DuelLane,
    DuelPlayerSlot,
    DuelRoomState,
    DuelUnit,
    royaleDuelServices,
} from "@/lib/royaleDuelServices";

type CardDef = {
    id: DuelCardId;
    name: string;
    cost: number;
    colorClass: string;
    desc: string;
};

const CARD_DEFS: CardDef[] = [
    { id: "raider", name: "مغير", cost: 3, colorClass: "from-amber-500 to-orange-500", desc: "هجومي سريع" },
    { id: "archer", name: "رامي", cost: 4, colorClass: "from-cyan-500 to-blue-500", desc: "بعيد المدى" },
    { id: "tank", name: "دبابة", cost: 5, colorClass: "from-emerald-500 to-lime-500", desc: "دم عالي" },
    { id: "spell", name: "برق", cost: 4, colorClass: "from-fuchsia-500 to-violet-500", desc: "ضربة فورية" },
];

const laneTowerX = {
    p1: 12,
    p2: 88,
    kingP1: 5,
    kingP2: 95,
};

const makeUnitFromCard = (command: DuelDeployCommand): DuelUnit | null => {
    if (command.cardId === "spell") return null;

    if (command.cardId === "raider") {
        return {
            id: command.id,
            owner: command.by,
            cardId: "raider",
            lane: command.lane,
            x: command.by === "p1" ? 20 : 80,
            hp: 380,
            maxHp: 380,
            speed: 1.65,
            damage: 85,
            range: 5,
            cooldownMs: 650,
            lastAttackAt: 0,
        };
    }

    if (command.cardId === "archer") {
        return {
            id: command.id,
            owner: command.by,
            cardId: "archer",
            lane: command.lane,
            x: command.by === "p1" ? 20 : 80,
            hp: 300,
            maxHp: 300,
            speed: 1.3,
            damage: 72,
            range: 16,
            cooldownMs: 900,
            lastAttackAt: 0,
        };
    }

    return {
        id: command.id,
        owner: command.by,
        cardId: "tank",
        lane: command.lane,
        x: command.by === "p1" ? 20 : 80,
        hp: 760,
        maxHp: 760,
        speed: 0.9,
        damage: 120,
        range: 5,
        cooldownMs: 1100,
        lastAttackAt: 0,
    };
};

const getCrownCount = (state: DuelRoomState, slot: DuelPlayerSlot) => {
    const enemy = slot === "p1" ? state.players.p2 : state.players.p1;
    if (!enemy) return 0;

    let crowns = 0;
    if (enemy.towers.lane0.hp <= 0) crowns += 1;
    if (enemy.towers.lane1.hp <= 0) crowns += 1;
    if (enemy.towers.king.hp <= 0) crowns += 3;
    return crowns;
};

const evaluateWinner = (state: DuelRoomState): DuelPlayerSlot | "draw" => {
    const p1 = state.players.p1;
    const p2 = state.players.p2;
    if (!p2) return "draw";

    const p1KingDead = p1.towers.king.hp <= 0;
    const p2KingDead = p2.towers.king.hp <= 0;

    if (p1KingDead && p2KingDead) return "draw";
    if (p1KingDead) return "p2";
    if (p2KingDead) return "p1";

    const p1Crowns = getCrownCount(state, "p1");
    const p2Crowns = getCrownCount(state, "p2");
    if (p1Crowns > p2Crowns) return "p1";
    if (p2Crowns > p1Crowns) return "p2";

    const p1Hp = p1.towers.king.hp + p1.towers.lane0.hp + p1.towers.lane1.hp;
    const p2Hp = p2.towers.king.hp + p2.towers.lane0.hp + p2.towers.lane1.hp;
    if (p1Hp > p2Hp) return "p1";
    if (p2Hp > p1Hp) return "p2";

    return "draw";
};

const cloneState = (state: DuelRoomState): DuelRoomState => JSON.parse(JSON.stringify(state)) as DuelRoomState;

const simulateStep = (state: DuelRoomState, now: number): DuelRoomState => {
    const next = cloneState(state);
    const p1 = next.players.p1;
    const p2 = next.players.p2;

    if (!p2) {
        next.status = "waiting";
        next.lastHostTickMs = now;
        return next;
    }

    if (!next.startedAtMs) {
        next.startedAtMs = now;
        next.status = "playing";
    }

    if (next.status !== "playing") {
        next.lastHostTickMs = now;
        return next;
    }

    const regen = (player: typeof p1) => {
        const elapsed = now - player.lastElixirAt;
        if (elapsed < 1000) return;
        const add = Math.floor(elapsed / 1000);
        player.elixir = Math.min(10, player.elixir + add);
        player.lastElixirAt += add * 1000;
    };

    regen(p1);
    regen(p2);

    const queue = [...next.queue].sort((a, b) => a.createdAt - b.createdAt);
    next.queue = [];

    for (const cmd of queue) {
        const me = cmd.by === "p1" ? p1 : p2;
        const cost = CARD_DEFS.find((card) => card.id === cmd.cardId)?.cost ?? 99;
        if (me.elixir < cost) continue;
        me.elixir -= cost;

        if (cmd.cardId === "spell") {
            const enemy = cmd.by === "p1" ? p2 : p1;
            const laneTower = cmd.lane === 0 ? enemy.towers.lane0 : enemy.towers.lane1;
            if (laneTower.hp > 0) {
                laneTower.hp = Math.max(0, laneTower.hp - 220);
            } else {
                enemy.towers.king.hp = Math.max(0, enemy.towers.king.hp - 160);
            }
            continue;
        }

        const unit = makeUnitFromCard(cmd);
        if (unit) next.units.push(unit);
    }

    if (next.mode === "bot") {
        const botReady = now - p2.lastElixirAt > 3000;
        if (botReady && p2.elixir >= 3) {
            const available = CARD_DEFS.filter((c) => c.cost <= p2.elixir);
            const picked = available[Math.floor(Math.random() * available.length)];
            const botCmd: DuelDeployCommand = {
                id: `bot_${now}_${Math.random().toString(36).slice(2, 7)}`,
                by: "p2",
                cardId: picked.id,
                lane: Math.random() > 0.5 ? 1 : 0,
                createdAt: now,
            };
            next.queue.push(botCmd);
        }
    }

    const unitDamage = new Map<string, number>();

    const addDamageToUnit = (unitId: string, damage: number) => {
        unitDamage.set(unitId, (unitDamage.get(unitId) ?? 0) + damage);
    };

    const unitsByLane = (lane: DuelLane) => next.units.filter((u) => u.lane === lane);

    for (const lane of [0, 1] as DuelLane[]) {
        const laneUnits = unitsByLane(lane);

        for (const unit of laneUnits) {
            const dir = unit.owner === "p1" ? 1 : -1;
            const enemies = laneUnits.filter((x) => x.owner !== unit.owner);
            const closestEnemy = enemies
                .map((e) => ({ e, dist: Math.abs(e.x - unit.x) }))
                .sort((a, b) => a.dist - b.dist)[0];

            const canAttack = now - unit.lastAttackAt >= unit.cooldownMs;

            if (closestEnemy && closestEnemy.dist <= unit.range) {
                if (canAttack) {
                    addDamageToUnit(closestEnemy.e.id, unit.damage);
                    unit.lastAttackAt = now;
                }
                continue;
            }

            const enemyPlayer = unit.owner === "p1" ? p2 : p1;
            const enemyTower = lane === 0 ? enemyPlayer.towers.lane0 : enemyPlayer.towers.lane1;
            const targetX = enemyTower.hp > 0
                ? unit.owner === "p1" ? laneTowerX.p2 : laneTowerX.p1
                : unit.owner === "p1" ? laneTowerX.kingP2 : laneTowerX.kingP1;
            const towerDist = Math.abs(targetX - unit.x);

            if (towerDist <= unit.range && canAttack) {
                if (enemyTower.hp > 0) {
                    enemyTower.hp = Math.max(0, enemyTower.hp - unit.damage);
                } else {
                    enemyPlayer.towers.king.hp = Math.max(0, enemyPlayer.towers.king.hp - unit.damage);
                }
                unit.lastAttackAt = now;
                continue;
            }

            unit.x += dir * unit.speed;
            unit.x = Math.max(0, Math.min(100, unit.x));
        }
    }

    const towerFire = (
        owner: DuelPlayerSlot,
        lane: DuelLane | "king",
        range: number,
        damage: number,
        cooldownMs: number,
        xPos: number
    ) => {
        const player = owner === "p1" ? p1 : p2;
        const tower = lane === "king"
            ? player.towers.king
            : lane === 0
                ? player.towers.lane0
                : player.towers.lane1;

        if (tower.hp <= 0) return;
        if (now - tower.lastAttackAt < cooldownMs) return;

        const enemies = next.units.filter((u) => u.owner !== owner && (lane === "king" || u.lane === lane));
        const nearest = enemies
            .map((u) => ({ u, dist: Math.abs(u.x - xPos) }))
            .sort((a, b) => a.dist - b.dist)[0];

        if (!nearest || nearest.dist > range) return;

        addDamageToUnit(nearest.u.id, damage);
        tower.lastAttackAt = now;
    };

    towerFire("p1", 0, 22, 82, 950, laneTowerX.p1);
    towerFire("p1", 1, 22, 82, 950, laneTowerX.p1);
    towerFire("p1", "king", 26, 95, 900, laneTowerX.kingP1);

    towerFire("p2", 0, 22, 82, 950, laneTowerX.p2);
    towerFire("p2", 1, 22, 82, 950, laneTowerX.p2);
    towerFire("p2", "king", 26, 95, 900, laneTowerX.kingP2);

    for (const u of next.units) {
        const taken = unitDamage.get(u.id) ?? 0;
        u.hp = Math.max(0, u.hp - taken);
    }
    next.units = next.units.filter((u) => u.hp > 0);

    const totalDuration = next.matchDurationMs + next.overtimeMs;
    const elapsed = next.startedAtMs ? now - next.startedAtMs : 0;
    const shouldEnd = elapsed >= totalDuration || p1.towers.king.hp <= 0 || p2.towers.king.hp <= 0;

    if (shouldEnd) {
        next.status = "finished";
        next.finishedAtMs = now;
        next.winner = evaluateWinner(next);
    }

    next.lastHostTickMs = now;
    return next;
};

const formatMs = (ms: number) => {
    const safe = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
};

const hpPercent = (hp: number, maxHp: number) => {
    if (maxHp <= 0) return 0;
    return Math.max(0, Math.min(100, (hp / maxHp) * 100));
};

export default function RoyalDuelArena({
    isOpen,
    onClose,
    userName,
}: {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
}) {
    const [roomCodeInput, setRoomCodeInput] = useState("");
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [mySlot, setMySlot] = useState<DuelPlayerSlot | null>(null);
    const [roomState, setRoomState] = useState<DuelRoomState | null>(null);
    const [error, setError] = useState("");
    const [selectedLane, setSelectedLane] = useState<DuelLane>(0);
    const [syncing, setSyncing] = useState(false);
    const hostTickLockRef = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        setError("");
    }, [isOpen]);

    useEffect(() => {
        if (!roomCode) return;
        const unsub = royaleDuelServices.listenRoom(roomCode, (state) => {
            setRoomState(state);
            if (!state) {
                setError("انتهت الغرفة أو تم حذفها");
                setRoomCode(null);
                setMySlot(null);
            }
        });
        return () => unsub();
    }, [roomCode]);

    useEffect(() => {
        if (!isOpen && roomCode && mySlot) {
            royaleDuelServices.leaveRoom(roomCode, mySlot).catch(() => undefined);
            setRoomCode(null);
            setMySlot(null);
            setRoomState(null);
        }
    }, [isOpen, roomCode, mySlot]);

    useEffect(() => {
        return () => {
            if (roomCode && mySlot) {
                royaleDuelServices.leaveRoom(roomCode, mySlot).catch(() => undefined);
            }
        };
    }, [roomCode, mySlot]);

    const isHost = useMemo(() => {
        if (!roomState || !mySlot) return false;
        return roomState.hostSlot === mySlot;
    }, [roomState, mySlot]);

    useEffect(() => {
        if (!roomCode || !roomState || !isHost || roomState.status !== "playing") return;

        const timer = setInterval(async () => {
            if (hostTickLockRef.current) return;
            hostTickLockRef.current = true;
            try {
                const next = simulateStep(roomState, Date.now());
                await royaleDuelServices.hostSync(roomCode, {
                    players: next.players,
                    units: next.units,
                    queue: next.queue,
                    status: next.status,
                    winner: next.winner,
                    startedAtMs: next.startedAtMs,
                    finishedAtMs: next.finishedAtMs,
                    lastHostTickMs: next.lastHostTickMs,
                });
            } catch {
                // Ignore one tick failure; next tick retries.
            } finally {
                hostTickLockRef.current = false;
            }
        }, 250);

        return () => clearInterval(timer);
    }, [roomCode, roomState, isHost]);

    const createRoom = useCallback(async (mode: "pvp" | "bot") => {
        try {
            setSyncing(true);
            setError("");
            const code = await royaleDuelServices.createRoom(userName, mode);
            setRoomCode(code);
            setMySlot("p1");
        } catch {
            setError("تعذر إنشاء الغرفة");
        } finally {
            setSyncing(false);
        }
    }, [userName]);

    const joinRoom = useCallback(async () => {
        const code = roomCodeInput.trim().toUpperCase();
        if (!code) {
            setError("أدخل كود الغرفة");
            return;
        }
        try {
            setSyncing(true);
            setError("");
            const res = await royaleDuelServices.joinRoom(code, userName);
            if (!res.ok || !res.slot) {
                setError(res.reason || "تعذر الانضمام");
                return;
            }
            setRoomCode(code);
            setMySlot(res.slot);
        } catch {
            setError("تعذر الانضمام");
        } finally {
            setSyncing(false);
        }
    }, [roomCodeInput, userName]);

    const deploy = useCallback(async (cardId: DuelCardId) => {
        if (!roomCode || !roomState || !mySlot) return;
        if (roomState.status !== "playing") return;

        const me = mySlot === "p1" ? roomState.players.p1 : roomState.players.p2;
        if (!me) return;

        const card = CARD_DEFS.find((c) => c.id === cardId);
        if (!card || me.elixir < card.cost) return;

        const cmd: DuelDeployCommand = {
            id: `${mySlot}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            by: mySlot,
            cardId,
            lane: selectedLane,
            createdAt: Date.now(),
        };

        await royaleDuelServices.enqueueDeploy(roomCode, cmd);
    }, [roomCode, roomState, mySlot, selectedLane]);

    const copyCode = useCallback(async () => {
        if (!roomCode) return;
        try {
            await navigator.clipboard.writeText(roomCode);
        } catch {
            // ignore clipboard error
        }
    }, [roomCode]);

    const remainingMs = useMemo(() => {
        if (!roomState?.startedAtMs) return roomState?.matchDurationMs ?? 0;
        const total = roomState.matchDurationMs + roomState.overtimeMs;
        const passed = Date.now() - roomState.startedAtMs;
        return Math.max(0, total - passed);
    }, [roomState]);

    const crowns = useMemo(() => {
        if (!roomState) return { me: 0, enemy: 0 };
        if (!mySlot) return { me: 0, enemy: 0 };
        const enemySlot: DuelPlayerSlot = mySlot === "p1" ? "p2" : "p1";
        return {
            me: getCrownCount(roomState, mySlot),
            enemy: getCrownCount(roomState, enemySlot),
        };
    }, [roomState, mySlot]);

    const me = mySlot === "p1" ? roomState?.players.p1 : roomState?.players.p2 ?? null;
    const enemy = mySlot === "p1" ? roomState?.players.p2 : roomState?.players.p1 ?? null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md">
            <div className="w-full h-full max-w-4xl mx-auto flex flex-col">
                <div className="shrink-0 flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/90">
                    <h2 className="text-base sm:text-xl font-bold text-rose-300 flex items-center gap-2">
                        <Swords className="w-5 h-5 text-rose-400" />
                        1v1 - Duel Royale
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!roomCode && (
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="max-w-xl mx-auto space-y-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                                <h3 className="text-white text-lg font-bold">ابدأ مباراة جديدة</h3>
                                <p className="text-sm text-slate-400">اختر PvP بكود غرفة أو تحدي سريع ضد BOT.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        onClick={() => createRoom("pvp")}
                                        disabled={syncing}
                                        className="bg-rose-500 hover:bg-rose-400 disabled:opacity-60 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <Users className="w-4 h-4" />
                                        إنشاء غرفة PvP
                                    </button>
                                    <button
                                        onClick={() => createRoom("bot")}
                                        disabled={syncing}
                                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <Bot className="w-4 h-4" />
                                        لعب ضد BOT
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                                <h3 className="text-white text-lg font-bold">انضمام برمز غرفة</h3>
                                <div className="flex gap-2">
                                    <input
                                        value={roomCodeInput}
                                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                                        placeholder="مثال: AB12CD"
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 outline-none focus:border-rose-400"
                                    />
                                    <button
                                        onClick={joinRoom}
                                        disabled={syncing}
                                        className="px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-bold"
                                    >
                                        دخول
                                    </button>
                                </div>
                                {error && <p className="text-sm text-red-400">{error}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {roomCode && roomState && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="shrink-0 p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700">ROOM: {roomCode}</span>
                                    <button onClick={copyCode} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="text-sm font-bold text-amber-300">{formatMs(remainingMs)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-2">
                                    <div className="text-slate-400 mb-1">أنت</div>
                                    <div className="text-white font-semibold truncate">{me?.name || "-"}</div>
                                    <div className="text-amber-300">CROWNS: {crowns.me}</div>
                                </div>
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-2">
                                    <div className="text-slate-400 mb-1">الخصم</div>
                                    <div className="text-white font-semibold truncate">{enemy?.name || "بانتظار لاعب"}</div>
                                    <div className="text-rose-300">CROWNS: {crowns.enemy}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 p-3 sm:p-4">
                            <div className="relative h-full rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 overflow-hidden">
                                <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-700/80" />
                                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700/40" />

                                <div className="absolute inset-x-0 top-[20%] h-2 rounded-full bg-slate-800/80" />
                                <div className="absolute inset-x-0 bottom-[20%] h-2 rounded-full bg-slate-800/80" />

                                <div className="absolute left-[7%] top-[22%] w-10 h-10 rounded-xl bg-cyan-400/25 border border-cyan-400/50 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-cyan-300" />
                                </div>
                                <div className="absolute left-[7%] bottom-[22%] w-10 h-10 rounded-xl bg-cyan-400/25 border border-cyan-400/50 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-cyan-300" />
                                </div>
                                <div className="absolute left-[3%] top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-cyan-500/30 border border-cyan-400/60 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-cyan-200" />
                                </div>

                                <div className="absolute right-[7%] top-[22%] w-10 h-10 rounded-xl bg-rose-400/25 border border-rose-400/50 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-rose-300" />
                                </div>
                                <div className="absolute right-[7%] bottom-[22%] w-10 h-10 rounded-xl bg-rose-400/25 border border-rose-400/50 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-rose-300" />
                                </div>
                                <div className="absolute right-[3%] top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-rose-500/30 border border-rose-400/60 flex items-center justify-center">
                                    <Crown className="w-5 h-5 text-rose-200" />
                                </div>

                                {roomState.units.map((unit) => {
                                    const left = `${unit.x}%`;
                                    const laneTop = unit.lane === 0 ? "30%" : "70%";
                                    const isMine = unit.owner === mySlot;
                                    return (
                                        <div
                                            key={unit.id}
                                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border ${
                                                isMine
                                                    ? "bg-emerald-500/70 border-emerald-300"
                                                    : "bg-rose-500/70 border-rose-300"
                                            }`}
                                            style={{ left, top: laneTop }}
                                            title={`${unit.cardId} ${Math.round(unit.hp)}/${unit.maxHp}`}
                                        />
                                    );
                                })}

                                <div className="absolute left-[7%] top-[14%] w-20 h-1.5 rounded-full bg-slate-800">
                                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${hpPercent(roomState.players.p1.towers.lane0.hp, roomState.players.p1.towers.lane0.maxHp)}%` }} />
                                </div>
                                <div className="absolute left-[7%] bottom-[14%] w-20 h-1.5 rounded-full bg-slate-800">
                                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${hpPercent(roomState.players.p1.towers.lane1.hp, roomState.players.p1.towers.lane1.maxHp)}%` }} />
                                </div>
                                <div className="absolute left-[3%] top-[43%] w-16 h-1.5 rounded-full bg-slate-800">
                                    <div className="h-full bg-cyan-300 rounded-full" style={{ width: `${hpPercent(roomState.players.p1.towers.king.hp, roomState.players.p1.towers.king.maxHp)}%` }} />
                                </div>

                                {roomState.players.p2 && (
                                    <>
                                        <div className="absolute right-[7%] top-[14%] w-20 h-1.5 rounded-full bg-slate-800">
                                            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${hpPercent(roomState.players.p2.towers.lane0.hp, roomState.players.p2.towers.lane0.maxHp)}%` }} />
                                        </div>
                                        <div className="absolute right-[7%] bottom-[14%] w-20 h-1.5 rounded-full bg-slate-800">
                                            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${hpPercent(roomState.players.p2.towers.lane1.hp, roomState.players.p2.towers.lane1.maxHp)}%` }} />
                                        </div>
                                        <div className="absolute right-[3%] top-[43%] w-16 h-1.5 rounded-full bg-slate-800">
                                            <div className="h-full bg-rose-300 rounded-full" style={{ width: `${hpPercent(roomState.players.p2.towers.king.hp, roomState.players.p2.towers.king.maxHp)}%` }} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-slate-800 bg-slate-900/80 p-3 sm:p-4 space-y-3">
                            {roomState.status === "waiting" && (
                                <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                                    بانتظار اللاعب الثاني للدخول...
                                </div>
                            )}

                            {roomState.status === "finished" && (
                                <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 flex items-center justify-between">
                                    <span>
                                        النتيجة: {
                                            roomState.winner === "draw"
                                                ? "تعادل"
                                                : roomState.winner === mySlot
                                                    ? "فزت"
                                                    : "خسرت"
                                        }
                                    </span>
                                    {isHost && (
                                        <button
                                            onClick={async () => {
                                                if (!roomCode) return;
                                                await royaleDuelServices.clearRoom(roomCode);
                                            }}
                                            className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            إعادة
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                                <div className="text-slate-400">المسار</div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedLane(0)}
                                        className={`px-3 py-1.5 rounded-lg border ${selectedLane === 0 ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}
                                    >
                                        المسار العلوي
                                    </button>
                                    <button
                                        onClick={() => setSelectedLane(1)}
                                        className={`px-3 py-1.5 rounded-lg border ${selectedLane === 1 ? "bg-cyan-500/20 border-cyan-400 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-300"}`}
                                    >
                                        المسار السفلي
                                    </button>
                                </div>
                            </div>

                            <div className="text-xs text-slate-400">
                                الإكسير: <span className="text-amber-300 font-bold">{me?.elixir.toFixed(1) ?? "0.0"}</span>/10
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {CARD_DEFS.map((card) => {
                                    const disabled = roomState.status !== "playing" || !me || me.elixir < card.cost;
                                    return (
                                        <button
                                            key={card.id}
                                            onClick={() => deploy(card.id)}
                                            disabled={disabled}
                                            className={`rounded-xl border p-2 text-right transition-all ${
                                                disabled
                                                    ? "bg-slate-900 border-slate-800 text-slate-500"
                                                    : "bg-slate-800 border-slate-600 hover:border-amber-400"
                                            }`}
                                        >
                                            <div className={`h-1.5 rounded-full mb-2 bg-gradient-to-r ${card.colorClass}`} />
                                            <div className="text-sm font-bold text-slate-100">{card.name}</div>
                                            <div className="text-[11px] text-slate-400">{card.desc}</div>
                                            <div className="text-xs mt-1 text-amber-300">{card.cost} Elixir</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
