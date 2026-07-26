/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش القنوات؟"
 * قال: "عشان نكت شوكا ما تختلط بقرارات الملك... كل فوضى في مكانها 😂📺"
 *
 * قنوات التشات (ثابتة) — مشترك بين العميل والـRPC للتحقق.
 */

export interface ChatChannel {
    id: string;
    label: string;
    emoji: string;
    desc: string;
}

export const CHAT_CHANNELS: ChatChannel[] = [
    { id: "عام", label: "عام", emoji: "💬", desc: "دردشة الشلة العامة" },
    { id: "طلعات", label: "طلعات", emoji: "🍔", desc: "تنسيق وطلبات الطلعات" },
    { id: "العاب", label: "ألعاب", emoji: "🎮", desc: "تنسيق اللعب" },
    { id: "خارج-الموضوع", label: "خارج الموضوع", emoji: "🎲", desc: "أي شي ثاني" },
];

export const CHANNEL_IDS = CHAT_CHANNELS.map((c) => c.id);
export const DEFAULT_CHANNEL = CHAT_CHANNELS[0].id;
