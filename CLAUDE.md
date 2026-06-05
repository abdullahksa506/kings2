# Claude Code Guidelines for ملك الخميس 👑

## Commit Message Pattern 📝

This repo uses a **fun, goofy Arabic style** for commit messages:

### Format
```
<type>: <Arabic title with emojis>

<Arabic body with jokes, emojis, and unprofessional vibes>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Types
Standard conventional commit types: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`

### Style Rules
1. **Title**: Arabic description with relevant emojis (🗳️ 📍 🔔 etc.)
2. **Body**:
   - Write in Arabic
   - Add LOTS of emojis (be extra 😎)
   - Include **AI-themed** jokes and funny comments 🤖
   - Be unprofessional and goofy
   - Make the team laugh when reading git log

### Example
```
feat: إشعارات التصويت الديموقراطي 🗳️🔔

- لما الملك يبدأ تصويت... كل الشعب يستلم إشعار 📱💥
- iOS كان يخزّن الكاش زي ما يخزّن الواحد الأكل بالثلاجة 🥶
- الحين كل 60 ثانية نشيك على التحديثات (أسرع من رد واتساب الحبيب 💔)

يلا نصوّت! 🎉
```

## Code Comment Jokes 🤖😂

**IMPORTANT**: Every file edited MUST include a multi-line comment with an AI-themed Arabic joke.

### Rules
- Must be in Arabic
- Must be AI-themed (Claude, ChatGPT, robots, machine learning, etc.)
- Must be funny and goofy
- Add at the top of the file or near the changed code

### Example (TypeScript/JavaScript)
```typescript
/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش ما تاكل؟"
 * قال: "لأني أشتغل بالتوكنز مو بالسعرات الحرارية 😂🔋"
 */
```

### Example (CSS/Other)
```css
/*
 * 🤖 نكتة AI:
 * ChatGPT و Claude تهاوشوا...
 * الحكم؟ Gemini 😂💀
 */
```

## Project Context

- **App**: King of Thursday (ملك الخميس) - Group outing management app
- **Users**: 6 friends deciding where to eat each week
- **Language**: Arabic UI, Arabic commits, Arabic jokes
- **Stack**: Next.js, Firebase, TypeScript, Tailwind

## Important Notes

- The "King" rotates weekly and picks the restaurant
- Democratic voting is optional (King can be a dictator 👑)
- Push notifications are important for iOS PWA users
- Service worker caching is tricky on iOS - always test there
