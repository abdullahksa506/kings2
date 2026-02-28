import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE";

export interface GamePlayer {
    name: string;
    x: number;
    y: number;
    score: number;
    color: string;
    direction: Direction;
    speedBoostUntil: number; // timestamp
    stunnedUntil: number; // timestamp
    lastActive: number;
}

export interface Enemy {
    id: string;
    x: number;
    y: number;
    dirX: number;
    dirY: number;
}

export interface Projectile {
    id: string;
    x: number;
    y: number;
    dirX: number;
    dirY: number;
    owner: string;
    createdAt: number;
}

export interface GameState {
    players: Record<string, GamePlayer>;
    foods: { x: number; y: number }[];
    boosts: { x: number; y: number }[];
    enemies: Enemy[];
    projectiles: Projectile[];
    lastHostUpdate: number;
}

// 15x15 Pac-Man style map
export const MAP_SIZE = 15;
export const GAME_DOC_ID = "hungryKingsStateV3";

// 1 = Wall, 0 = Path, 2 = Ghost Spawn
export const MAZE_WALLS = [
    "111111111111111",
    "100000101000001",
    "101110101011101",
    "100000000000001",
    "101110111011101",
    "100010010010001",
    "111011000110111",
    "100000000000001",
    "111011010110111",
    "100010010010001",
    "101110111011101",
    "100000000000001",
    "101110101011101",
    "100000101000001",
    "111111111111111",
];

const INITIAL_STATE: GameState = {
    players: {},
    foods: [],
    boosts: [],
    enemies: [
        { id: "e1", x: 1, y: 1, dirX: 1, dirY: 0 },
        { id: "e2", x: 13, y: 1, dirX: -1, dirY: 0 },
        { id: "e3", x: 1, y: 13, dirX: 1, dirY: 0 },
        { id: "e4", x: 13, y: 13, dirX: -1, dirY: 0 },
        { id: "e5", x: 7, y: 7, dirX: 0, dirY: 1 },
    ],
    projectiles: [],
    lastHostUpdate: 0,
};

export const gameServices = {
    async initGameArea() {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
            await setDoc(gameRef, INITIAL_STATE);
        }
    },

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

    async joinGame(userName: string, color: string, startX: number, startY: number) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        await updateDoc(gameRef, {
            [`players.${userName}`]: {
                name: userName,
                x: startX,
                y: startY,
                score: 0,
                color: color,
                direction: "NONE",
                speedBoostUntil: 0,
                stunnedUntil: 0,
                lastActive: Date.now()
            }
        });
    },

    // Used by clients to register their movement intent
    async updatePlayerIntent(userName: string, x: number, y: number, direction: Direction, score: number) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        await updateDoc(gameRef, {
            [`players.${userName}.x`]: x,
            [`players.${userName}.y`]: y,
            [`players.${userName}.direction`]: direction,
            [`players.${userName}.score`]: score,
            [`players.${userName}.lastActive`]: Date.now()
        });
    },

    // Specifically for when you hit another player or enemy
    async updatePlayerStatus(userName: string, updates: Partial<GamePlayer>) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        const fbUpdates: Record<string, any> = {};
        for (const [key, val] of Object.entries(updates)) {
            fbUpdates[`players.${userName}.${key}`] = val;
        }
        await updateDoc(gameRef, fbUpdates);
    },

    // Shoot a projectile
    async shootProjectile(projectile: Projectile) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        const snap = await getDoc(gameRef);
        if (snap.exists()) {
            const data = snap.data() as GameState;
            const projs = data.projectiles || [];
            projs.push(projectile);
            await updateDoc(gameRef, { projectiles: projs });
        }
    },

    // The host calls this to update all entities
    async hostSyncEntities(
        foods: { x: number; y: number }[],
        boosts: { x: number; y: number }[],
        enemies: Enemy[],
        projectiles: Projectile[]
    ) {
        const gameRef = doc(db, "minigames", GAME_DOC_ID);
        await updateDoc(gameRef, {
            foods,
            boosts,
            enemies,
            projectiles,
            lastHostUpdate: Date.now()
        });
    },

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
