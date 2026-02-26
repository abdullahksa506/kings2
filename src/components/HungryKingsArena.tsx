"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { gameServices, GameState, GamePlayer } from "@/lib/gameServices";
import { X, Trophy, Play, Info } from "lucide-react";

const GRID_SIZE = 20;
const TICK_RATE_MS = 300; // 300ms per move
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
    const directionRef = useRef<"UP" | "DOWN" | "LEFT" | "RIGHT" | "NONE">("NONE");
    const lastTickRef = useRef<number>(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Join Game
    const handleJoin = async () => {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        setMyColor(color);
        const startX = Math.floor(Math.random() * GRID_SIZE);
        const startY = Math.floor(Math.random() * GRID_SIZE);
        await gameServices.initGameArea(); // Ensure doc exists
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
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPlaying]);

    // Mobile D-Pad Control
    const setDirection = (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
        if (isPlaying) directionRef.current = dir;
    };

    // Game Logic Loop
    const gameTick = useCallback(async () => {
        if (!isPlaying || !gameState) return;

        const myPlayer = gameState.players[userName];
        if (!myPlayer) return;

        let nextX = myPlayer.x;
        let nextY = myPlayer.y;

        // Calculate next position
        if (directionRef.current === "UP") nextY -= 1;
        if (directionRef.current === "DOWN") nextY += 1;
        if (directionRef.current === "LEFT") nextX -= 1;
        if (directionRef.current === "RIGHT") nextX += 1;

        // Wall collisions
        nextX = Math.max(0, Math.min(GRID_SIZE - 1, nextX));
        nextY = Math.max(0, Math.min(GRID_SIZE - 1, nextY));

        let scoreDelta = 0;
        let newFoods = [...(gameState.foods || [])];
        let ateFood = false;

        // Food collision
        const foodIndex = newFoods.findIndex(f => f.x === nextX && f.y === nextY);
        if (foodIndex !== -1) {
            newFoods.splice(foodIndex, 1);
            scoreDelta += 10;
            ateFood = true;
        }

        // Host logic for spawning food (if there's no food, any player can spawn it randomly)
        // Only one player will successfully spawn due to Firestore race, which is fine
        if (newFoods.length < 5 && Math.random() < 0.2) {
            newFoods.push({
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            });
            ateFood = true; // Trigger updateItems
        }

        // If I moved or scored
        if (nextX !== myPlayer.x || nextY !== myPlayer.y || scoreDelta > 0) {
            await gameServices.updatePlayerState(userName, {
                x: nextX,
                y: nextY,
                score: myPlayer.score + scoreDelta,
                direction: directionRef.current
            });
        }

        if (ateFood) {
            await gameServices.updateItems(newFoods, gameState.powerup);
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

    // Rendering Canvas
    useEffect(() => {
        if (!canvasRef.current || !gameState) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        const canvas = canvasRef.current;
        const width = canvas.width;
        const height = canvas.height;
        const cellSize = width / GRID_SIZE;

        // Clear canvas
        ctx.fillStyle = "#020617"; // slate-950
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = "#1e293b"; // slate-800
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(width, i * cellSize);
            ctx.stroke();
        }

        // Draw Foods
        ctx.font = `${cellSize * 0.7}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        (gameState.foods || []).forEach(food => {
            const x = food.x * cellSize + cellSize / 2;
            const y = food.y * cellSize + cellSize / 2;
            ctx.fillText("🍔", x, y);
        });

        // Draw Players
        Object.values(gameState.players || {}).forEach(player => {
            const x = player.x * cellSize + cellSize / 2;
            const y = player.y * cellSize + cellSize / 2;

            // Simple shadow/glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = player.color;
            ctx.fillStyle = player.color;

            // Draw circle
            ctx.beginPath();
            ctx.arc(x, y, cellSize * 0.4, 0, 2 * Math.PI);
            ctx.fill();

            // Draw border
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            ctx.shadowBlur = 0;

            // Draw Crown for King or simple eye indicates direction
            // Keep it simple with crown emoji for kings
            ctx.fillText("👑", x, y + 2);

            // Draw name tag
            ctx.font = `bold ${cellSize * 0.35}px Arial`;
            ctx.fillStyle = "#ffffff";
            ctx.fillText(player.name, x, y - cellSize * 0.6);
        });

    }, [gameState]);

    if (!isOpen) return null;

    // Leaderboard sorted by score
    const sortedPlayers = Object.values(gameState?.players || {}).sort((a, b) => b.score - a.score);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/90 backdrop-blur-sm">
            <div className="bg-slate-900 border border-amber-500/30 shadow-2xl rounded-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col relative overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950 z-10">
                    <h2 className="text-xl sm:text-2xl font-bold text-amber-500 flex items-center gap-3">
                        <Trophy className="w-6 h-6" />
                        صراع الملوك الجياع
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                    {/* Left Panel: Game Arena */}
                    <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center relative bg-slate-950 min-h-[50vh]">
                        {!isPlaying && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 text-center">
                                <h3 className="text-3xl font-bold text-white mb-4">هل أنت مستعد يا {userName}؟</h3>
                                <p className="text-slate-400 mb-8 max-w-md">
                                    تحكم بالملك عبر الأسهم أو الأزرار. اجمع البرجر 🍔 لزيادة نقاطك! احذر، اللعبة لا تتوقف عن التحديث.
                                </p>
                                <button
                                    onClick={handleJoin}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 px-10 rounded-full text-xl flex items-center gap-3 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    العب الآن
                                </button>
                            </div>
                        )}

                        <div className="relative w-full aspect-square max-w-[600px] border-4 border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                            {/* Force internal canvas resolution to 600x600 for sharp grid */}
                            <canvas
                                ref={canvasRef}
                                width={600}
                                height={600}
                                className="w-full h-full block bg-slate-950"
                            />
                        </div>

                        {/* Mobile D-Pad */}
                        {isPlaying && (
                            <div className="mt-4 grid grid-cols-3 gap-2 lg:hidden">
                                <div></div>
                                <button onClick={() => setDirection("UP")} className="bg-slate-800 active:bg-slate-700 p-4 rounded-xl flex justify-center text-white font-bold opacity-80 backdrop-blur">⬆️</button>
                                <div></div>
                                <button onClick={() => setDirection("LEFT")} className="bg-slate-800 active:bg-slate-700 p-4 rounded-xl flex justify-center text-white font-bold opacity-80 backdrop-blur">⬅️</button>
                                <button onClick={() => setDirection("DOWN")} className="bg-slate-800 active:bg-slate-700 p-4 rounded-xl flex justify-center text-white font-bold opacity-80 backdrop-blur">⬇️</button>
                                <button onClick={() => setDirection("RIGHT")} className="bg-slate-800 active:bg-slate-700 p-4 rounded-xl flex justify-center text-white font-bold opacity-80 backdrop-blur">➡️</button>
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Leaderboard & Info */}
                    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-r border-slate-800 bg-slate-900/50 p-4 flex flex-col h-full overflow-y-auto">

                        {/* Status */}
                        <div className="mb-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                            <h3 className="text-amber-500 font-semibold flex items-center gap-2 mb-2">
                                <Info className="w-4 h-4" />
                                حالة اللعبة عبر الأونلاين
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                اللاعبين المتواجدين حالياً: {sortedPlayers.length}
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            الملوك المتصدرين
                        </h3>
                        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                            {sortedPlayers.length === 0 ? (
                                <p className="text-slate-500 text-sm text-center py-8">لا يوجد لاعبين في التحدي الآن</p>
                            ) : (
                                sortedPlayers.map((player, idx) => (
                                    <div key={player.name} className={`flex items-center justify-between p-3 rounded-xl border ${player.name === userName ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'} transition-colors`}>
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-slate-500 w-4">{idx + 1}</div>
                                            <div
                                                className="w-8 h-8 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg"
                                                style={{ backgroundColor: player.color }}
                                            >👑</div>
                                            <span className={`font-semibold ${player.name === userName ? 'text-amber-400' : 'text-slate-300'}`}>
                                                {player.name} {player.name === userName && "(أنت)"}
                                            </span>
                                        </div>
                                        <div className="font-mono font-bold text-emerald-400">
                                            {player.score}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
