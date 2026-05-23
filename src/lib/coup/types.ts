// Shared Coup types & constants — pure, no imports, safe for client + server.

export type Character = "duke" | "assassin" | "captain" | "ambassador" | "contessa";

export const CHARACTERS: Character[] = ["duke", "assassin", "captain", "ambassador", "contessa"];

export type ActionType =
    | "income"
    | "foreign_aid"
    | "coup"
    | "tax"
    | "assassinate"
    | "steal"
    | "exchange";

export type ResponseType = "pass" | "challenge" | "block";

export type Phase =
    | "lobby"
    | "turn" // current player must choose an action
    | "awaitChallenge" // a claimed action is open to challenge
    | "awaitBlock" // an action is open to be blocked
    | "awaitBlockChallenge" // a block was declared, open to challenge
    | "loseInfluence" // a player must reveal/lose a card
    | "exchange" // ambassador is choosing which cards to keep
    | "gameOver";

export interface Influence {
    character: Character;
    revealed: boolean;
}

export interface CoupPlayer {
    name: string;
    coins: number;
    influence: Influence[];
    eliminated: boolean;
    connected: boolean;
    isHost: boolean;
}

export interface PendingAction {
    type: ActionType;
    actor: string;
    target?: string;
    claimedCharacter?: Character; // the character the actor claims (challengeable)
    passed: string[]; // players who have responded "pass" in the current window
    block?: {
        blocker: string;
        claimedCharacter: Character;
    };
}

// Continuation tokens describe what to do after an interrupt (lose/exchange) resolves.
export type Continuation =
    | "endTurn"
    | "cancelEndTurn"
    | "afterActionChallengeActorWon"
    | "afterBlockChallengeApply";

export interface PendingLose {
    player: string;
    count: number;
    reason: string;
    continuation: Continuation;
}

export interface PendingExchange {
    player: string;
    options: Character[]; // current unrevealed cards + drawn cards
    keepCount: number;
}

export interface LogEntry {
    atMs: number;
    text: string;
    kind?: "action" | "challenge" | "block" | "reveal" | "system" | "win";
}

export interface Reaction {
    id: string;
    player: string;
    emoji: string;
    atMs: number;
}

// Full authoritative state (kept encrypted server-side).
export interface CoupGameState {
    roomId: string;
    status: "lobby" | "playing" | "finished";
    hostName: string;
    players: CoupPlayer[];
    deck: Character[];
    turnIndex: number;
    phase: Phase;
    pending: PendingAction | null;
    pendingLose: PendingLose | null;
    pendingExchange: PendingExchange | null;
    deadline: number | null;
    log: LogEntry[];
    reactions: Reaction[];
    winner: string | null;
    createdAtMs: number;
    updatedAtMs: number;
    version: number;
}

// ---- Public (redacted) projection sent to clients ----

export type PublicInfluenceSlot =
    | { revealed: true; character: Character }
    | { revealed: false };

export interface PublicPlayer {
    name: string;
    coins: number;
    eliminated: boolean;
    connected: boolean;
    isHost: boolean;
    influence: PublicInfluenceSlot[];
    influenceCount: number; // unrevealed cards remaining
}

export interface PublicGameState {
    roomId: string;
    status: "lobby" | "playing" | "finished";
    hostName: string;
    players: PublicPlayer[];
    deckCount: number;
    turnIndex: number;
    currentPlayer: string | null;
    phase: Phase;
    pending: PendingAction | null;
    pendingLose: { player: string; count: number; reason: string } | null;
    pendingExchange: { player: string; keepCount: number } | null; // options are private
    deadline: number | null;
    log: LogEntry[];
    reactions: Reaction[];
    winner: string | null;
    updatedAtMs: number;
    version: number;
}

// Private hand info returned only to the requesting player.
export interface CoupHand {
    influence: Influence[];
    exchangeOptions: Character[] | null; // set only when it's this player's exchange
    exchangeKeepCount: number;
}

// ---- UI metadata (Arabic) ----

export const CHARACTER_AR: Record<Character, string> = {
    duke: "الدوق",
    assassin: "القاتل",
    captain: "الكابتن",
    ambassador: "السفير",
    contessa: "الكونتيسة",
};

export const CHARACTER_EMOJI: Record<Character, string> = {
    duke: "👑",
    assassin: "🗡️",
    captain: "⚓",
    ambassador: "🎭",
    contessa: "🛡️",
};

export const CHARACTER_DESC: Record<Character, string> = {
    duke: "يأخذ 3 ذهب (ضريبة) ويوقف المعونة الأجنبية",
    assassin: "يدفع 3 ذهب لاغتيال ورقة خصم",
    captain: "يسرق ذهبين من خصم ويوقف السرقة",
    ambassador: "يبدّل أوراقه ويوقف السرقة",
    contessa: "توقف الاغتيال",
};

export const ACTION_AR: Record<ActionType, string> = {
    income: "دخل",
    foreign_aid: "معونة أجنبية",
    coup: "انقلاب",
    tax: "ضريبة",
    assassinate: "اغتيال",
    steal: "سرقة",
    exchange: "تبديل",
};

// Which character an action claims (null = no claim / not challengeable).
export const ACTION_CLAIM: Record<ActionType, Character | null> = {
    income: null,
    foreign_aid: null,
    coup: null,
    tax: "duke",
    assassinate: "assassin",
    steal: "captain",
    exchange: "ambassador",
};

// Which characters can block each action (empty = unblockable).
export const ACTION_BLOCKERS: Record<ActionType, Character[]> = {
    income: [],
    foreign_aid: ["duke"],
    coup: [],
    tax: [],
    assassinate: ["contessa"],
    steal: ["captain", "ambassador"],
    exchange: [],
};
