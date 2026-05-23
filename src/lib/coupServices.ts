import { db } from "./firebase";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { invokeRpc } from "./services";
import { Character, CoupHand, PublicGameState, ResponseType } from "./coup/types";

export * from "./coup/types";

export interface CoupVoicePresence {
    name: string;
    joined: boolean;
    muted: boolean;
    atMs: number;
}

export interface CoupSignal {
    id: string;
    from: string;
    to: string;
    signal: any;
    atMs: number;
}

function stripRoom(data: any): PublicGameState {
    const { enc, lastActivityAt, ...rest } = data || {};
    return rest as PublicGameState;
}

export const coupServices = {
    // ---- listeners ----
    listenToRoom(roomId: string, cb: (state: PublicGameState | null) => void) {
        return onSnapshot(doc(db, "coupRooms", roomId), (snap) => {
            cb(snap.exists() ? stripRoom(snap.data()) : null);
        });
    },

    listenToOpenRooms(cb: (rooms: PublicGameState[]) => void) {
        const q = query(collection(db, "coupRooms"), where("status", "in", ["lobby", "playing"]));
        return onSnapshot(q, (snap) => {
            const rooms = snap.docs
                .map((d) => stripRoom(d.data()))
                .sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
            cb(rooms);
        });
    },

    listenToVoice(roomId: string, cb: (presence: CoupVoicePresence[]) => void) {
        return onSnapshot(collection(db, "coupRooms", roomId, "voice"), (snap) => {
            cb(snap.docs.map((d) => d.data() as CoupVoicePresence));
        });
    },

    listenToSignals(roomId: string, myName: string, cb: (signals: CoupSignal[]) => void) {
        const q = query(collection(db, "coupRooms", roomId, "signals"), where("to", "==", myName));
        return onSnapshot(q, (snap) => {
            const signals: CoupSignal[] = snap.docs.map((d) => {
                const data = d.data() as any;
                let parsed: any = null;
                try {
                    parsed = typeof data.signal === "string" ? JSON.parse(data.signal) : data.signal;
                } catch {
                    parsed = null;
                }
                return { id: d.id, from: data.from, to: data.to, signal: parsed, atMs: data.atMs };
            });
            cb(signals);
        });
    },

    // ---- mutations (server-authoritative) ----
    createRoom(): Promise<{ roomId: string }> {
        return invokeRpc("coupCreateRoom");
    },
    joinRoom(roomId: string): Promise<{ roomId: string }> {
        return invokeRpc("coupJoinRoom", { roomId });
    },
    leaveRoom(roomId: string) {
        return invokeRpc("coupLeaveRoom", { roomId });
    },
    startGame(roomId: string) {
        return invokeRpc("coupStartGame", { roomId });
    },
    action(roomId: string, type: string, target?: string) {
        return invokeRpc("coupAction", { roomId, type, target });
    },
    respond(roomId: string, response: ResponseType, blockCharacter?: Character) {
        return invokeRpc("coupRespond", { roomId, response, blockCharacter });
    },
    resolveLose(roomId: string, cardIndex: number) {
        return invokeRpc("coupResolveLose", { roomId, cardIndex });
    },
    resolveExchange(roomId: string, keepIndices: number[]) {
        return invokeRpc("coupResolveExchange", { roomId, keepIndices });
    },
    reaction(roomId: string, emoji: string) {
        return invokeRpc("coupReaction", { roomId, emoji });
    },
    getHand(roomId: string): Promise<CoupHand> {
        return invokeRpc("coupGetHand", { roomId });
    },
    tick(roomId: string) {
        return invokeRpc("coupTick", { roomId });
    },
    voiceState(roomId: string, joined: boolean, muted: boolean) {
        return invokeRpc("coupVoiceState", { roomId, joined, muted });
    },
    voiceSignal(roomId: string, to: string, signal: any) {
        return invokeRpc("coupVoiceSignal", { roomId, to, signal });
    },
};
