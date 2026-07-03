# 🗂️ ميزات محذوفة — دليل الاسترجاع

هالملف يوثّق الميزات اللي انحذفت من الكود عشان نقدر نرجّعها لاحقاً.
كل الحذف صار في كومت واحد:

```
REMOVAL_COMMIT = 8a34ddd   (chore: حذف ٣ ألعاب + بورد الدردشة + صندوق الاقتراحات)
```

> 💡 **ملاحظة:** بيانات Firestore ما انحذفت (coupRooms · chatMessages · suggestions · minigames · royaleDuels لا زالت موجودة). انحذف الكود فقط.

---

## ⚡ أسرع طريقة للاسترجاع

**ترجيع كل الميزات مرة وحدة:**
```bash
git revert 8a34ddd
```

**ترجيع ميزة وحدة فقط (ملفاتها المحذوفة):**
```bash
# مثال: ملفات Coup
git checkout 8a34ddd~1 -- src/components/CoupArena.tsx src/lib/coupServices.ts src/hooks/useCoupVoice.ts src/lib/coup
```
بعدها ترجّع "التوصيلات" (imports + الأزرار + الحالة) يدوياً حسب الجدول تحت — أو الأسهل: افتح الكومت `git show 8a34ddd` وشوف بالضبط وش انشال وارجعه.

---

## 1) 🎮 Duel Royale 1v1  (`RoyalDuelArena`)

**ملفات محذوفة:**
- `src/components/RoyalDuelArena.tsx`
- `src/lib/royaleDuelServices.ts`

**توصيلات انشالت من `src/components/Dashboard.tsx`:**
- `const RoyalDuelArena = dynamic(() => import("./RoyalDuelArena"), { ssr: false });`
- حالة: `const [isDuelOpen, setIsDuelOpen] = useState(false);`
- بطاقة "Duel Royale 1v1" في تبويب المزيد (زر `setIsDuelOpen(true)`)
- المونت: `{user && isDuelOpen && (<RoyalDuelArena isOpen={isDuelOpen} onClose={...} userName={user.name} />)}`
- الأيقونة `Swords` من `lucide-react`

**RPC:** لا شيء (اللعبة كانت تكتب مباشرة في Firestore).

---

## 2) 🎭 Coup — انقلاب  (`CoupArena`)

**ملفات محذوفة:**
- `src/components/CoupArena.tsx`
- `src/lib/coupServices.ts`
- `src/hooks/useCoupVoice.ts`
- `src/lib/coup/engine.ts` · `src/lib/coup/secret.ts` · `src/lib/coup/types.ts`

**توصيلات `Dashboard.tsx`:** dynamic import + حالة `isCoupOpen` + بطاقة "Coup — انقلاب 🎭" + المونت.

**انشال من `src/app/api/rpc/route.ts`:**
- imports فوق: `import * as coup from "@/lib/coup/engine"` و `encryptState, decryptState` و أنواع `ActionType, Character, CoupGameState, ResponseType`
- Helpers: `COUP_VALID_ACTIONS/RESPONSES/CHARACTERS` · `coupRoomRef` · `validRoomId` · `loadCoupState` · `saveCoupState` · `runCoupTimeouts` · `generateCoupRoomId`
- كل حالات الـ RPC: `coupCreateRoom, coupJoinRoom, coupLeaveRoom, coupStartGame, coupAction, coupRespond, coupResolveLose, coupResolveExchange, coupReaction, coupGetHand, coupTick, coupVoiceState, coupVoiceSignal`
- مفاتيح حد المعدّل: `coupAction, coupRespond, coupTick, coupGetHand, coupReaction, coupVoiceSignal, coupVoiceState`

> ⚠️ ملاحظة: `validRoomId` كان يُستخدم من Coup فقط. `restaurantSlug` (بقي) — لا تحذفه، تستخدمه خريطة المطاعم.

---

## 3) 🍔 صراع الملوك الجياع  (`HungryKingsArena`)

**ملفات محذوفة:**
- `src/components/HungryKingsArena.tsx`
- `src/lib/gameServices.ts`

**توصيلات `Dashboard.tsx`:** dynamic import + حالة `isGameOpen` + بطاقة "صراع الملوك الجياع" + المونت + الأيقونة `Gamepad2`.

**توصيلات `src/app/test-panel/page.tsx`:** import + حالة `isGameOpen` + زر "تشغيل اللعبة المصغرة" + المونت + الأيقونة `Gamepad2`.

**RPC:** لا شيء (كانت تكتب مباشرة في Firestore).

---

## 4) 💬 بورد الدردشة  (`ChatBoard`)

**ملفات محذوفة:**
- `src/components/ChatBoard.tsx`
- `src/app/api/chat-board/clear/route.ts` (المجلد كامل)

**انشال من `src/lib/services.ts`:**
- `sendChatMessage(userName, text)`
- `listenToChatMessages(callback)`
- (النوع `ChatMessage` باقٍ في services.ts — مفيد للاسترجاع)

**انشال من `src/app/api/rpc/route.ts`:** حالة `sendChatMessage` + مفتاح حد المعدّل `sendChatMessage`.

**توصيلات `Dashboard.tsx`:** dynamic import + `<ChatBoard userName={...} />` في تبويب المزيد.

**توصيلات `src/components/TikTokFeedView.tsx`:**
- import النوع `ChatMessage`
- حالة `chatMessages`
- في الـ effect: `services.listenToChatMessages(...)` + الـ `unsub` في التنظيف
- بطاقة الفيد "💬 آخر الرسائل" (`cards.push({ id: "chat", ... })`)

---

## 5) 💡 صندوق الاقتراحات  (`SuggestionBox`)

**ملفات محذوفة:**
- `src/components/SuggestionBox.tsx`

**انشال من `src/lib/services.ts`:**
- `submitSuggestion(text)`
- `getAllSuggestions()`
- (النوع `Suggestion` باقٍ في services.ts)

**انشال من `src/app/api/rpc/route.ts`:** حالة `submitSuggestion` + مفتاح حد المعدّل `submitSuggestion`.

> `getStatistics()` لا زال يحسب `suggestionsCount` من مجموعة `suggestions` — تركناه (غير ضار). لو رجّعت الميزة يشتغل مباشرة.

**توصيلات `Dashboard.tsx`:** dynamic import + `<SuggestionBox isDean={...} />`.

**توصيلات `src/components/TikTokFeedView.tsx`:**
- import النوع `Suggestion`
- حالات `suggestions` و `suggestionText`
- في الـ effect: `services.getAllSuggestions(...)`
- الدالة `sendSuggestion()`
- حقل `suggestionsCount` في نوع `stats` + قراءته + بلاطة "اقتراح" في بطاقة الإحصائيات
- بطاقة الفيد "💡 صندوق الاقتراحات" (`cards.push({ id: "suggest", ... })`)

---

### ✅ بعد أي استرجاع
شغّل `npx tsc --noEmit` ثم `npx next build` للتأكد إن كل التوصيلات رجعت صح.
