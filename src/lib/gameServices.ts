import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

export interface GamePlayer {
    name: string;
    x: number;
    y: number;
    score: number;
    color: string;
    direction: "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";
    isSuper: boolean;
    superUntil: number;
    lastActive: number;
}

export interface GameState {
    players: Record<string, GamePlayer>;
    foods: { x: number; y: number }[];
    powerup: { x: number; y: number } | null;
}

export const GAME_DOC_ID = "hungryKingsState";

const INITIAL_STATE: GameState = {
    players: {},
    foods: [],
    powerup: null,
};

export const gameServices = {
    // Initialize or reset the game document
    async initGameArea() {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
            await setDoc(gameRef, INITIAL_STATE);
        }
    },

    // Listen to real-time state changes
    listenToGameState(callback: (state: GameState | null) => void) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        return onSnapshot(gameRef, (snap) => {
            if (snap.exists()) {
                callback(snap.data() as GameState);
            } else {
                callback(null);
            }
        });
    },

    // Join the game arena
    async joinGame(userName: string, color: string, startX: number, startY: number) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);

        // We use a transaction-like update for the nested object, but updateDoc is sufficient here
        await updateDoc(gameRef, {
            [`players.${userName}`]: {
                name: userName,
                x: startX,
                y: startY,
                score: 0,
                color: color,
                direction: "NONE",
                isSuper: false,
                superUntil: 0,
                lastActive: Date.now()
            }
        });
    },

    // Update player position and score
    async updatePlayerState(userName: string, playerState: Partial<GamePlayer>) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        const updates: Record<string, any> = {};

        // Flatten the update for Firestore dot notation
        for (const [key, value] of Object.entries(playerState)) {
            updates[`players.${userName}.${key}`] = value;
        }
        updates[`players.${userName}.lastActive`] = Date.now();

        await updateDoc(gameRef, updates);
    },

    // Update global items (foods, powerups) when someone eats them or spawns them
    async updateItems(foods: { x: number; y: number }[], powerup: { x: number; y: number } | null) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        await updateDoc(gameRef, { foods, powerup });
    },

    // Leave the game
    async leaveGame(userName: string) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
            const data = gameSnap.data() as GameState;
            if (data.players && data.players[userName]) {
                const updatedPlayers = { ...data.players };
                delete updatedPlayers[userName];
                await updateDoc(gameRef, { players: updatedPlayers });
            }
        }
    }
};
