/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "ليش تكاش الصور؟"
 * قال: "عشان ما أزعج السيرفر كل مرة... الأدب مو بس مع البشر 😂🌐"
 */

// يسحب صور البروفايل من التطبيق ويحفظها في .cache كبديل احتياطي
// لأي عضو ما حطيت له صورة في photos/.
//   node deck/fetch-app-photos.js

const fs = require("fs");
const path = require("path");

const SITE = process.env.SITE_URL || "https://www.kingthursday.online";
const CACHE = path.join(__dirname, ".cache");

(async () => {
    fs.mkdirSync(CACHE, { recursive: true });
    const res = await fetch(`${SITE}/api/rpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getPublicUserProfiles" }),
    });
    if (!res.ok) throw new Error(`RPC ${res.status}`);
    const { result } = await res.json();

    let saved = 0;
    for (const prof of result || []) {
        if (!prof?.profileImage || !prof.userName) continue;
        const b64 = String(prof.profileImage).replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(path.join(CACHE, `app_${prof.userName}.jpg`), Buffer.from(b64, "base64"));
        saved++;
        console.log(`  ✅ ${prof.userName}`);
    }
    console.log(`\nحُفظت ${saved} صورة في deck/.cache`);
    console.log("ملاحظة: صور التطبيق دقتها منخفضة — حط صورك في deck/photos لجودة أفضل.");
})().catch((e) => { console.error("فشل:", e.message); process.exit(1); });
