<div align="center">
  <img src="public/favicon.ico" alt="Logo" width="100" height="auto" />
  <h1>👑 عرش الخميس (King of Thursday)</h1>
  <p>تطبيق ويب متكامل لإدارة وتنظيم الطلعات الأسبوعية للأصدقاء، مبني على "دستور" خاص لضمان العدل، المتعة، والمشاركة الفعالة.</p>

  [![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.3-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

## 📖 عن المشروع

**عرش الخميس** هو نظام صُمم خصيصاً لمجموعة من الأصدقاء لحل مشكلة "وين نطلع هالأسبوع؟". يعتمد النظام على دورة أسبوعية يتولى فيها شخص واحد (الملك) مسؤولية اختيار يوم الطلعة (الخميس أو الجمعة) والمطعم (بميزانية محددة). 

يوفر التطبيق لوحة تحكم ذكية تتيح للأعضاء تأكيد الحضور، تقييم المطاعم بسرية تامة، ومتابعة لوحة المتصدرين (Leaderboard) لأفضل تفضيلات المطاعم على مدار السنة.

---

## ✨ المميزات الرئيسية

- 👑 **نظام الملك الأسبوعي:** تناوب سلس بين الأعضاء لاختيار المطعم ويوم الطلعة.
- 📜 **دستور مُدمج:** صفحة خاصة بقوانين الطلعات للرجوع إليها في أي وقت.
- 📊 **لوحة تحكم تفاعلية (Dashboard):** عرض حالة الأسبوع الحالي، الملك، المطعم، والحاضرين.
- ✅ **إدارة الحضور:** إمكانية تأكيد الحضور أو الاعتذار بنقرة زر.
- ⭐ **نظام التقييم السري:** تقييم المطعم من 1 إلى 5 بشكل سري تماماً؛ لا يطلع على التقييم التفصيلي سوى "عميد الدستور".
- 🚽 **نظام تقييم حمامات المطاعم:** لوحة تقييم مخصصة لتقييم نظافة وجودة حمامات المطاعم بشكل منفصل.
- 🏆 **لوحات المتصدرين:** 
  - **قائمة المتصدرين للدورة الحالية** (كل 6 أسابيع).
  - **السجل الشامل (Global Leaderboard):** سجل تاريخي بالترتيب الزمني الثابت مع إمكانية الفرز وعرض المصوتين بشكل مفصل.
  - **قائمة شرف الملوك (Kings Average Leaderboard):** ترتيب الملوك بناءً على متوسط جميع تقييمات المطاعم التي اختاروها عبر كل الدورات.
- 🎮 **صراع الملوك الجياع (Mini-Game):** لعبة أونلاين جماعية مدمجة يتنافس فيها الأعضاء على جمع نقاط البرجر.
- 🤖 **التفاعل الصوتي (AI Text-to-Speech):** ذكاء اصطناعي باللهجة السعودية مدمج للتحدث والرد داخل التطبيق.
- 📱 **دعم PWA:** تصميم متجاوب (Responsive) بالكامل مع أجهزة iPhone والأندرويد، ويمكن تثبيته كتطبيق على الشاشة الرئيسية.
- 🔔 **إشعارات وتنبيهات (Web Push):** تذكيرات للتقييم، تأكيد الحضور، وإعلان اختيارات الملك.
- 🛡️ **نظام أمان وصلاحيات:** أدوار مخصصة مثل "العميد" (Dean) لإدارة وإغلاق الأسابيع ورؤية النتائج والتنبيهات، بالإضافة لنظام تسجيل دخول بكلمات مرور مشفرة متقدمة.

---

## 🛠️ التقنيات المستخدمة

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons.
- **Backend/Database:** Firebase (Firestore).
- **Authentication:** Custom Auth with Passwords/Codes.
- **Deployment & PWA:** Next.js PWA features, Vercel (Recommended).

---

## 🚀 طريقة التشغيل وتثبيت المشروع

1. **نسخ المستودع (Clone Repository):**
   ```bash
   git clone https://github.com/your-username/king-of-thursday.git
   cd king-of-thursday
   ```

2. **تثبيت الحزم (Install Dependencies):**
   ```bash
   npm install
   ```

3. **إعداد المتغيرات البيئية (Environment Variables):**
   قم بإنشاء ملف `.env.local` في الجذر الرئيسي للمشروع وأضف مفاتيح Firebase الخاصة بك:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **تشغيل بيئة التطوير (Run Server):**
   ```bash
   npm run dev
   ```
   افتح `http://localhost:3000` في متصفحك.

---

## 📜 نبذة عن دستور الطلعات (القوانين الأساسية)

1. **يوم الطلعة والمطعم:** يحدده ملك الخميس قبل يوم الأربعاء (8م لليوم، و10م للمطعم).
2. **الميزانية:** لا تتجاوز 175 ريال سعودي للفرد.
3. **التكرار:** يُمنع اختيار نفس المطعم لدورتين متتاليتين.
4. **الغياب والتخطي:** المعتذر يجب أن يجد بديلاً لتبديل الأدوار. التقييم السيء (أقل من 2) لدورتين يسقط دور الملك في الدورة القادمة.
5. **التقييم والتصويت:** يجب على كل حاضر تقييم المطعم بسرية، ويجمع "عميد الدستور" الأصوات.
6. **نهاية العام:** في نهاية السنة والموسم، يتم تكريم الفائز وتسديد فاتورته من قبل المجموعة.

*(لقراءة الدستور بالكامل، يرجى مراجعة نافذة الدستور داخل لوحة التحكم في التطبيق).*

---

## 🤝 المشاركة والمساهمة (Contributing)

هذا المشروع مصمم لخدمة مجموعة محددة، ولكن إذا أعجبتك الفكرة وأردت استخدامها لأصدقائك، يمكنك عمل Fork للمشروع وتعديل ملف `src/lib/services.ts` لتغيير قائمة الأسماء (`VALID_NAMES`) وتخصيص الدستور ليناسب مجموعتك.

---

<div align="center">
  <p>تم التطوير بـ ❤️ لتسهيل طلعات الأصدقاء وتوثيق أجمل اللحظات.</p>
</div>
