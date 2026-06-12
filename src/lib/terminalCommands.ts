/**
 * Live terminal command registry — pure dispatcher used by /terminal.
 * Each command is async, returns lines to print, optional ok/error flag,
 * and a clear hint. Handlers call the existing services/RPC so the
 * terminal mode shares the same source of truth as the normal site.
 */

import { services, WeekSession } from "./services";
import { impromptuServices } from "./impromptuServices";

export interface TerminalContext {
    user: { name: string; role?: string } | null;
    week: WeekSession | null;
    pastWeek: WeekSession | null;
}

export interface CommandResult {
    lines: string[];
    error?: boolean;
    ok?: boolean;
    clear?: boolean;
}

export interface CommandSpec {
    name: string;
    aliases: string[];
    description: string;
    category: "info" | "action" | "system";
    handler: (args: string, ctx: TerminalContext) => Promise<CommandResult> | CommandResult;
}

// --- helpers ---

function need(ctx: TerminalContext, w: WeekSession | null = ctx.week): WeekSession {
    if (!w) throw new Error("لا يوجد أسبوع نشط حالياً.");
    return w;
}

function needUser(ctx: TerminalContext) {
    if (!ctx.user?.name) throw new Error("لازم تسجل الدخول.");
    return ctx.user.name;
}

function err(msg: string): CommandResult {
    return { lines: [`❌ ${msg}`], error: true };
}

function ok(lines: string[]): CommandResult {
    return { lines, ok: true };
}

// --- COMMANDS ---

export const COMMANDS: CommandSpec[] = [
    {
        name: "help",
        aliases: ["help", "h", "؟", "مساعدة", "الأوامر", "الاوامر"],
        description: "قائمة الأوامر",
        category: "system",
        handler: () => ({
            lines: [
                "═══════════ الأوامر المتاحة ═══════════",
                "",
                "📖 معلومات:",
                "  الملك / king          → ملك الأسبوع",
                "  الأسبوع / week        → كل تفاصيل الأسبوع",
                "  حاضرين / attending    → من حاضر",
                "  معتذرين / absent      → من معتذر",
                "  المتصدرين / top       → أعلى التقييمات",
                "  التصويت / vote        → حالة التصويت",
                "  الإحصائيات / stats    → ملخص أرقام",
                "  الوقت / time          → كم باقي للطلعة",
                "",
                "✍️  أوامر:",
                "  حاضر                  → سجّل حضوري",
                "  معتذر                 → سجّل اعتذاري",
                "  قيّم <1-5>             → قيّم طلعة هذا الأسبوع",
                "  صوّت <اسم>             → صوّت في تصويت المطعم",
                "  فاضي [رسالة]          → ابدأ لقاء مفاجئ",
                "",
                "🛠️  نظام:",
                "  مسح / clear           → امسح الشاشة",
                "  whoami / أنا           → من أنا في النظام",
                "",
            ],
        }),
    },

    {
        name: "king",
        aliases: ["king", "الملك", "ملك"],
        description: "ملك الأسبوع",
        category: "info",
        handler: (_, ctx) => {
            try {
                const w = need(ctx);
                return ok([
                    `👑 الملك:     ${w.king || "(لم يحدد)"}`,
                    `🗓️  اليوم:    ${w.day || "(لم يحدد)"}`,
                    `🍽️  المطعم:   ${w.restaurant || "(لم يحدد)"}`,
                    w.isRandom ? "🎲 (هذا أسبوع عشوائي)" : "",
                ].filter(Boolean));
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "week",
        aliases: ["week", "الأسبوع", "الاسبوع", "أسبوع", "اسبوع"],
        description: "تفاصيل الأسبوع كاملة",
        category: "info",
        handler: (_, ctx) => {
            try {
                const w = need(ctx);
                const attending = (w.responded || []).filter((n) => !(w.absentees || []).includes(n));
                const absent = w.absentees || [];
                const noResponse = 6 - (w.responded || []).length;
                return ok([
                    `📋 ─── الأسبوع #${w.weekNumber} (دورة ${w.cycleNumber}) ───`,
                    `👑 الملك:     ${w.king || "(لم يحدد)"}`,
                    `🗓️  اليوم:    ${w.day || "(لم يحدد)"}`,
                    `🍽️  المطعم:   ${w.restaurant || "(لم يحدد)"}`,
                    `─────────────────────────────────`,
                    `✅ حاضرين:   ${attending.length} (${attending.join("، ") || "—"})`,
                    `❌ معتذرين:  ${absent.length} (${absent.join("، ") || "—"})`,
                    `❓ ما ردوا:  ${noResponse}`,
                    `─────────────────────────────────`,
                    w.ratingEnabled ? "⭐ التقييم مفتوح" : "🔒 التقييم مقفل",
                ]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "attending",
        aliases: ["attending", "حاضرين", "حضور"],
        description: "قائمة الحاضرين",
        category: "info",
        handler: (_, ctx) => {
            try {
                const w = need(ctx);
                const attending = (w.responded || []).filter((n) => !(w.absentees || []).includes(n));
                if (attending.length === 0) return ok(["لا أحد سجّل حضوره بعد."]);
                return ok([
                    `✅ ${attending.length} حاضر:`,
                    ...attending.map((n, i) => `  ${i + 1}. ${n}`),
                ]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "absent",
        aliases: ["absent", "معتذرين", "معتذر-القائمة"],
        description: "قائمة المعتذرين",
        category: "info",
        handler: (_, ctx) => {
            try {
                const w = need(ctx);
                const absent = w.absentees || [];
                if (absent.length === 0) return ok(["لا يوجد معتذرين 🎉"]);
                return ok([
                    `❌ ${absent.length} معتذر:`,
                    ...absent.map((n, i) => `  ${i + 1}. ${n}`),
                ]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "vote",
        aliases: ["vote", "التصويت", "تصويت"],
        description: "حالة تصويت المطعم",
        category: "info",
        handler: (_, ctx) => {
            try {
                const w = need(ctx);
                if (!w.restaurantVotingActive) {
                    return ok([
                        w.restaurantVotingResult
                            ? `🏁 آخر تصويت انتهى. الفائز: ${w.restaurantVotingResult}`
                            : "لا يوجد تصويت مطعم نشط.",
                    ]);
                }
                const cands = w.restaurantCandidates || [];
                const votes = w.restaurantVotes || {};
                const counts: Record<string, number> = {};
                cands.forEach((c) => (counts[c] = 0));
                Object.values(votes).forEach((v) => {
                    if (typeof v === "string" && counts[v] !== undefined) counts[v]++;
                });
                const total = Object.values(counts).reduce((s, n) => s + n, 0);
                return ok([
                    "🗳️  تصويت المطعم نشط:",
                    ...cands.map((c) => {
                        const n = counts[c];
                        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                        const bar = "█".repeat(Math.round(pct / 10));
                        return `  ${c.padEnd(18, " ")} ${bar.padEnd(10, "░")} ${n} (${pct}%)`;
                    }),
                    `─────────────────────`,
                    `إجمالي الأصوات: ${total}`,
                ]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "stats",
        aliases: ["stats", "الإحصائيات", "احصائيات", "الاحصائيات"],
        description: "إحصائيات سريعة",
        category: "info",
        handler: async () => {
            try {
                const s = await services.getStatistics();
                return ok([
                    "📊 ─── إحصائيات سريعة ───",
                    `🏰 عدد الطلعات:    ${s.totalOutings}`,
                    `🔄 عدد الدورات:    ${s.totalCycles}`,
                    `🍽️  مطاعم مختلفة:  ${s.uniqueRestaurants}`,
                    `📈 متوسط الحضور:   ${s.avgAttendancePerWeek}`,
                    `📅 أيام منذ البداية: ${s.daysSinceFirst}`,
                    "───────────────────────",
                    `🏆 الأكثر حضوراً:  ${s.funFacts?.mostAttendant?.name || "—"}`,
                    `👑 الأكثر ملكاً:   ${s.funFacts?.mostKing?.name || "—"}`,
                ]);
            } catch {
                return err("تعذّر جلب الإحصائيات.");
            }
        },
    },

    {
        name: "top",
        aliases: ["top", "المتصدرين", "متصدرين", "ترتيب"],
        description: "أعلى التقييمات (الملوك)",
        category: "info",
        handler: async () => {
            try {
                const s: any = await services.getStatistics();
                const ranked = (s.kingDecisionAnalytics || [])
                    .filter((k: any) => k.outings > 0)
                    .sort((a: any, b: any) => b.avgScore - a.avgScore)
                    .slice(0, 5);
                if (ranked.length === 0) return ok(["لا توجد تقييمات بعد."]);
                return ok([
                    "🏆 ─── المتصدرين كملوك ───",
                    ...ranked.map((m: any, i: number) => {
                        const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
                        return `  ${medal} ${(m.king || "").padEnd(10, " ")} ${m.avgScore?.toFixed(1) || "—"} (${m.outings} طلعات)`;
                    }),
                ]);
            } catch {
                return err("تعذّر جلب الترتيب.");
            }
        },
    },

    {
        name: "time",
        aliases: ["time", "الوقت", "وقت"],
        description: "كم باقي للطلعة",
        category: "info",
        handler: (_, ctx) => {
            const w = ctx.week;
            if (!w || !w.day) return ok(["⏳ يوم الطلعة لم يحدد بعد."]);

            const dayIndex: Record<string, number> = {
                "السبت": 6, "الأحد": 0, "الإثنين": 1, "الثلاثاء": 2,
                "الأربعاء": 3, "الخميس": 4, "الجمعة": 5,
            };
            const target = dayIndex[w.day];
            if (target === undefined) return ok([`📅 يوم الطلعة: ${w.day}`]);

            const now = new Date();
            const today = now.getDay();
            let diff = target - today;
            if (diff < 0) diff += 7;
            if (diff === 0) return ok([`🔥 الطلعة اليوم! (${w.day})`]);
            return ok([
                `⏳ باقي ${diff} يوم على طلعة ${w.day}`,
                `🍽️  المطعم: ${w.restaurant || "(لم يحدد)"}`,
            ]);
        },
    },

    {
        name: "whoami",
        aliases: ["whoami", "أنا", "انا"],
        description: "من أنا في النظام",
        category: "system",
        handler: (_, ctx) => {
            if (!ctx.user) return err("غير مسجل دخول.");
            return ok([
                `👤 ${ctx.user.name}`,
                `🎭 الدور: ${ctx.user.role || "user"}`,
                ctx.week?.king === ctx.user.name ? "👑 وأنت ملك هذا الأسبوع!" : "",
            ].filter(Boolean));
        },
    },

    {
        name: "clear",
        aliases: ["clear", "cls", "مسح"],
        description: "امسح الشاشة",
        category: "system",
        handler: () => ({ lines: [], clear: true }),
    },

    // ─── ACTION COMMANDS ──────────────────────────────────────────────

    {
        name: "present",
        aliases: ["present", "حاضر", "حضور+"],
        description: "سجّل حضوري",
        category: "action",
        handler: async (_, ctx) => {
            try {
                const w = need(ctx);
                const me = needUser(ctx);
                if (me === w.king) return err("الملك ما يسجّل حضور — أنت بادي الطلعة 👑");
                await services.toggleAttendance(w.id, me, false);
                return ok([`✅ تم تسجيل حضورك يا ${me}.`]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "absent-me",
        aliases: ["absent-me", "معتذر"],
        description: "سجّل اعتذاري",
        category: "action",
        handler: async (_, ctx) => {
            try {
                const w = need(ctx);
                const me = needUser(ctx);
                if (me === w.king) return err("الملك ما يعتذر عن طلعته 👑");
                await services.toggleAttendance(w.id, me, true);
                return ok([`📝 تم تسجيل اعتذارك يا ${me}.`]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "rate",
        aliases: ["rate", "قيّم", "قيم"],
        description: "قيّم طلعة (1-5)",
        category: "action",
        handler: async (args, ctx) => {
            try {
                const w = need(ctx);
                const me = needUser(ctx);
                if (!w.ratingEnabled) return err("التقييم مقفل حالياً.");
                if (w.king === me) return err("الملك ما يقيّم طلعته.");
                const score = parseInt(args.trim(), 10);
                if (!score || score < 1 || score > 5) return err("الاستخدام: قيّم <رقم من 1 إلى 5>");
                await services.submitRating({ weekId: w.id, rating: score, restaurantName: w.restaurant || undefined });
                return ok([`⭐ تم تسجيل تقييمك ${score}/5 لطلعة ${w.restaurant || w.day}.`]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "voteFor",
        aliases: ["vote-for", "صوّت", "صوت"],
        description: "صوّت في تصويت المطعم",
        category: "action",
        handler: async (args, ctx) => {
            try {
                const w = need(ctx);
                needUser(ctx);
                if (!w.restaurantVotingActive) return err("لا يوجد تصويت مطعم نشط.");
                const name = args.trim();
                if (!name) return err(`الاستخدام: صوّت <اسم المطعم>\nالمطاعم المتاحة: ${(w.restaurantCandidates || []).join("، ")}`);
                const cands = w.restaurantCandidates || [];
                const match = cands.find((c) => c === name) || cands.find((c) => c.includes(name));
                if (!match) return err(`المطعم "${name}" مو من المتاحين.`);
                await services.submitRestaurantVote(w.id, match);
                return ok([`🗳️  تم تسجيل صوتك لـ ${match}.`]);
            } catch (e: any) {
                return err(e.message);
            }
        },
    },

    {
        name: "free",
        aliases: ["free", "فاضي"],
        description: "ابدأ لقاء مفاجئ",
        category: "action",
        handler: async (args, ctx) => {
            try {
                needUser(ctx);
                const message = args.trim();
                await impromptuServices.startMeetup(message);
                return ok([
                    "🚨 بدأت لقاء مفاجئ! تم إشعار الجميع.",
                    message ? `   رسالتك: "${message}"` : "",
                    "   عندهم 15 دقيقة يردّون.",
                ].filter(Boolean));
            } catch (e: any) {
                return err(e.message || "تعذّر بدء اللقاء.");
            }
        },
    },
];

// --- Dispatcher ---

export interface ParsedInput {
    cmd: CommandSpec;
    args: string;
}

export function parseInput(input: string): ParsedInput | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    // Split on first whitespace — head is the command, rest is args.
    const m = trimmed.match(/^(\S+)\s*(.*)$/);
    if (!m) return null;
    const head = m[1].toLowerCase();
    const args = m[2] || "";
    for (const cmd of COMMANDS) {
        for (const a of cmd.aliases) {
            if (a.toLowerCase() === head) return { cmd, args };
        }
    }
    return null;
}

export async function runCommand(input: string, ctx: TerminalContext): Promise<CommandResult> {
    const parsed = parseInput(input);
    if (!parsed) {
        return {
            lines: [
                `أمر غير معروف: "${input}"`,
                'اكتب "مساعدة" أو "help" لقائمة الأوامر.',
            ],
            error: true,
        };
    }
    try {
        return await parsed.cmd.handler(parsed.args, ctx);
    } catch (e: any) {
        return err(e.message || "تعذّر تنفيذ الأمر.");
    }
}

// For UI suggestions/chips
export const QUICK_CHIPS = [
    "الملك",
    "الأسبوع",
    "حاضرين",
    "التصويت",
    "الإحصائيات",
    "المتصدرين",
    "الوقت",
    "حاضر",
    "معتذر",
    "مساعدة",
    "مسح",
];
