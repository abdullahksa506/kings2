"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { gameServices, GameState, GamePlayer, Projectile, Enemy, MAP_SIZE, MAZE_WALLS, Direction } from "@/lib/gameServices";
import { X, Trophy, Play, Info, Flame } from "lucide-react";

// The local view grid size (how many tiles we see on screen)
const VIEW_SIZE = 15;
const TICK_RATE_MS = 250; // Slower tick for pac-man style (4 ticks per sec)
const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#a855f7", "#ec4899"];

export default function HungryKingsArena({
    isOpen,
    onClose,
    userName
}: {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
}) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [myColor, setMyColor] = useState(COLORS[0]);

    const directionRef = useRef<Direction>("NONE");
    const lastTickRef = useRef<number>(0);
    const joystickRef = useRef<{ active: boolean, startX: number, startY: number }>({ active: false, startX: 0, startY: 0 });

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Join Game
    const handleJoin = async () => {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        setMyColor(color);
        // Spawn on an open tile (1,1 is always open in our maze)
        const startX = 1;
        const startY = 1;
        await gameServices.initGameArea();
        await gameServices.joinGame(userName, color, startX, startY);
        directionRef.current = "NONE";
        setIsPlaying(true);
    };

    // Listen to Firebase State
    useEffect(() => {
        if (!isOpen) {
            if (isPlaying) {
                gameServices.leaveGame(userName);
                setIsPlaying(false);
            }
            return;
        }

        const unsubscribe = gameServices.listenToGameState((state) => {
            if (state) {
                setGameState(state);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [isOpen, userName]);

    // Cleanup on unmount/close
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isPlaying) {
                gameServices.leaveGame(userName);
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            if (isPlaying) {
                gameServices.leaveGame(userName);
            }
        };
    }, [isPlaying, userName]);

    // Fire Projectile
    const handleShoot = async () => {
        if (!isPlaying || !gameState) return;
        const myPlayer = gameState.players[userName];
        if (!myPlayer || myPlayer.direction === "NONE" || myPlayer.stunnedUntil > Date.now()) return;

        let dirX = 0, dirY = 0;
        if (myPlayer.direction === "UP") dirY = -1;
        if (myPlayer.direction === "DOWN") dirY = 1;
        if (myPlayer.direction === "LEFT") dirX = -1;
        if (myPlayer.direction === "RIGHT") dirX = 1;

        const proj: Projectile = {
            id: `proj_${Date.now()}_${Math.random()}`,
            x: myPlayer.x + dirX,
            y: myPlayer.y + dirY,
            dirX,
            dirY,
            owner: userName,
            createdAt: Date.now()
        };
        await gameServices.shootProjectile(proj);
    };

    // Keyboard Controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isPlaying) return;
            switch (e.key) {
                case "ArrowUp":
                case "w":
                case "W":
                    directionRef.current = "UP";
                    break;
                case "ArrowDown":
                case "s":
                case "S":
                    directionRef.current = "DOWN";
                    break;
                case "ArrowLeft":
                case "a":
                case "A":
                    directionRef.current = "LEFT";
                    break;
                case "ArrowRight":
                case "d":
                case "D":
                    directionRef.current = "RIGHT";
                    break;
                case " ":
                    e.preventDefault(); // Stop scrolling
                    handleShoot();
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying, gameState, userName]);

    // Mobile Virtual Joystick Logic
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!isPlaying) return;
        const touch = e.touches[0];
        joystickRef.current = { active: true, startX: touch.clientX, startY: touch.clientY };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isPlaying || !joystickRef.current.active) return;

        // Prevent default scrolling only on the canvas container
        e.preventDefault();

        const touch = e.touches[0];
        const dx = touch.clientX - joystickRef.current.startX;
        const dy = touch.clientY - joystickRef.current.startY;

        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            if (Math.abs(dx) > Math.abs(dy)) {
                directionRef.current = dx > 0 ? "RIGHT" : "LEFT";
            } else {
                directionRef.current = dy > 0 ? "DOWN" : "UP";
            }
            // Reset start point to make swipe continuous
            joystickRef.current = { active: true, startX: touch.clientX, startY: touch.clientY };
        }
    };

    const handleTouchEnd = () => {
        joystickRef.current.active = false;
    };

    // Game Logic Loop
    const gameTick = useCallback(async () => {
        if (!isPlaying || !gameState) return;

        const myPlayer = gameState.players[userName];
        if (!myPlayer) return;

        const now = Date.now();
        const isStunned = myPlayer.stunnedUntil > now;
        const isBoosted = myPlayer.speedBoostUntil > now;

        // Determine who is "host" (first player active recently)
        const activePlayers = Object.values(gameState.players).filter(p => (now - p.lastActive) < 5000);
        activePlayers.sort((a, b) => a.name.localeCompare(b.name));
        const isHost = activePlayers.length > 0 && activePlayers[0].name === userName;

        let scoreDelta = 0;
        let pUpdates: Partial<GamePlayer> = {};

        // 1. My Movement (Only if not stunned)
        if (!isStunned) {
            // Speed boost gives 2 steps instead of 1
            const steps = isBoosted ? 2 : 1;
            let nextX = myPlayer.x;
            let nextY = myPlayer.y;

            for (let i = 0; i < steps; i++) {
                let testY = nextY;
                let testX = nextX;
                if (directionRef.current === "UP") testY -= 1;
                if (directionRef.current === "DOWN") testY += 1;
                if (directionRef.current === "LEFT") testX -= 1;
                if (directionRef.current === "RIGHT") testX += 1;
                testX = Math.max(0, Math.min(MAP_SIZE - 1, testX));
                testY = Math.max(0, Math.min(MAP_SIZE - 1, testY));

                // Check wall collision
                if (MAZE_WALLS[testY][testX] === "0") {
                    nextX = testX;
                    nextY = testY;
                } else {
                    break; // stop moving if hit wall
                }
            }

            pUpdates.x = nextX;
            pUpdates.y = nextY;
            pUpdates.direction = directionRef.current;
        }

        const myNewX = pUpdates.x ?? myPlayer.x;
        const myNewY = pUpdates.y ?? myPlayer.y;

        // 2. Client Side Collisions (Food & Boosts)
        let newFoods = [...(gameState.foods || [])];
        let newBoosts = [...(gameState.boosts || [])];
        let itemsChanged = false;

        const foodIndex = newFoods.findIndex(f => f.x === myNewX && f.y === myNewY);
        if (foodIndex !== -1) {
            newFoods.splice(foodIndex, 1);
            scoreDelta += 10;
            itemsChanged = true;
        }

        const boostIndex = newBoosts.findIndex(f => f.x === myNewX && f.y === myNewY);
        if (boostIndex !== -1) {
            newBoosts.splice(boostIndex, 1);
            pUpdates.speedBoostUntil = now + 5000; // 5 sec boost
            itemsChanged = true;
        }

        // Commit my movement/score
        if (Object.keys(pUpdates).length > 0 || scoreDelta > 0) {
            await gameServices.updatePlayerIntent(userName, myNewX, myNewY, pUpdates.direction || myPlayer.direction, myPlayer.score + scoreDelta);
        }

        // 3. Host Logic (Projectiles, Enemies, Spawning)
        if (isHost && (now - gameState.lastHostUpdate > TICK_RATE_MS)) {
            let hostChangedState = false;

            // Helper to get random open tile
            const getRandomOpenTile = () => {
                let rx = 1, ry = 1;
                for (let i = 0; i < 50; i++) {
                    rx = Math.floor(Math.random() * MAP_SIZE);
                    ry = Math.floor(Math.random() * MAP_SIZE);
                    if (MAZE_WALLS[ry] && MAZE_WALLS[ry][rx] === "0") return { x: rx, y: ry };
                }
                return { x: 1, y: 1 };
            };

            // Spawn Food
            if (newFoods.length < 15 && Math.random() < 0.3) {
                newFoods.push(getRandomOpenTile());
                hostChangedState = true;
                itemsChanged = true; // prevent client overwrite below
            }

            // Spawn Boost
            if (newBoosts.length < 3 && Math.random() < 0.05) {
                newBoosts.push(getRandomOpenTile());
                hostChangedState = true;
                itemsChanged = true;
            }

            // Move Enemies
            let newEnemies = [...(gameState.enemies || [])];
            newEnemies = newEnemies.map(e => {
                let nx = e.x + e.dirX;
                let ny = e.y + e.dirY;

                // Randomly change direction occasionally or when hitting walls
                if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE || MAZE_WALLS[ny]?.[nx] !== "0" || Math.random() < 0.05) {
                    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                    const validDirs = dirs.filter(d => {
                        const tx = e.x + d[0];
                        const ty = e.y + d[1];
                        return tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE && MAZE_WALLS[ty]?.[tx] === "0";
                    });
                    const randDir = validDirs.length > 0 ? validDirs[Math.floor(Math.random() * validDirs.length)] : [0, 0];
                    return { ...e, dirX: randDir[0], dirY: randDir[1] };
                }

                // Basic player collision handled below logic, just move it safely here
                return { ...e, x: nx, y: ny };
            });
            hostChangedState = true;

            // Move Projectiles (they move 2-3 tiles per tick)
            let newProjectiles: Projectile[] = [];
            for (const p of (gameState.projectiles || [])) {
                if (now - p.createdAt > 3000) continue; // expires after 3 sec

                let nx = p.x;
                let ny = p.y;
                let hitWall = false;
                for (let s = 0; s < 2; s++) {
                    nx += p.dirX;
                    ny += p.dirY;
                    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE || MAZE_WALLS[ny]?.[nx] !== "0") {
                        hitWall = true;
                        break;
                    }
                }

                if (hitWall) continue; // break Projectile

                // Check collision with players
                let hitSomeone = false;
                for (const playerKey of Object.keys(gameState.players)) {
                    const py = gameState.players[playerKey];
                    if (py.name !== p.owner && Math.abs(py.x - nx) <= 1 && Math.abs(py.y - ny) <= 1 && py.stunnedUntil < now) {
                        // HIT!
                        // In a robust system, the host updates both players.
                        // Here, we update the victim's score/stun, and attacker's score.
                        try {
                            const attacker = gameState.players[p.owner];
                            if (attacker) {
                                await gameServices.updatePlayerStatus(p.owner, { score: attacker.score + 50 });
                            }
                            await gameServices.updatePlayerStatus(py.name, {
                                score: Math.max(0, py.score - 50),
                                stunnedUntil: now + 3000 // 3 seconds stun
                            });
                        } catch (e) { }
                        hitSomeone = true;
                        break;
                    }
                }

                if (!hitSomeone) {
                    newProjectiles.push({ ...p, x: nx, y: ny });
                }
            }
            hostChangedState = true;

            // Host Enemy collision logic  (Enemy -> Player)
            for (const e of newEnemies) {
                for (const playerKey of Object.keys(gameState.players)) {
                    const p = gameState.players[playerKey];
                    // Very simple radius check
                    if (Math.abs(p.x - e.x) <= 1 && Math.abs(p.y - e.y) <= 1 && p.stunnedUntil < now) {
                        gameServices.updatePlayerStatus(p.name, {
                            score: Math.max(0, p.score - 30),
                            stunnedUntil: now + 2000
                        });
                    }
                }
            }

            if (hostChangedState) {
                await gameServices.hostSyncEntities(newFoods, newBoosts, newEnemies, newProjectiles);
            }
        }
        // If cliet ate something but wasn't host, update it safely (Firestore merges this)
        else if (itemsChanged) {
            const currentEnms = gameState.enemies || [];
            const currentProj = gameState.projectiles || [];
            await gameServices.hostSyncEntities(newFoods, newBoosts, currentEnms, currentProj);
        }

    }, [isPlaying, gameState, userName]);

    // Tick Interval
    useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            gameTick();
        }, TICK_RATE_MS);
        return () => clearInterval(interval);
    }, [isPlaying, gameTick]);

    // Rendering Canvas with Camera Follow
    useEffect(() => {
        if (!canvasRef.current || !gameState) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        const myPlayer = gameState.players[userName];
        if (!myPlayer) return;

        const canvas = canvasRef.current;
        const width = canvas.width;
        const height = canvas.height;
        const cellSize = width / VIEW_SIZE;

        // Calculate Camera Bounds (Centered on player)
        let camX = myPlayer.x - Math.floor(VIEW_SIZE / 2);
        let camY = myPlayer.y - Math.floor(VIEW_SIZE / 2);

        // Clamping camera to bounds so we don't show infinite void outside map
        camX = Math.max(0, Math.min(MAP_SIZE - VIEW_SIZE, camX));
        camY = Math.max(0, Math.min(MAP_SIZE - VIEW_SIZE, camY));

        ctx.fillStyle = "#020617"; // slate-950
        ctx.fillRect(0, 0, width, height);

        // Helper to convert world grid to screen pixels
        const toScreen = (worldX: number, worldY: number) => ({
            sx: (worldX - camX) * cellSize,
            sy: (worldY - camY) * cellSize
        });

        const isVisible = (x: number, y: number) => {
            return x >= camX && x < camX + VIEW_SIZE && y >= camY && y < camY + VIEW_SIZE;
        }

        // Draw Map Boundaries & Grid
        ctx.strokeStyle = "#0f172a"; // dark grid
        ctx.lineWidth = 1;
        for (let i = 0; i <= MAP_SIZE; i++) {
            // Verticals
            if (i >= camX && i <= camX + VIEW_SIZE) {
                const sx = (i - camX) * cellSize;
                ctx.beginPath();
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, height);
                ctx.stroke();
            }
            // Horizontals
            if (i >= camY && i <= camY + VIEW_SIZE) {
                const sy = (i - camY) * cellSize;
                ctx.beginPath();
                ctx.moveTo(0, sy);
                ctx.lineTo(width, sy);
                ctx.stroke();
            }
        }

        // Draw Map Border
        ctx.strokeStyle = "#475569"; // slate-600 border
        ctx.lineWidth = 4;
        const p1 = toScreen(0, 0);
        const p2 = toScreen(MAP_SIZE, MAP_SIZE);
        ctx.strokeRect(p1.sx, p1.sy, p2.sx - p1.sx, p2.sy - p1.sy);

        // Draw Maze Walls
        ctx.fillStyle = "#1e3a8a"; // deep blue
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#3b82f6";
        for (let y = 0; y < MAP_SIZE; y++) {
            for (let x = 0; x < MAP_SIZE; x++) {
                if (MAZE_WALLS[y] && MAZE_WALLS[y][x] === "1") {
                    if (isVisible(x, y)) {
                        const s = toScreen(x, y);
                        // Slightly inset for modern look
                        ctx.fillRect(s.sx, s.sy, cellSize, cellSize);
                        ctx.strokeStyle = "#60a5fa"; // light blue border
                        ctx.lineWidth = 2;
                        ctx.strokeRect(s.sx + 2, s.sy + 2, cellSize - 4, cellSize - 4);
                    }
                }
            }
        }
        ctx.shadowBlur = 0;


        // Render Things
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw Foods
        ctx.font = `${cellSize * 0.6}px Arial`;
        (gameState.foods || []).forEach(food => {
            if (isVisible(food.x, food.y)) {
                const s = toScreen(food.x, food.y);
                ctx.fillText("🍔", s.sx + cellSize / 2, s.sy + cellSize / 2);
            }
        });

        // Draw Boosts
        ctx.font = `${cellSize * 0.7}px Arial`;
        (gameState.boosts || []).forEach(b => {
            if (isVisible(b.x, b.y)) {
                const s = toScreen(b.x, b.y);
                ctx.fillText("⚡", s.sx + cellSize / 2, s.sy + cellSize / 2);
            }
        });

        // Draw Enemies
        ctx.font = `${cellSize * 0.7}px Arial`;
        (gameState.enemies || []).forEach(e => {
            if (isVisible(e.x, e.y)) {
                const s = toScreen(e.x, e.y);
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ef4444";
                ctx.fillText("📉", s.sx + cellSize / 2, s.sy + cellSize / 2);
                ctx.shadowBlur = 0;
            }
        });

        // Draw Projectiles
        ctx.font = `${cellSize * 0.5}px Arial`;
        (gameState.projectiles || []).forEach(p => {
            if (isVisible(p.x, p.y)) {
                const s = toScreen(p.x, p.y);
                // Draw a tomato or bullet
                ctx.fillText("🍅", s.sx + cellSize / 2, s.sy + cellSize / 2);
            }
        });

        const now = Date.now();

        // Draw Players
        Object.values(gameState.players || {}).forEach(player => {
            if (!isVisible(player.x, player.y)) return;

            const s = toScreen(player.x, player.y);
            const cx = s.sx + cellSize / 2;
            const cy = s.sy + cellSize / 2;

            const isStunned = player.stunnedUntil > now;
            const isBoosted = player.speedBoostUntil > now;

            // Draw shadow/glow
            ctx.shadowBlur = isBoosted ? 20 : 10;
            ctx.shadowColor = isStunned ? "#64748b" : (isBoosted ? "#fde047" : player.color);
            ctx.fillStyle = isStunned ? "#334155" : player.color;

            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.4, 0, 2 * Math.PI);
            ctx.fill();

            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            if (isBoosted) {
                // Flashy border for boost
                ctx.strokeStyle = "#fbbf24";
                ctx.lineWidth = 4;
            }
            ctx.stroke();

            ctx.shadowBlur = 0;

            if (isStunned) {
                ctx.font = `${cellSize * 0.5}px Arial`;
                ctx.fillText("😵", cx, cy + 2);
            } else {
                ctx.font = `${cellSize * 0.5}px Arial`;
                ctx.fillText("👑", cx, cy + 2);
            }

            // Direction indicator
            const lineLen = cellSize * 0.4;
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            if (player.direction === "UP") ctx.lineTo(cx, cy - lineLen);
            else if (player.direction === "DOWN") ctx.lineTo(cx, cy + lineLen);
            else if (player.direction === "LEFT") ctx.lineTo(cx - lineLen, cy);
            else if (player.direction === "RIGHT") ctx.lineTo(cx + lineLen, cy);
            ctx.stroke();

            // Name
            ctx.font = `bold ${cellSize * 0.3}px Arial`;
            ctx.fillStyle = isStunned ? "#94a3b8" : "#ffffff";
            ctx.fillText(player.name, cx, cy - cellSize * 0.6);
        });

    }, [gameState]);

    if (!isOpen) return null;

    const sortedPlayers = Object.values(gameState?.players || {}).sort((a, b) => b.score - a.score);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-md overflow-hidden">
            <div className="w-full h-full max-w-7xl mx-auto flex flex-col relative">

                {/* Header */}
                <div className="flex justify-between items-center p-3 sm:p-4 border-b border-slate-800 bg-slate-950 z-10 shrink-0">
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                        صراع الملوك الجياع
                    </h2>

                    <div className="flex items-center gap-4">
                        {isPlaying && gameState?.players[userName] && (
                            <div className="hidden sm:flex items-center gap-3 bg-slate-900 border border-slate-700 px-4 py-1.5 rounded-full">
                                <span className="text-slate-400 text-sm">سكورك:</span>
                                <span className="font-mono text-xl font-bold text-emerald-400">{gameState.players[userName].score}</span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">

                    {/* Left Panel: Game Arena */}
                    <div
                        className="flex-1 w-full flex items-center justify-center relative bg-slate-900 touch-none"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {!isPlaying && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 text-center">
                                <h3 className="text-3xl font-bold text-white mb-4">أهلاً في الحلبة المفتوحة يا {userName}</h3>
                                <div className="space-y-4 text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
                                    <p>🎮 <strong>التحكم بالكمبيوتر:</strong> أسهم الكيبورد أو WASD للحركة، و <strong>المسافة (Space) للرمي</strong>.</p>
                                    <p>📱 <strong>التحكم بالجوال:</strong> اسحب الشاشة بأصبعك (Swipe) للتحرك، واستخدم زر (ارمي 🍅) للتصويب.</p>
                                    <p>طارد اخوياك، اسرق نقاطهم بالرمي، كل 🍔، واشرب طاقة ⚡، وانتبه من التقاييم السيئة 📉!</p>
                                </div>
                                <button
                                    onClick={handleJoin}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 px-12 rounded-[2rem] text-xl flex items-center gap-3 transition-transform hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    ادخل المعركة
                                </button>
                            </div>
                        )}

                        <div className="relative w-full h-full max-w-[800px] max-h-[800px] border-y lg:border-4 border-slate-800 lg:rounded-2xl overflow-hidden shadow-2xl bg-[#020617] mx-auto aspect-square">
                            {/* High-res internal canvas, scales via CSS */}
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={800}
                                className="w-full h-full block"
                            />
                        </div>

                        {/* Mobile HUD Controls */}
                        {isPlaying && (
                            <div className="absolute bottom-6 right-6 lg:hidden z-30">
                                <button
                                    onClick={handleShoot}
                                    className="w-20 h-20 bg-red-500/20 backdrop-blur-md hover:bg-red-500/40 border-2 border-red-500/50 rounded-full flex flex-col items-center justify-center shadow-lg active:scale-90 transition-transform"
                                >
                                    <span className="text-2xl">🍅</span>
                                    <span className="text-xs font-bold text-red-200 mt-1">ارمي</span>
                                </button>
                            </div>
                        )}
                        {/* Mobile Score Display */}
                        {isPlaying && gameState?.players[userName] && (
                            <div className="absolute top-4 left-4 lg:hidden z-30 bg-slate-900/80 backdrop-blur-sm border border-slate-700 px-4 py-2 rounded-2xl shadow-lg">
                                <span className="text-xl font-bold text-amber-500">{gameState.players[userName].score} pts</span>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Leaderboard & Info */}
                    <div className="w-full h-48 lg:h-auto lg:w-80 border-t lg:border-t-0 lg:border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
                        {/* Status */}
                        <div className="p-4 border-b border-slate-800 bg-slate-900">
                            <h3 className="text-amber-500 font-semibold flex items-center gap-2 mb-2">
                                <Info className="w-4 h-4" />
                                غرفة الانتظار
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                الملوك في الخريطة: {sortedPlayers.length}
                            </div>
                        </div>

                        {/* Leaderboard Scroll Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                ترتيب المعركة
                            </h3>

                            {sortedPlayers.length === 0 ? (
                                <div className="text-center p-6 text-slate-500 text-sm">الخريطة فارغة... كن أول من يدخل!</div>
                            ) : (
                                sortedPlayers.map((player, idx) => {
                                    const isMe = player.name === userName;
                                    const isStunned = player.stunnedUntil > Date.now();
                                    return (
                                        <div key={player.name} className={`flex items-center justify-between p-3 rounded-xl border ${isMe ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/40 border-slate-700/50'} transition-all`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`font-bold w-4 text-center ${idx === 0 ? 'text-amber-500 text-lg' : 'text-slate-500'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div
                                                    className={`w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg relative ${isMe ? 'ring-2 ring-amber-500/50' : ''}`}
                                                    style={{ backgroundColor: player.color }}
                                                >
                                                    {isStunned ? "😵" : "👑"}
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className={`font-semibold ${isMe ? 'text-amber-400' : 'text-slate-300'}`}>
                                                        {player.name}
                                                    </span>
                                                    {isStunned && <span className="text-[10px] text-red-400 font-medium">مغمى عليه</span>}
                                                </div>
                                            </div>
                                            <div className="font-mono font-bold text-emerald-400 text-lg">
                                                {player.score}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
