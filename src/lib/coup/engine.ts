// Pure Coup game engine — no I/O, no firebase. Server-authoritative.
// All randomness uses Math.random (only ever runs server-side, deck never leaves the server).

import {
    ACTION_AR,
    ACTION_BLOCKERS,
    ACTION_CLAIM,
    ActionType,
    Character,
    CHARACTER_AR,
    CHARACTERS,
    Continuation,
    CoupGameState,
    CoupHand,
    CoupPlayer,
    Influence,
    LogEntry,
    PublicGameState,
    PublicPlayer,
    ResponseType,
} from "./types";

export const RESPONSE_WINDOW_MS = 30_000;
export const TURN_WINDOW_MS = 90_000;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

// ---------- helpers ----------

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function createDeck(): Character[] {
    const deck: Character[] = [];
    for (const c of CHARACTERS) {
        deck.push(c, c, c); // 3 of each => 15 cards
    }
    return shuffle(deck);
}

function now() {
    return Date.now();
}

function log(state: CoupGameState, text: string, kind: LogEntry["kind"] = "system") {
    state.log.push({ atMs: now(), text, kind });
    if (state.log.length > 40) state.log = state.log.slice(-40);
}

function touch(state: CoupGameState) {
    state.version += 1;
    state.updatedAtMs = now();
}

function findPlayer(state: CoupGameState, name: string): CoupPlayer | undefined {
    return state.players.find((p) => p.name === name);
}

function unrevealed(p: CoupPlayer): Influence[] {
    return p.influence.filter((i) => !i.revealed);
}

function activePlayers(state: CoupGameState): CoupPlayer[] {
    return state.players.filter((p) => !p.eliminated);
}

function currentPlayer(state: CoupGameState): CoupPlayer | undefined {
    return state.players[state.turnIndex];
}

// ---------- lobby ----------

export function createGame(roomId: string, host: string): CoupGameState {
    return {
        roomId,
        status: "lobby",
        hostName: host,
        players: [{ name: host, coins: 0, influence: [], eliminated: false, connected: true, isHost: true }],
        deck: [],
        turnIndex: 0,
        phase: "lobby",
        pending: null,
        pendingLose: null,
        pendingExchange: null,
        deadline: null,
        log: [{ atMs: now(), text: `${host} أنشأ الغرفة`, kind: "system" }],
        reactions: [],
        winner: null,
        createdAtMs: now(),
        updatedAtMs: now(),
        version: 1,
    };
}

export function addPlayer(state: CoupGameState, name: string): void {
    if (state.status !== "lobby") throw new Error("اللعبة بدأت بالفعل");
    if (findPlayer(state, name)) return; // already in
    if (state.players.length >= MAX_PLAYERS) throw new Error("الغرفة ممتلئة");
    state.players.push({ name, coins: 0, influence: [], eliminated: false, connected: true, isHost: false });
    log(state, `${name} انضم للغرفة`);
    touch(state);
}

export function removePlayer(state: CoupGameState, name: string): void {
    const idx = state.players.findIndex((p) => p.name === name);
    if (idx === -1) return;

    if (state.status === "lobby") {
        state.players.splice(idx, 1);
        if (state.hostName === name && state.players.length > 0) {
            state.hostName = state.players[0].name;
            state.players[0].isHost = true;
        }
        log(state, `${name} غادر الغرفة`);
        touch(state);
        return;
    }

    // Mid-game: treat as eliminated/forfeit.
    const p = state.players[idx];
    if (!p.eliminated) {
        p.influence.forEach((i) => (i.revealed = true));
        p.eliminated = true;
        log(state, `${name} انسحب من اللعبة`, "system");
        // If it was their turn or a window they owned, recover the flow.
        recoverAfterRemoval(state, name);
        checkGameOver(state);
    }
    touch(state);
}

function recoverAfterRemoval(state: CoupGameState, name: string): void {
    if (state.phase === "gameOver") return;
    // If a pending interrupt targeted the leaver, just end the turn.
    if (state.pendingLose?.player === name || state.pendingExchange?.player === name) {
        clearPending(state);
        endTurn(state);
        return;
    }
    // If it was their turn, move on.
    if (currentPlayer(state)?.name === name && state.phase === "turn") {
        endTurn(state);
        return;
    }
    // If they were the actor of a pending action, cancel it.
    if (state.pending && state.pending.actor === name) {
        clearPending(state);
        endTurn(state);
    }
}

export function startGame(state: CoupGameState, requester: string): void {
    if (state.status !== "lobby") throw new Error("اللعبة بدأت بالفعل");
    if (requester !== state.hostName) throw new Error("المضيف فقط يبدأ اللعبة");
    if (state.players.length < MIN_PLAYERS) throw new Error("نحتاج لاعبَين على الأقل");

    state.deck = createDeck();
    state.players = shuffle(state.players); // randomize seating/turn order
    for (const p of state.players) {
        p.coins = 2;
        p.eliminated = false;
        p.influence = [
            { character: state.deck.pop()!, revealed: false },
            { character: state.deck.pop()!, revealed: false },
        ];
    }
    state.status = "playing";
    state.turnIndex = 0;
    state.phase = "turn";
    state.pending = null;
    state.pendingLose = null;
    state.pendingExchange = null;
    state.deadline = now() + TURN_WINDOW_MS;
    state.winner = null;
    log(state, `بدأت اللعبة! الدور على ${currentPlayer(state)?.name}`, "system");
    touch(state);
}

// ---------- turn flow ----------

function clearPending(state: CoupGameState) {
    state.pending = null;
    state.pendingLose = null;
    state.pendingExchange = null;
}

function nextActiveIndex(state: CoupGameState, from: number): number {
    const n = state.players.length;
    for (let step = 1; step <= n; step++) {
        const idx = (from + step) % n;
        if (!state.players[idx].eliminated) return idx;
    }
    return from;
}

function endTurn(state: CoupGameState): void {
    if (state.phase === "gameOver") return;
    clearPending(state);
    state.turnIndex = nextActiveIndex(state, state.turnIndex);
    state.phase = "turn";
    state.deadline = now() + TURN_WINDOW_MS;
    const cp = currentPlayer(state);
    if (cp) log(state, `الدور على ${cp.name}`, "system");
}

function checkGameOver(state: CoupGameState): boolean {
    const active = activePlayers(state);
    if (active.length <= 1) {
        state.phase = "gameOver";
        state.status = "finished";
        state.winner = active[0]?.name ?? null;
        state.deadline = null;
        clearPending(state);
        if (state.winner) log(state, `🏆 ${state.winner} فاز باللعبة!`, "win");
        return true;
    }
    return false;
}

// ---------- card swapping ----------

function replaceCard(state: CoupGameState, player: CoupPlayer, character: Character): void {
    const slot = player.influence.find((i) => !i.revealed && i.character === character);
    if (!slot) return;
    state.deck.push(character);
    state.deck = shuffle(state.deck);
    const drawn = state.deck.pop();
    if (drawn) slot.character = drawn;
}

// ---------- losing influence ----------

function beginLose(
    state: CoupGameState,
    playerName: string,
    count: number,
    reason: string,
    continuation: Continuation,
): void {
    const player = findPlayer(state, playerName);
    if (!player || player.eliminated) {
        runContinuation(state, continuation);
        return;
    }
    const live = unrevealed(player);
    if (live.length <= count) {
        // Auto-reveal everything remaining; player is eliminated.
        live.forEach((i) => (i.revealed = true));
        log(state, `${player.name} كشف ${live.map((i) => CHARACTER_AR[i.character]).join(" و ")} وخرج`, "reveal");
        player.eliminated = true;
        if (checkGameOver(state)) return;
        runContinuation(state, continuation);
        return;
    }
    // Player must choose which card to lose.
    state.pendingLose = { player: player.name, count, reason, continuation };
    state.phase = "loseInfluence";
    state.deadline = now() + RESPONSE_WINDOW_MS;
}

export function resolveLose(state: CoupGameState, playerName: string, cardIndex: number): void {
    if (state.phase !== "loseInfluence" || !state.pendingLose) throw new Error("لا يوجد ورق لخسارته الآن");
    if (state.pendingLose.player !== playerName) throw new Error("ليس دورك لخسارة ورقة");
    const player = findPlayer(state, playerName)!;
    const live = player.influence.filter((i) => !i.revealed);
    const target = live[cardIndex];
    if (!target) throw new Error("اختيار غير صحيح");
    target.revealed = true;
    log(state, `${player.name} خسر ${CHARACTER_AR[target.character]}`, "reveal");

    const remaining = unrevealed(player);
    if (remaining.length === 0) {
        player.eliminated = true;
        log(state, `${player.name} خرج من اللعبة`, "reveal");
    }

    const cont = state.pendingLose.continuation;
    state.pendingLose = null;
    if (checkGameOver(state)) {
        touch(state);
        return;
    }
    runContinuation(state, cont);
    touch(state);
}

// ---------- continuations ----------

function runContinuation(state: CoupGameState, cont: Continuation): void {
    if (state.phase === "gameOver") return;
    switch (cont) {
        case "endTurn":
            endTurn(state);
            break;
        case "cancelEndTurn":
            if (state.pending) log(state, `أُلغي ${ACTION_AR[state.pending.type]}`, "system");
            endTurn(state);
            break;
        case "afterActionChallengeActorWon":
            proceedAfterChallengePassed(state);
            break;
        case "afterBlockChallengeApply":
            applyMainEffect(state);
            break;
    }
}

// After a claimed action's challenge window passes (or actor wins a challenge),
// either open a block window (blockable actions) or apply the effect.
function proceedAfterChallengePassed(state: CoupGameState): void {
    const pa = state.pending;
    if (!pa) {
        endTurn(state);
        return;
    }
    const blockers = ACTION_BLOCKERS[pa.type];
    if (blockers.length > 0) {
        openBlockWindow(state);
    } else {
        applyMainEffect(state);
    }
}

// ---------- windows ----------

function eligibleChallengers(state: CoupGameState, exclude: string): string[] {
    return activePlayers(state)
        .map((p) => p.name)
        .filter((n) => n !== exclude);
}

function openChallengeWindow(state: CoupGameState): void {
    state.phase = "awaitChallenge";
    if (state.pending) state.pending.passed = [];
    state.deadline = now() + RESPONSE_WINDOW_MS;
}

function blockEligible(state: CoupGameState): string[] {
    const pa = state.pending!;
    if (pa.type === "foreign_aid") {
        return eligibleChallengers(state, pa.actor);
    }
    // assassinate / steal => only the target may block
    if (pa.target) {
        const t = findPlayer(state, pa.target);
        return t && !t.eliminated ? [t.name] : [];
    }
    return [];
}

function openBlockWindow(state: CoupGameState): void {
    const eligible = blockEligible(state);
    if (eligible.length === 0) {
        applyMainEffect(state);
        return;
    }
    state.phase = "awaitBlock";
    if (state.pending) state.pending.passed = [];
    state.deadline = now() + RESPONSE_WINDOW_MS;
}

function openBlockChallengeWindow(state: CoupGameState): void {
    state.phase = "awaitBlockChallenge";
    if (state.pending) state.pending.passed = [];
    state.deadline = now() + RESPONSE_WINDOW_MS;
}

// ---------- main effects ----------

function applyMainEffect(state: CoupGameState): void {
    const pa = state.pending;
    if (!pa) {
        endTurn(state);
        return;
    }
    const actor = findPlayer(state, pa.actor);
    if (!actor || actor.eliminated) {
        endTurn(state);
        return;
    }

    switch (pa.type) {
        case "foreign_aid":
            actor.coins += 2;
            log(state, `${actor.name} أخذ معونة أجنبية (+2)`, "action");
            endTurn(state);
            break;
        case "tax":
            actor.coins += 3;
            log(state, `${actor.name} أخذ ضريبة (+3)`, "action");
            endTurn(state);
            break;
        case "steal": {
            const target = pa.target ? findPlayer(state, pa.target) : undefined;
            if (target) {
                const amt = Math.min(2, target.coins);
                target.coins -= amt;
                actor.coins += amt;
                log(state, `${actor.name} سرق ${amt} من ${target.name}`, "action");
            }
            endTurn(state);
            break;
        }
        case "assassinate": {
            log(state, `${actor.name} نفّذ الاغتيال على ${pa.target}`, "action");
            beginLose(state, pa.target!, 1, "اغتيال", "endTurn");
            break;
        }
        case "exchange":
            startExchange(state, actor);
            break;
        default:
            endTurn(state);
    }
}

function startExchange(state: CoupGameState, actor: CoupPlayer): void {
    const live = unrevealed(actor);
    const drawn: Character[] = [];
    for (let i = 0; i < 2; i++) {
        const c = state.deck.pop();
        if (c) drawn.push(c);
    }
    const options = [...live.map((i) => i.character), ...drawn];
    state.pendingExchange = { player: actor.name, options, keepCount: live.length };
    state.phase = "exchange";
    state.deadline = now() + RESPONSE_WINDOW_MS;
    log(state, `${actor.name} يبدّل أوراقه...`, "action");
}

export function resolveExchange(state: CoupGameState, playerName: string, keepIndices: number[]): void {
    if (state.phase !== "exchange" || !state.pendingExchange) throw new Error("لا يوجد تبديل الآن");
    if (state.pendingExchange.player !== playerName) throw new Error("ليس دورك للتبديل");
    const ex = state.pendingExchange;
    const uniq = Array.from(new Set(keepIndices));
    if (uniq.length !== ex.keepCount) throw new Error(`اختر ${ex.keepCount} ورقة بالضبط`);
    if (uniq.some((i) => i < 0 || i >= ex.options.length)) throw new Error("اختيار غير صحيح");

    const player = findPlayer(state, playerName)!;
    const kept = uniq.map((i) => ex.options[i]);
    const keptSet = [...kept];
    const returned: Character[] = [];
    ex.options.forEach((c, i) => {
        if (!uniq.includes(i)) returned.push(c);
    });

    // Rebuild influence: keep revealed slots, replace unrevealed with kept.
    const revealedSlots = player.influence.filter((i) => i.revealed);
    player.influence = [
        ...revealedSlots,
        ...keptSet.map((c) => ({ character: c, revealed: false })),
    ];

    state.deck.push(...returned);
    state.deck = shuffle(state.deck);
    log(state, `${player.name} أنهى التبديل`, "action");
    state.pendingExchange = null;
    endTurn(state);
    touch(state);
}

// ---------- challenges ----------

function challengeAction(state: CoupGameState, challenger: string): void {
    const pa = state.pending!;
    const claimed = pa.claimedCharacter!;
    const actor = findPlayer(state, pa.actor)!;
    log(state, `${challenger} يتحدّى ادعاء ${actor.name} بأنه ${CHARACTER_AR[claimed]}!`, "challenge");

    const hasIt = unrevealed(actor).some((i) => i.character === claimed);
    if (hasIt) {
        log(state, `${actor.name} كان صادقًا (${CHARACTER_AR[claimed]}) — ${challenger} يخسر ورقة`, "reveal");
        replaceCard(state, actor, claimed);
        beginLose(state, challenger, 1, "خسر التحدي", "afterActionChallengeActorWon");
    } else {
        log(state, `${actor.name} كان يكذب! يخسر ورقة`, "reveal");
        beginLose(state, actor.name, 1, "ضُبط يكذب", "cancelEndTurn");
    }
}

function challengeBlock(state: CoupGameState, challenger: string): void {
    const pa = state.pending!;
    const block = pa.block!;
    const blocker = findPlayer(state, block.blocker)!;
    log(state, `${challenger} يتحدّى صدّ ${blocker.name} (${CHARACTER_AR[block.claimedCharacter]})!`, "challenge");

    const hasIt = unrevealed(blocker).some((i) => i.character === block.claimedCharacter);
    if (hasIt) {
        log(state, `${blocker.name} كان صادقًا — الصدّ ينجح و${challenger} يخسر ورقة`, "reveal");
        replaceCard(state, blocker, block.claimedCharacter);
        beginLose(state, challenger, 1, "خسر تحدي الصدّ", "cancelEndTurn");
    } else {
        log(state, `${blocker.name} كان يكذب في الصدّ! يخسر ورقة ثم ينفذ الإجراء`, "reveal");
        beginLose(state, blocker.name, 1, "صدّ كاذب", "afterBlockChallengeApply");
    }
}

// ---------- public entry: perform action ----------

export function performAction(
    state: CoupGameState,
    actorName: string,
    type: ActionType,
    target?: string,
): void {
    if (state.status !== "playing" || state.phase !== "turn") throw new Error("ليس وقت اختيار إجراء");
    const actor = currentPlayer(state);
    if (!actor || actor.name !== actorName) throw new Error("ليس دورك");
    if (actor.eliminated) throw new Error("أنت خارج اللعبة");

    if (actor.coins >= 10 && type !== "coup") throw new Error("معك 10 ذهب أو أكثر — يجب أن تنفّذ انقلابًا");

    const needsTarget = type === "coup" || type === "assassinate" || type === "steal";
    if (needsTarget) {
        if (!target) throw new Error("اختر هدفًا");
        const t = findPlayer(state, target);
        if (!t || t.eliminated) throw new Error("هدف غير صالح");
        if (t.name === actor.name) throw new Error("لا يمكنك استهداف نفسك");
    }

    if (type === "coup" && actor.coins < 7) throw new Error("الانقلاب يحتاج 7 ذهب");
    if (type === "assassinate" && actor.coins < 3) throw new Error("الاغتيال يحتاج 3 ذهب");

    switch (type) {
        case "income":
            actor.coins += 1;
            log(state, `${actor.name} أخذ دخلًا (+1)`, "action");
            endTurn(state);
            break;
        case "coup":
            actor.coins -= 7;
            log(state, `${actor.name} نفّذ انقلابًا على ${target} (-7)`, "action");
            beginLose(state, target!, 1, "انقلاب", "endTurn");
            break;
        case "foreign_aid":
            state.pending = { type, actor: actor.name, passed: [] };
            log(state, `${actor.name} يحاول أخذ معونة أجنبية...`, "action");
            openBlockWindow(state);
            break;
        case "tax":
            state.pending = { type, actor: actor.name, claimedCharacter: "duke", passed: [] };
            log(state, `${actor.name} يدّعي الدوق ويأخذ ضريبة...`, "action");
            openChallengeWindow(state);
            break;
        case "exchange":
            state.pending = { type, actor: actor.name, claimedCharacter: "ambassador", passed: [] };
            log(state, `${actor.name} يدّعي السفير ويريد التبديل...`, "action");
            openChallengeWindow(state);
            break;
        case "steal":
            state.pending = { type, actor: actor.name, target, claimedCharacter: "captain", passed: [] };
            log(state, `${actor.name} يدّعي الكابتن ويسرق من ${target}...`, "action");
            openChallengeWindow(state);
            break;
        case "assassinate":
            actor.coins -= 3;
            state.pending = { type, actor: actor.name, target, claimedCharacter: "assassin", passed: [] };
            log(state, `${actor.name} يدّعي القاتل ويغتال ${target} (-3)...`, "action");
            openChallengeWindow(state);
            break;
    }
    touch(state);
}

// ---------- public entry: respond ----------

export function respond(
    state: CoupGameState,
    playerName: string,
    response: ResponseType,
    blockCharacter?: Character,
): void {
    const pa = state.pending;
    if (!pa) throw new Error("لا يوجد إجراء بانتظار رد");

    if (state.phase === "awaitChallenge") {
        const eligible = eligibleChallengers(state, pa.actor);
        if (!eligible.includes(playerName)) throw new Error("لا يمكنك الرد الآن");
        if (response === "challenge") {
            challengeAction(state, playerName);
        } else if (response === "pass") {
            if (!pa.passed.includes(playerName)) pa.passed.push(playerName);
            if (eligible.every((n) => pa.passed.includes(n))) {
                proceedAfterChallengePassed(state);
            }
        } else {
            throw new Error("لا يمكن الصدّ في هذه المرحلة");
        }
        touch(state);
        return;
    }

    if (state.phase === "awaitBlock") {
        const eligible = blockEligible(state);
        if (!eligible.includes(playerName)) throw new Error("لا يمكنك الرد الآن");
        if (response === "block") {
            if (!blockCharacter || !ACTION_BLOCKERS[pa.type].includes(blockCharacter)) {
                throw new Error("شخصية صدّ غير صالحة");
            }
            pa.block = { blocker: playerName, claimedCharacter: blockCharacter };
            log(state, `${playerName} يصدّ مدّعيًا ${CHARACTER_AR[blockCharacter]}`, "block");
            openBlockChallengeWindow(state);
        } else if (response === "pass") {
            if (!pa.passed.includes(playerName)) pa.passed.push(playerName);
            if (eligible.every((n) => pa.passed.includes(n))) {
                applyMainEffect(state);
            }
        } else {
            throw new Error("لا يمكن التحدّي في هذه المرحلة");
        }
        touch(state);
        return;
    }

    if (state.phase === "awaitBlockChallenge") {
        const eligible = eligibleChallengers(state, pa.block!.blocker);
        if (!eligible.includes(playerName)) throw new Error("لا يمكنك الرد الآن");
        if (response === "challenge") {
            challengeBlock(state, playerName);
        } else if (response === "pass") {
            if (!pa.passed.includes(playerName)) pa.passed.push(playerName);
            if (eligible.every((n) => pa.passed.includes(n))) {
                // Block stands; original action canceled.
                log(state, `الصدّ نجح — أُلغي ${ACTION_AR[pa.type]}`, "block");
                endTurn(state);
            }
        } else {
            throw new Error("لا يمكن الصدّ في هذه المرحلة");
        }
        touch(state);
        return;
    }

    throw new Error("لا يمكن الرد الآن");
}

// ---------- timeouts ----------

export function handleTimeout(state: CoupGameState): boolean {
    if (state.deadline == null || now() < state.deadline) return false;
    if (state.status !== "playing") return false;

    switch (state.phase) {
        case "turn": {
            // Auto take income to keep the game moving.
            const cp = currentPlayer(state);
            if (cp) {
                log(state, `انتهى وقت ${cp.name} — أخذ دخلًا تلقائيًا`, "system");
                performAction(state, cp.name, "income");
            }
            return true;
        }
        case "awaitChallenge":
        case "awaitBlock":
        case "awaitBlockChallenge": {
            // Everyone who hasn't responded is treated as "pass".
            const pa = state.pending;
            if (!pa) return false;
            const eligible =
                state.phase === "awaitBlock"
                    ? blockEligible(state)
                    : eligibleChallengers(state, state.phase === "awaitBlockChallenge" ? pa.block!.blocker : pa.actor);
            for (const n of eligible) if (!pa.passed.includes(n)) pa.passed.push(n);
            if (state.phase === "awaitChallenge") proceedAfterChallengePassed(state);
            else if (state.phase === "awaitBlock") applyMainEffect(state);
            else {
                log(state, `الصدّ نجح — أُلغي ${ACTION_AR[pa.type]}`, "block");
                endTurn(state);
            }
            touch(state);
            return true;
        }
        case "loseInfluence": {
            const pl = state.pendingLose;
            if (!pl) return false;
            const player = findPlayer(state, pl.player);
            if (player) {
                const live = player.influence.filter((i) => !i.revealed);
                if (live.length > 0) {
                    log(state, `انتهى وقت ${player.name} — خسر ورقة تلقائيًا`, "system");
                    resolveLose(state, pl.player, 0);
                    return true;
                }
            }
            return false;
        }
        case "exchange": {
            const ex = state.pendingExchange;
            if (!ex) return false;
            log(state, `انتهى وقت ${ex.player} — احتفظ بالأوراق تلقائيًا`, "system");
            const keep = Array.from({ length: ex.keepCount }, (_, i) => i);
            resolveExchange(state, ex.player, keep);
            return true;
        }
        default:
            return false;
    }
}

// ---------- reactions ----------

export function addReaction(state: CoupGameState, player: string, emoji: string): void {
    const clean = emoji.slice(0, 8);
    state.reactions.push({ id: `${now()}-${Math.random().toString(36).slice(2, 6)}`, player, emoji: clean, atMs: now() });
    if (state.reactions.length > 12) state.reactions = state.reactions.slice(-12);
    touch(state);
}

// ---------- projections ----------

export function redactPublic(state: CoupGameState): PublicGameState {
    const players: PublicPlayer[] = state.players.map((p) => ({
        name: p.name,
        coins: p.coins,
        eliminated: p.eliminated,
        connected: p.connected,
        isHost: p.isHost,
        influence: p.influence.map((i) =>
            i.revealed ? { revealed: true as const, character: i.character } : { revealed: false as const },
        ),
        influenceCount: p.influence.filter((i) => !i.revealed).length,
    }));

    return {
        roomId: state.roomId,
        status: state.status,
        hostName: state.hostName,
        players,
        deckCount: state.deck.length,
        turnIndex: state.turnIndex,
        currentPlayer: state.status === "playing" ? currentPlayer(state)?.name ?? null : null,
        phase: state.phase,
        pending: state.pending,
        pendingLose: state.pendingLose
            ? { player: state.pendingLose.player, count: state.pendingLose.count, reason: state.pendingLose.reason }
            : null,
        pendingExchange: state.pendingExchange
            ? { player: state.pendingExchange.player, keepCount: state.pendingExchange.keepCount }
            : null,
        deadline: state.deadline,
        log: state.log.slice(-30),
        reactions: state.reactions.slice(-12),
        winner: state.winner,
        updatedAtMs: state.updatedAtMs,
        version: state.version,
    };
}

export function getHandFor(state: CoupGameState, playerName: string): CoupHand {
    const p = findPlayer(state, playerName);
    if (!p) return { influence: [], exchangeOptions: null, exchangeKeepCount: 0 };
    const isExchanging = state.pendingExchange?.player === playerName;
    return {
        influence: p.influence.map((i) => ({ ...i })),
        exchangeOptions: isExchanging ? [...state.pendingExchange!.options] : null,
        exchangeKeepCount: isExchanging ? state.pendingExchange!.keepCount : 0,
    };
}
