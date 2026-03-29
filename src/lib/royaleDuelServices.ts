import { db } from "./firebase";
import {
    arrayUnion,
    deleteField,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc,
} from "firebase/firestore";

export type DuelPlayerSlot = "p1" | "p2";
export type DuelLane = 0 | 1;

export type DuelCardId = "raider" | "archer" | "tank" | "spell";

export interface DuelDeployCommand {
    id: string;
    by: DuelPlayerSlot;
    cardId: DuelCardId;
    lane: DuelLane;
    createdAt: number;
}

export interface DuelUnit {
    id: string;
    owner: DuelPlayerSlot;
    cardId: Exclude<DuelCardId, "spell">;
    lane: DuelLane;
    x: number;
    hp: number;
    maxHp: number;
    speed: number;
    damage: number;
    range: number;
    cooldownMs: number;
    lastAttackAt: number;
}

export interface DuelTower {
    hp: number;
    maxHp: number;
    lastAttackAt: number;
}

export interface DuelPlayerState {
    name: string;
    elixir: number;
    lastElixirAt: number;
    towers: {
        lane0: DuelTower;
        lane1: DuelTower;
        king: DuelTower;
    };
}

export interface DuelRoomState {
    roomCode: string;
    status: "waiting" | "playing" | "finished";
    mode: "pvp" | "bot";
    hostSlot: DuelPlayerSlot;
    createdAtMs: number;
    startedAtMs: number | null;
    finishedAtMs: number | null;
    matchDurationMs: number;
    overtimeMs: number;
    winner: DuelPlayerSlot | "draw" | null;
    players: {
        p1: DuelPlayerState;
        p2: DuelPlayerState | null;
    };
    units: DuelUnit[];
    queue: DuelDeployCommand[];
    lastHostTickMs: number;
}

const ROOM_COLLECTION = "royaleDuels";

const makeTower = (hp: number): DuelTower => ({
    hp,
    maxHp: hp,
    lastAttackAt: 0,
});

const makePlayer = (name: string): DuelPlayerState => ({
    name,
    elixir: 5,
    lastElixirAt: Date.now(),
    towers: {
        lane0: makeTower(1800),
        lane1: makeTower(1800),
        king: makeTower(2600),
    },
});

const makeInitialRoom = (roomCode: string, userName: string, mode: "pvp" | "bot"): DuelRoomState => ({
    roomCode,
    status: mode === "bot" ? "playing" : "waiting",
    mode,
    hostSlot: "p1",
    createdAtMs: Date.now(),
    startedAtMs: mode === "bot" ? Date.now() : null,
    finishedAtMs: null,
    matchDurationMs: 120000,
    overtimeMs: 30000,
    winner: null,
    players: {
        p1: makePlayer(userName),
        p2: mode === "bot" ? makePlayer("BOT") : null,
    },
    units: [],
    queue: [],
    lastHostTickMs: 0,
});

const roomRef = (roomCode: string) => doc(db, ROOM_COLLECTION, roomCode);

export const royaleDuelServices = {
    async createRoom(userName: string, mode: "pvp" | "bot"): Promise<string> {
        const code = `${Math.random().toString(36).slice(2, 6)}${Math.random().toString(36).slice(2, 4)}`.toUpperCase();
        const initial = makeInitialRoom(code, userName, mode);
        await setDoc(roomRef(code), {
            ...initial,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return code;
    },

    async joinRoom(roomCode: string, userName: string): Promise<{ ok: boolean; reason?: string; slot?: DuelPlayerSlot }> {
        const ref = roomRef(roomCode);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            return { ok: false, reason: "الغرفة غير موجودة" };
        }

        const data = snap.data() as DuelRoomState;
        if (data.mode !== "pvp") {
            return { ok: false, reason: "الغرفة ليست PvP" };
        }

        if (data.players.p1.name === userName) {
            return { ok: true, slot: "p1" };
        }

        if (data.players.p2?.name === userName) {
            return { ok: true, slot: "p2" };
        }

        if (data.players.p2 && data.status !== "waiting") {
            return { ok: false, reason: "الغرفة ممتلئة" };
        }

        if (!data.players.p2) {
            await updateDoc(ref, {
                players: {
                    ...data.players,
                    p2: makePlayer(userName),
                },
                status: "playing",
                startedAtMs: Date.now(),
                updatedAt: serverTimestamp(),
            });
            return { ok: true, slot: "p2" };
        }

        return { ok: false, reason: "تعذر الانضمام" };
    },

    listenRoom(roomCode: string, callback: (state: DuelRoomState | null) => void) {
        return onSnapshot(roomRef(roomCode), (snap) => {
            if (!snap.exists()) {
                callback(null);
                return;
            }
            callback(snap.data() as DuelRoomState);
        });
    },

    async enqueueDeploy(roomCode: string, command: DuelDeployCommand) {
        await updateDoc(roomRef(roomCode), {
            queue: arrayUnion(command),
            updatedAt: serverTimestamp(),
        });
    },

    async hostSync(roomCode: string, partial: Partial<DuelRoomState>) {
        await updateDoc(roomRef(roomCode), {
            ...partial,
            updatedAt: serverTimestamp(),
        });
    },

    async leaveRoom(roomCode: string, slot: DuelPlayerSlot) {
        const ref = roomRef(roomCode);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;

        const state = snap.data() as DuelRoomState;
        if (slot === "p1") {
            await setDoc(ref, {
                ...state,
                status: "finished",
                winner: state.players.p2 ? "p2" : "draw",
                finishedAtMs: Date.now(),
                updatedAt: serverTimestamp(),
            }, { merge: true });
            return;
        }

        await setDoc(ref, {
            ...state,
            players: {
                ...state.players,
                p2: null,
            },
            status: "waiting",
            updatedAt: serverTimestamp(),
        }, { merge: true });
    },

    async clearRoom(roomCode: string) {
        await updateDoc(roomRef(roomCode), {
            queue: [],
            units: [],
            winner: null,
            finishedAtMs: null,
            startedAtMs: null,
            status: "waiting",
            updatedAt: serverTimestamp(),
            deletedAt: deleteField(),
        });
    },
};
