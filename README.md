<div align="center">
   <img src="public/favicon.ico" alt="King App Logo" width="96" />
   <h1>عرش الخميس - KingApp</h1>
   <p>منصة اجتماعية لإدارة طلعات الأصدقاء: اختيار الملك الأسبوعي، إدارة الحضور، التقييمات، الإشعارات، ولوحات الصدارة.</p>
</div>

## نظرة سريعة

هذا المشروع مبني بـ Next.js App Router مع Firebase، ويقدم تجربة كاملة لإدارة الدورة الأسبوعية للطلعة:

- تحديد الملك الأسبوعي وقراراته (اليوم والمطعم).
- تأكيد الحضور والاعتذار.
- تقييم المطاعم بسرية، مع لوحات صدارة متعددة.
- تقييم الحمامات بشكل منفصل.
- نظام إشعارات Web Push للتذكير والتنبيه.
- صلاحيات خاصة للعميد (Dean) ولوحة إدارة/متابعة.
- دعم PWA وتجربة مناسبة للجوال.

## التقنيات

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Firebase Client SDK + Firebase Admin SDK
- web-push
- Framer Motion

## المتطلبات

- Node.js 20 أو أحدث (موصى به)
- npm 10 أو أحدث
- مشروع Firebase مفعّل (Firestore + Web App)

## التشغيل المحلي

1. تثبيت الحزم:

```bash
npm install
```

2. إنشاء ملف env:

أنشئ ملف `.env.local` في جذر المشروع، ثم أضف القيم التالية:

```env
# Firebase Web (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Server/Admin
FIREBASE_SERVICE_ACCOUNT_KEY=
IMPORT_SECRET=
```

ملاحظات مهمة:

- `FIREBASE_SERVICE_ACCOUNT_KEY` يجب أن يكون JSON كامل لحساب الخدمة من Firebase Admin (عادةً كسطر واحد escaped).
- `IMPORT_SECRET` يستخدم لحماية endpoint استيراد التاريخ.
- مفاتيح VAPID مطلوبة لعمل الإشعارات.

3. تشغيل المشروع:

```bash
npm run dev
```

ثم افتح:

```text
http://localhost:3000
```

## أوامر المشروع

```bash
npm run dev    # تشغيل بيئة التطوير
npm run build  # بناء نسخة الإنتاج
npm run start  # تشغيل نسخة الإنتاج
npm run lint   # فحص ESLint
```

## سكربتات مساعدة موجودة بالمستودع

يوجد سكربتات إدارية/تشخيصية في الجذر، منها:

- `import-history.mjs`
- `import-history-direct.mjs`
- `upgrade-passwords.mjs`
- `test-firebase.js`
- `test-queries.js`
- `test-query.js`

تشغّل عند الحاجة مباشرة عبر Node، مثال:

```bash
node import-history-direct.mjs
```

## هيكلة مختصرة للمجلدات

```text
src/
   app/                 # صفحات Next.js + API Routes
   components/          # مكونات الواجهة
   context/             # سياق المصادقة
   hooks/               # Hooks مخصصة (مثل الإشعارات)
   lib/                 # خدمات Firebase والمنطق الأساسي
   data/                # بيانات ثابتة/تاريخية
public/
```

## الدستور واللعبة والنظام الاجتماعي

التطبيق يطبق "دستور" داخلي للطلعات (ميزانية، تناوب، ضوابط التقييم، وغير ذلك) مع عناصر ترفيهية مثل منافسة "الملوك الجياع" للحفاظ على التفاعل بين الأعضاء.

## المساهمة والتخصيص

المشروع مخصص أساسًا لمجموعة محددة، لكن يمكن تخصيصه لأي مجموعة أصدقاء عبر:

- تعديل الأسماء والإعدادات داخل `src/lib/services.ts`.
- تحديث نصوص الدستور وسياسة التقييم حسب احتياج المجموعة.
- تغيير إعدادات Firebase ومفاتيح الإشعارات.

## ملاحظات أمان

- لا تشارك ملف `.env.local` أو مفاتيح الخدمة الخاصة.
- راجع صلاحيات Firestore في `firestore.rules` قبل النشر.
- يفضّل تشغيل `npm run lint` قبل أي نشر.
