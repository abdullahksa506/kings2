/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "متى تشتغل الأتمتة؟"
 * قال: "لما العميد يقول 'شغّل'... مو مثلي أشتغل ٢٤ ساعة بدون ما أحد يطلب 😂🔌"
 *
 * إعدادات الأتمتة الزمنية — كل شي خلف مفتاح رئيسي `enabled` (مطفأ افتراضياً).
 * الأوقات بتوقيت الرياض (UTC+3). لا شيء يشتغل حتى العميد يفعّل ويحدّد الأوقات.
 */

export interface AutomationRule {
    on: boolean;      // is this rule active?
    day?: string;     // Riyadh weekday (الأربعاء…) — omit for "outing day" rules
    hourFrom?: number;// Riyadh hour window start (0-23)
    hourTo?: number;  // Riyadh hour window end (exclusive)
    hoursAfterOpen?: number; // for autoCloseRating
    minAttendees?: number;   // for autoPostpone
}

export interface AutomationConfig {
    enabled: boolean;                 // ← MASTER SWITCH (off = everything dormant)
    rules: {
        kingDecision: AutomationRule;
        attendancePending: AutomationRule;
        outingMorning: AutomationRule;
        ratingReminder: AutomationRule;
        ratingFinalWarning: AutomationRule;
        autoCloseRating: AutomationRule;
        autoPostpone: AutomationRule;
    };
}

// Sensible default schedules (Riyadh time). All OFF at the master level; individual
// rule `on` flags are pre-set so that flipping `enabled: true` + adjusting times is
// all that's needed later. Times are placeholders until the dean provides real ones.
export const DEFAULT_AUTOMATION: AutomationConfig = {
    enabled: false,
    rules: {
        kingDecision:       { on: true,  day: "الأربعاء", hourFrom: 20, hourTo: 22 },
        attendancePending:  { on: true,  day: "الأربعاء", hourFrom: 21, hourTo: 23 },
        outingMorning:      { on: true,  hourFrom: 10, hourTo: 12 },
        ratingReminder:     { on: true,  hourFrom: 19, hourTo: 21 },
        ratingFinalWarning: { on: true,  hourFrom: 22, hourTo: 23 },
        autoCloseRating:    { on: false, hoursAfterOpen: 48 },
        autoPostpone:       { on: false, day: "الأربعاء", hourFrom: 22, hourTo: 23, minAttendees: 3 },
    },
};

/** Deep-merge a stored (possibly partial) config over the defaults. */
export function mergeAutomation(stored: any): AutomationConfig {
    const s = stored && typeof stored === "object" ? stored : {};
    const rules: any = {};
    for (const key of Object.keys(DEFAULT_AUTOMATION.rules) as (keyof AutomationConfig["rules"])[]) {
        rules[key] = { ...DEFAULT_AUTOMATION.rules[key], ...(s.rules?.[key] || {}) };
    }
    return {
        enabled: typeof s.enabled === "boolean" ? s.enabled : DEFAULT_AUTOMATION.enabled,
        rules,
    };
}
