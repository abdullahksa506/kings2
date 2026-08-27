#!/usr/bin/env python3
"""
🤖 نكتة الذكاء الاصطناعي:
سألوا كلود: "ليش تقص الصور مربّعة؟"
قال: "لأني لو حطيت صورة طويلة في دائرة، يطلع وجه صاحبك زي انعكاس المرآة المقعّرة 😂🪞"

يجهّز صور العرض: يقص كل صورة مربّعة (متمركزة على الوجه تقريباً) ويكبّرها.
المصدر: photos/<الاسم>.* وإلا .cache/app_<الاسم>.jpg
الناتج: .cache/sq_<الاسم>.jpg
"""
import os, sys
from PIL import Image, ImageEnhance

HERE   = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(HERE, "photos")
CACHE  = os.path.join(HERE, ".cache")
NAMES  = ["شوكا", "حكير", "طلال", "خالد", "هشام", "نواف"]
EXTS   = (".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP")
SIZE   = 640

def source_for(name):
    for ext in EXTS:
        p = os.path.join(PHOTOS, name + ext)
        if os.path.exists(p):
            return p, "photos"
    p = os.path.join(CACHE, f"app_{name}.jpg")
    return (p, "app") if os.path.exists(p) else (None, None)

def square(path, out):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    # الوجه غالباً في الثلث الأعلى — نميل لفوق في الصور الطولية
    top = 0 if h > w else (h - side) // 2
    if h > w:
        top = int((h - side) * 0.28)
    im = im.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)
    if side < SIZE:                       # الصور الصغيرة تحتاج شحذ
        im = ImageEnhance.Sharpness(im).enhance(1.4)
        im = ImageEnhance.Brightness(im).enhance(1.08)
    im.save(out, quality=92)
    return side

os.makedirs(CACHE, exist_ok=True)
for name in NAMES:
    src, origin = source_for(name)
    out = os.path.join(CACHE, f"sq_{name}.jpg")
    if not src:
        if os.path.exists(out):
            os.remove(out)
        print(f"  —  {name}: لا توجد صورة")
        continue
    side = square(src, out)
    tag = "صورتك" if origin == "photos" else "من التطبيق"
    warn = "  ⚠️ دقة منخفضة" if side < 400 else ""
    print(f"  ✅ {name}: {tag} ({side}px){warn}")
