const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "من وين تجيب الصور؟"
 * قال: "أول أدوّر في مجلد photos، وإذا ما لقيت أسحب من التطبيق...
 *       وإذا ما لقيت أرسم دائرة وأقول هذا هو 😂🖼️"
 */

// ── حلّ الصور ──
// 1) deck/photos/<الاسم>.<امتداد>   ← اللي تحطه أنت (الأولوية)
// 2) deck/.cache/app_<الاسم>.jpg    ← صورة البروفايل المسحوبة من التطبيق
// 3) لا شيء → دائرة بالحرف الأول
const CACHE_DIR = path.join(__dirname, ".cache");

// تجهيز الصور: يقص كل صورة مربّعة قبل البناء (photos/ له الأولوية على صور التطبيق)
try {
    console.log("تجهيز الصور:");
    console.log(require("child_process")
        .execSync(`python3 ${JSON.stringify(path.join(__dirname, "prepare-photos.py"))}`)
        .toString().trimEnd());
} catch (e) {
    console.warn("تعذّر تجهيز الصور — سيُستخدم البديل:", e.message);
}

function photoFor(name) {
    const sq = path.join(CACHE_DIR, `sq_${name}.jpg`);
    return fs.existsSync(sq) ? sq : null;
}

// صورة دائرية، ومع إطار ملوّن. ترجع true لو رُسمت صورة فعلية.
function avatar(s, name, x, y, d, ringColor) {
    s.addShape(p.ShapeType.ellipse, { x: x - 0.05, y: y - 0.05, w: d + 0.1, h: d + 0.1, fill: { color: ringColor } });
    const img = photoFor(name);
    if (img) {
        s.addImage({ path: img, x, y, w: d, h: d, rounding: true });
        return true;
    }
    // بديل: الحرف الأول داخل الدائرة
    s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: "E7E5E4" } });
    s.addText(name.charAt(0), { x, y, w: d, h: d, fontSize: Math.round(d * 34), bold: true,
        color: "57534E", align: "center", valign: "middle", fontFace: "Arial", isTextBox: true, margin: 0 });
    return false;
}

const p = new pptxgen();
p.layout = "LAYOUT_WIDE";               // 13.3 x 7.5
p.rtlMode = true;

const INK="1C1917", GOLD="F59E0B", CREAM="FAF7F2", TXD="292524", TXL="F5F5F4",
      EM="10B981", RO="E11D48", MU="78716C", VI="7C3AED", SK="0284C7";
const F="Arial";
const R = (extra={}) => ({ fontFace:F, rtlMode:true, align:"right", isTextBox:true, margin:0, ...extra });

const W=13.3, M=0.7, CW=W-2*M;   // content width

// ── قوالب ──
function dark(){ const s=p.addSlide(); s.background={color:INK}; return s; }
function light(){ const s=p.addSlide(); s.background={color:CREAM}; return s; }

function title(s,t,{color=TXD,y=0.5,size=34}={}){
  s.addText(t, R({x:M,y,w:CW,h:0.75,fontSize:size,bold:true,color}));
}
// دائرة ذهبية مرقّمة — الموتيف المتكرر
function badge(s,x,y,label,{fill=GOLD,txt=INK,d=0.44}={}){
  s.addShape(p.ShapeType.ellipse,{x,y,w:d,h:d,fill:{color:fill}});
  s.addText(String(label), {x,y,w:d,h:d,fontSize:14,bold:true,color:txt,
    align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
}
function card(s,x,y,w,h,{fill="FFFFFF"}={}){
  s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:0.09,fill:{color:fill},
    line:{color:"E7E5E4",width:1}, shadow:{type:"outer",angle:90,blur:8,offset:1,opacity:0.07,color:"000000"}});
}
function stat(s,x,y,w,val,lab,col){
  card(s,x,y,w,1.55);
  s.addText(val, {x:x+0.15,y:y+0.16,w:w-0.3,h:0.72,fontSize:40,bold:true,color:col,
    align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
  s.addText(lab, R({x:x+0.15,y:y+0.92,w:w-0.3,h:0.5,fontSize:12,color:MU,align:"center"}));
}
// صفوف: دائرة + عنوان + شرح
function rows(s,items,x,y,w,{gap=0.98,tc=TXD,sc=MU,bg=null}={}){
  const pad = bg ? 0.3 : 0;                       // حشوة داخل البطاقة
  items.forEach((it,i)=>{
    const yy=y+i*gap;
    if(bg) card(s,x,yy-0.14,w,gap-0.1,{fill:bg});
    badge(s,x+w-pad-0.44,yy+0.03,it.n??(i+1),{fill:it.c||GOLD,txt:it.c?"FFFFFF":INK});
    s.addText(it.t, R({x:x+pad,y:yy,w:w-2*pad-0.6,h:0.33,fontSize:15,bold:true,color:tc}));
    if(it.d) s.addText(it.d, R({x:x+pad,y:yy+0.37,w:w-2*pad,h:0.4,fontSize:11.5,color:sc}));
  });
}
const CHART={showLegend:false, catAxisLabelColor:MU, valAxisLabelColor:MU,
  catAxisLabelFontFace:F, valAxisLabelFontFace:F, catAxisLabelFontSize:11, valAxisLabelFontSize:10,
  valGridLine:{color:"E7E5E4",size:1}, catGridLine:{style:"none"},
  dataLabelFontFace:F, dataLabelFontSize:10, dataLabelColor:TXD, dataLabelFormatCode:"0.00"};

/* ══ 1 ══ */ {
  const s=dark();
  s.addShape(p.ShapeType.ellipse,{x:-2.2,y:4.0,w:6.4,h:6.4,fill:{color:"3D2E12"}});
  s.addText("دستور عرش الخميس", R({x:M,y:2.0,w:CW,h:0.9,fontSize:52,bold:true,color:TXL}));
  s.addText("النسخة الثانية عشرة — إصلاح نظام الترتيب", R({x:M,y:3.0,w:CW,h:0.6,fontSize:22,color:GOLD}));
  s.addText("أربع مواد مبنية على تحليل 94 تقييماً و31 طلعة عبر خمس دورات", R({x:M,y:3.75,w:CW,h:0.5,fontSize:14,color:MU}));
  s.addText("أغسطس 2026", R({x:M,y:4.7,w:CW,h:0.4,fontSize:12,color:MU}));
  s.addNotes("عرض مبني بالكامل على بيانات التطبيق الحقيقية، لا على انطباعات.");
}
/* ══ المقدمة ══ */ {
  const s=p.addSlide(); s.background={color:"F7F1E3"};      // لون الرقّ
  // ختم ذهبي في الزاوية
  s.addShape(p.ShapeType.ellipse,{x:W-M-1.15,y:0.5,w:1.15,h:1.15,fill:{color:"F3E3BE"},line:{color:"C9A227",width:2}});
  s.addText("عرش\nالخميس", {x:W-M-1.15,y:0.5,w:1.15,h:1.15,fontSize:11,bold:true,color:"9A7B12",
    align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0,lineSpacingMultiple:1.1});

  const TX="3B2F1E", GOLDD="9A7B12", MID="6B5B45";
  const TW = CW-1.6;                                        // نترك مكان الختم

  s.addText("مِن عميدِ الدستور شوكا، إلى ملوكِ عرشِ الخميس",
    R({x:M,y:0.72,w:TW,h:0.5,fontSize:19,bold:true,color:GOLDD}));

  s.addText("السلامُ على مَنِ اتّبعَ الهُدى",
    R({x:M,y:1.55,w:CW,h:0.95,fontSize:44,bold:true,color:TX}));

  s.addText("أمّا بعد،",
    R({x:M,y:2.62,w:CW,h:0.45,fontSize:20,bold:true,color:GOLDD}));

  s.addText("فإنّا جمعنا إحدى وثلاثين طلعةً وأربعةً وتسعين تقييماً، ونظرنا فيها نظرَ المُنصِف، فوجدنا الميزانَ يميلُ بغير ما يشتهي أصحابُه: مقياسٌ عند هذا غيرُ مقياسِ ذاك، وطلعةٌ واحدةٌ تَهدِمُ عاماً كاملاً، وخصومةٌ بين اثنين يدفعُ ثمنَها الستة.",
    R({x:M,y:3.15,w:CW,h:1.15,fontSize:16,color:TX,lineSpacingMultiple:1.5}));

  s.addText("وإنّا ندعوكم إلى ميزانٍ واحدٍ ترضونه قبل أن تعلموا لمن سيميل. فإن قَبِلتُم سَلِمَت الشِّلّةُ وبقيت الطلعات، وإن أبَيتُم فما بعد الأرقامِ حُجّة.",
    R({x:M,y:4.45,w:CW,h:0.95,fontSize:16,color:TX,lineSpacingMultiple:1.5}));

  // خط فاصل رفيع قبل الخاتمة
  s.addShape(p.ShapeType.rect,{x:W-M-2.6,y:5.62,w:2.6,h:0.015,fill:{color:"D6C7A1"}});

  s.addText("وقد أَعذَرَ مَن أَنذَر.",
    R({x:M,y:5.85,w:CW,h:0.65,fontSize:30,bold:true,color:GOLDD}));

  s.addText("حُرِّرَ في شهر أغسطس من عام 2026  ·  النسخة الثانية عشرة",
    R({x:M,y:6.68,w:CW,h:0.45,fontSize:12.5,color:MID}));
  s.addNotes("مقدّمة بأسلوب المخاطبات — عدّل النص كما تشاء.");
}
/* ══ نداء المعركة ══ */ {
  const s=p.addSlide(); s.background={color:"120C0C"};
  // وهج قرمزي خافت من الطرفين
  s.addShape(p.ShapeType.ellipse,{x:-4.2,y:-3.2,w:9.0,h:9.0,fill:{color:"2A1114"}});
  s.addShape(p.ShapeType.ellipse,{x:W-3.4,y:3.0,w:8.2,h:8.2,fill:{color:"2A1114"}});

  s.addText("الدورة السادسة", R({x:M,y:0.55,w:CW,h:0.45,fontSize:15,bold:true,color:"F43F5E"}));

  s.addText("لم يبقَ إلا فصلٌ واحد",
    R({x:M,y:1.05,w:CW,h:1.0,fontSize:48,bold:true,color:"FAFAF9"}));

  s.addText("ستة ملوك.  عرشٌ واحد.  ودورةٌ سادسةٌ تزن ضعفين ونصفاً.",
    R({x:M,y:2.15,w:CW,h:0.55,fontSize:20,color:GOLD}));

  // ثلاث حقائق للمعركة
  const bw=(CW-0.6)/3, BX=i=>M+(2-i)*(bw+0.3);
  [["0.007","يفصل الأول عن الثاني","F43F5E"],
   ["+0.90","ما تمنحه عزيمة البيت","10B981"],
   ["×2.5","وزن الدورة السادسة وحدها","F59E0B"]].forEach(([n,l,c],i)=>{
    s.addShape(p.ShapeType.roundRect,{x:BX(i),y:2.95,w:bw,h:1.5,rectRadius:0.1,
      fill:{color:"1C1414"}, line:{color:"3F2426",width:1}});
    s.addText(n, {x:BX(i),y:3.12,w:bw,h:0.68,fontSize:34,bold:true,color:c,
      align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
    s.addText(l, {x:BX(i)+0.15,y:3.82,w:bw-0.3,h:0.46,fontSize:12.5,color:"A8A29E",
      align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
  });

  s.addText("من عزم في بيته تُوِّج.  ومن كرّر مطعماً سقط.  ومن تأخّر عن الحسم خسر دوره.",
    R({x:M,y:4.75,w:CW,h:0.6,fontSize:18,color:"D6D3D1",lineSpacingMultiple:1.4}));

  s.addText("لا تُورَث هذه السنة — تُنتزَع.",
    R({x:M,y:5.55,w:CW,h:0.75,fontSize:34,bold:true,color:"F43F5E"}));

  s.addText("الميدان مفتوح  ·  والحساب يبدأ من الطلعة القادمة",
    R({x:M,y:6.5,w:CW,h:0.5,fontSize:15,color:MU}));
  s.addNotes("نداء المعركة — يُعرض قبل الدخول في الأرقام، أو يُستخدم كشريحة افتتاح بديلة.");
}
/* ══ من نحن ══ */ {
  const s=light(); title(s,"عرش الخميس — من نحن");
  s.addText("ست أشخاص، طلعة كل أسبوع، وملك يتناوب على اختيار المطعم",
    R({x:M,y:1.22,w:CW,h:0.4,fontSize:15,color:MU}));
  // ترتيب التتويج الرسمي
  const KINGS=[["خالد",4.14],["طلال",3.70],["شوكا",3.95],["حكير",4.45],["هشام",4.23],["نواف",3.29]];
  const cw=(CW-5*0.22)/6;
  KINGS.forEach(([n,avg],i)=>{
    const x=M+(5-i)*(cw+0.22);                       // RTL: الأول يمين
    const dean = n==="شوكا";
    card(s,x,1.9,cw,2.3,{fill:dean?"FEF3C7":"FFFFFF"});
    badge(s,x+cw/2-0.22,2.12,i+1,{fill:dean?GOLD:"D6D3D1",txt:dean?INK:TXD});
    s.addText(n, {x:x+0.1,y:2.72,w:cw-0.2,h:0.42,fontSize:17,bold:true,color:TXD,
      align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
    s.addText(String(avg.toFixed(2)), {x:x+0.1,y:3.16,w:cw-0.2,h:0.4,fontSize:19,bold:true,
      color:dean?"B45309":MU,align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
    s.addText(dean?"عميد الدستور":"عضو", {x:x+0.1,y:3.6,w:cw-0.2,h:0.35,fontSize:10.5,
      color:dean?"B45309":MU,align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
  });
  s.addText("الترتيب أعلاه هو ترتيب التتويج — من يتولّى العرش أولاً في كل دورة. والرقم هو معدّله الحالي.",
    R({x:M,y:4.42,w:CW,h:0.4,fontSize:12,color:MU}));
  const cw3=(CW-0.5)/3, X3=i=>M+(2-i)*(cw3+0.25);
  [["الملك يختار","صاحب الدور يحدّد المطعم واليوم، وله أن يفتح تصويتاً أو يحكم منفرداً",GOLD],
   ["النصاب شرط","لا تُحتسب الطلعة إلا بحضور آكلَين غير الملك — والحضور الشرفي لا يُعد",SK],
   ["التقييم سرّي","كل من ذاق يمنح من 1 إلى 5، وهوية المصوّت لا يعرفها إلا العميد",VI]]
  .forEach(([t,d,c],i)=>{
    card(s,X3(i),4.95,cw3,1.95);
    badge(s,X3(i)+cw3-0.75,5.2,i+1,{fill:c,txt:"FFFFFF"});
    s.addText(t, R({x:X3(i)+0.3,y:5.22,w:cw3-1.15,h:0.4,fontSize:15,bold:true,color:TXD}));
    s.addText(d, R({x:X3(i)+0.3,y:5.75,w:cw3-0.6,h:0.95,fontSize:11.5,color:MU,lineSpacingMultiple:1.3}));
  });
}
/* ══ العميد ══ */ {
  const s=dark();
  s.addShape(p.ShapeType.ellipse,{x:-2.4,y:-2.4,w:5.2,h:5.2,fill:{color:"332811"}});
  // إطار ذهبي خلف الصورة
  avatar(s,"شوكا", W-M-2.24, 0.66, 2.08, GOLD);
  s.addText("عميد الدستور", R({x:M,y:0.82,w:CW-3.1,h:0.5,fontSize:20,color:GOLD}));
  s.addText("شوكا", R({x:M,y:1.3,w:CW-3.1,h:1.05,fontSize:58,bold:true,color:TXL}));
  s.addText("ملك التذوق الأعظم لعام 2026", R({x:M,y:2.38,w:CW-3.1,h:0.4,fontSize:15,color:MU}));
  s.addText("المؤتمن على المصالح العليا للمجموعة", R({x:M,y:2.76,w:CW-3.1,h:0.4,fontSize:15,color:MU}));
  rows(s,[
    {t:"المرجع الأول والأخير في تفسير الدستور", d:"وإليه يُرفع كل خلاف في قراءة بنوده", c:GOLD},
    {t:"السلطة التشريعية — الصوت الوحيد بحق التعديل", d:"ولا تُعدَّل مادة إلا بقراره ومعه موافقة عضوين", c:GOLD},
    {t:"صلاحية المصلحة العليا", d:"له وحده أن يثني أي قانون عادي أو يمنح استثناءً طارئاً", c:GOLD},
    {t:"أمين النتائج والسجلات", d:"يُيسّر الطلعات ويحدّث النتائج بسرية وأمانة — فضلاً لا أمراً", c:GOLD},
  ],M,3.35,CW,{gap:1.0,tc:TXL,sc:MU,bg:"2A2522"});
  s.addNotes("المادة (1) من الدستور — وصف ومكانة عميد الدستور.");
}
/* ══ 3 ══ */ {
  const s=dark();
  badge(s,M,2.25,"1",{d:0.7}); 
  s.addText("الأسباب التاريخية", R({x:M,y:3.15,w:CW,h:0.9,fontSize:44,bold:true,color:TXL}));
  s.addText("ما الذي أوصلنا إلى هنا؟ ثلاثة اكتشافات من البيانات", R({x:M,y:4.1,w:CW,h:0.5,fontSize:16,color:GOLD}));
}
/* ══ الرحلة بالأرقام ══ */ {
  const s=light(); title(s,"الرحلة بالأرقام");
  s.addText("كل ما سجّله التطبيق منذ أول طلعة موثّقة", R({x:M,y:1.22,w:CW,h:0.4,fontSize:14,color:MU}));
  const w=2.95, g=0.25, X=i=>M+(3-i)*(w+g);
  stat(s,X(0),1.85,w,"31","طلعة مسجّلة",GOLD);
  stat(s,X(1),1.85,w,"26","مطعماً مختلفاً",SK);
  stat(s,X(2),1.85,w,"5","دورات كاملة",VI);
  stat(s,X(3),1.85,w,"94","تقييماً موثّقاً",EM);
  s.addText("طلعات كل دورة", R({x:M,y:3.75,w:CW,h:0.45,fontSize:19,bold:true,color:TXD}));
  s.addChart(p.ChartType.bar,[{name:"طلعات",labels:["دورة 5","دورة 4","دورة 3","دورة 2","دورة 1"],
    values:[3,7,7,8,6]}],
    {x:M,y:4.3,w:CW,h:2.4,...CHART,barDir:"bar",chartColors:[GOLD],showValue:true,
     dataLabelPosition:"outEnd",dataLabelFormatCode:"0",valAxisMinVal:0,valAxisMaxVal:9,barGapWidthPct:40});
  s.addNotes("الدورة الخامسة ما زالت جارية — ثلاث طلعات من ست.");
}
/* ══ ذاكرة الطلعات ══ */ {
  const s=light(); title(s,"ذاكرة الطلعات");
  s.addText("ما تقوله السجلات عن عاداتنا", R({x:M,y:1.22,w:CW,h:0.4,fontSize:14,color:MU}));
  const hw=(CW-0.3)/2;
  card(s,M+hw+0.3,1.8,hw,2.15,{fill:"D1FAE5"});
  s.addText("أعلى ثلاث طلعات", R({x:M+hw+0.6,y:2.02,w:hw-0.6,h:0.4,fontSize:16,bold:true,color:"065F46"}));
  ["ماما نورة — حكير — 5.00","بيت شوكا — شوكا — 5.00","فيردي — حكير — 5.00"].forEach((t,i)=>
    s.addText(t, R({x:M+hw+0.6,y:2.52+i*0.42,w:hw-0.6,h:0.38,fontSize:13,color:TXD})));
  card(s,M,1.8,hw,2.15,{fill:"FFE4E6"});
  s.addText("أدنى ثلاث طلعات", R({x:M+0.3,y:2.02,w:hw-0.6,h:0.4,fontSize:16,bold:true,color:"9F1239"}));
  ["MOLT — نواف — 2.00","مطعم الشرفه — طلال — 2.75","Steak house — خالد — 3.25"].forEach((t,i)=>
    s.addText(t, R({x:M+0.3,y:2.52+i*0.42,w:hw-0.6,h:0.38,fontSize:13,color:TXD})));
  const cw3=(CW-0.5)/3, X3=i=>M+(2-i)*(cw3+0.25);
  [["الخميس 23 · الجمعة 7","يوم الطلعة — الخميس يحكم، والجمعة بديل متكرر",GOLD],
   ["78%","نسبة الحضور الإجمالية — 40 اعتذاراً من 186 حضوراً ممكناً",SK],
   ["5 مطاعم","تكرّرت زيارتها: مستر برياني · كوجة · سوله · Buffalo · Steak house",VI]]
  .forEach(([t,d,c],i)=>{
    card(s,X3(i),4.2,cw3,2.1);
    badge(s,X3(i)+cw3-0.75,4.45,i+1,{fill:c,txt:"FFFFFF"});
    s.addText(t, R({x:X3(i)+0.3,y:4.47,w:cw3-1.15,h:0.42,fontSize:15,bold:true,color:TXD}));
    s.addText(d, R({x:X3(i)+0.3,y:5.02,w:cw3-0.6,h:1.05,fontSize:11.5,color:MU,lineSpacingMultiple:1.3}));
  });
}
/* ══ 4 ══ */ {
  const s=light(); title(s,"مسار كل ملك عبر الدورات");
  s.addText("هشام في صعود مستمر، وخالد وطلال في هبوط — والمعدّل الحالي يعامل كل الدورات سواء",
    R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  s.addChart(p.ChartType.line,[
    {name:"هشام",labels:["د1","د2","د3","د4"],values:[3.33,4.50,4.50,4.60]},
    {name:"حكير",labels:["د1","د2","د3","د4"],values:[5.00,4.13,4.50,4.50]},
    {name:"خالد",labels:["د1","د2","د3","د4"],values:[4.67,4.60,4.00,3.25]},
    {name:"طلال",labels:["د1","د2","د3","د4"],values:[4.50,3.67,4.03,3.25]},
  ],{x:M,y:1.75,w:CW,h:4.05,...CHART,showLegend:true,legendPos:"b",legendFontFace:F,legendFontSize:11,
     chartColors:[SK,GOLD,RO,VI],lineDataSymbolSize:7,lineSize:3,valAxisMinVal:3,valAxisMaxVal:5.2});
  s.addNotes("النقطة: الأمجاد القديمة تزن بقدر المستوى الحالي تماماً — وهذا غير عادل للمتحسّنين.");
}
/* ══ 5 ══ */ {
  const s=light(); title(s,"الاكتشاف الأول: كل واحد له مسطرة مختلفة");
  s.addText("متوسط ما يمنحه كل عضو من درجات — الفارق بين أقسى وأكرم مقيّم 1.74 درجة",
    R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  s.addChart(p.ChartType.bar,[{name:"المتوسط",labels:["حكير","هشام","طلال","نواف","خالد","شوكا"],
    values:[3.07,3.40,3.69,4.00,4.35,4.81]}],
    {x:M+3.9,y:1.75,w:CW-3.9,h:4.6,...CHART,barDir:"bar",chartColors:[GOLD],showValue:true,dataLabelPosition:"outEnd",
     valAxisMinVal:0,valAxisMaxVal:5.4,barGapWidthPct:45});
  card(s,M,1.75,3.6,4.6,{fill:"FEF3C7"});
  s.addText("ماذا يعني هذا؟", R({x:M+0.3,y:2.05,w:3.0,h:0.4,fontSize:16,bold:true,color:TXD}));
  s.addText("مطعمك يُحكم عليه بمن صادف أن قيّمه، لا بجودته", R({x:M+0.3,y:2.6,w:3.0,h:0.75,fontSize:12.5,color:TXD,lineSpacingMultiple:1.3}));
  s.addText("لو قيّمك شوكا ربحت، ولو قيّمك حكير خسرت — والمطعم واحد", R({x:M+0.3,y:3.5,w:3.0,h:0.9,fontSize:12.5,color:TXD,lineSpacingMultiple:1.3}));
  s.addText("الحرب ليست عناداً، بل رد فعل منطقي على مقياس غير موحّد", R({x:M+0.3,y:4.6,w:3.0,h:0.95,fontSize:12.5,bold:true,color:"92400E",lineSpacingMultiple:1.3}));
}
/* ══ طرفا النزاع ══ */ {
  const s=light(); title(s,"طرفا النزاع");
  s.addText("قبل الأرقام — من هما، وماذا يقول سجلّهما", R({x:M,y:1.2,w:CW,h:0.4,fontSize:14,color:MU}));
  const D=2.3, GY=2.05, RX=W-M-4.6, LX=M+0.4;
  // حكير (يمين)
  avatar(s,"حكير", RX+0.05, GY+0.05, D, GOLD);
  s.addText("حكير", R({x:RX-0.4,y:GY+D+0.22,w:D+0.9,h:0.45,fontSize:22,bold:true,color:TXD,align:"center"}));
  s.addText("المتصدّر · 4.45", R({x:RX-0.4,y:GY+D+0.68,w:D+0.9,h:0.35,fontSize:13,color:"B45309",align:"center"}));
  // طلال (يسار)
  avatar(s,"طلال", LX+0.05, GY+0.05, D, SK);
  s.addText("طلال", R({x:LX-0.4,y:GY+D+0.22,w:D+0.9,h:0.45,fontSize:22,bold:true,color:TXD,align:"center"}));
  s.addText("الخامس · 3.70", R({x:LX-0.4,y:GY+D+0.68,w:D+0.9,h:0.35,fontSize:13,color:"075985",align:"center"}));
  // بينهما
  const MX=LX+D+0.5, MW=RX-MX-0.5;
  s.addText("ضد", {x:MX,y:GY+0.5,w:MW,h:0.6,fontSize:30,bold:true,color:RO,
    align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
  card(s,MX,GY+1.15,MW,1.25,{fill:"FFE4E6"});
  s.addText("خمس طلعات تبادلا فيها التقييم", R({x:MX+0.15,y:GY+1.32,w:MW-0.3,h:0.4,fontSize:12,bold:true,color:"9F1239",align:"center"}));
  s.addText("وثلاث طلعات في الاتجاه الآخر", R({x:MX+0.15,y:GY+1.75,w:MW-0.3,h:0.4,fontSize:12,color:"9F1239",align:"center"}));
  card(s,M,5.85,CW,1.15,{fill:"FEF3C7"});
  s.addText("حكير أعطى طلال: 3 · 3 · 4 · 1 · 1     |     طلال أعطى حكير: 2 · 3 · 4",
    R({x:M+0.35,y:6.12,w:CW-0.7,h:0.45,fontSize:15,bold:true,color:"92400E",align:"center"}));
  s.addNotes("الأرقام بترتيبها الزمني — وهي مفتاح الشريحة التالية.");
}
/* ══ 6 ══ */ {
  const s=light(); title(s,"الاكتشاف الثاني: خريطة العداوة");
  s.addText("كم ينزل كل عضو تحت متوسطه الشخصي حين يقيّم خصمه — بعد استبعاد أثر كونه قاسياً أو كريماً أصلاً",
    R({x:M,y:1.2,w:CW,h:0.45,fontSize:13,color:MU}));
  const HW=CW/2-0.15, XR=M+CW/2+0.15, XL=M;   // RTL: الحرب الرئيسية يمين
  card(s,XR,1.95,HW,2.05,{fill:"FFE4E6"});
  s.addText("حكير  ↔  طلال", R({x:XR+0.3,y:2.18,w:HW-0.6,h:0.45,fontSize:20,bold:true,color:RO}));
  s.addText("حكير ينزل 0.67   ·   طلال ينزل 0.69", R({x:XR+0.3,y:2.72,w:HW-0.6,h:0.35,fontSize:14,color:TXD}));
  s.addText("عداوة متبادلة شبه متكافئة — كلاهما يخسر بالقدر نفسه", R({x:XR+0.3,y:3.2,w:HW-0.6,h:0.6,fontSize:12,color:MU}));
  card(s,XL,1.95,HW,2.05,{fill:"FEF3C7"});
  s.addText("شوكا  ↔  نواف", R({x:XL+0.3,y:2.18,w:HW-0.6,h:0.45,fontSize:20,bold:true,color:"B45309"}));
  s.addText("شوكا ينزل 0.31   ·   نواف ينزل 1.00", R({x:XL+0.3,y:2.72,w:HW-0.6,h:0.35,fontSize:14,color:TXD}));
  s.addText("عداوة خفية لم ينتبه لها أحد — أقوى من طرفَي الحرب المعلنة", R({x:XL+0.3,y:3.2,w:HW-0.6,h:0.6,fontSize:12,color:MU}));
  card(s,M,4.15,CW,1.75);
  s.addText("لماذا بقيت عداوة نواف مخفية؟", R({x:M+0.35,y:4.38,w:CW-0.7,h:0.4,fontSize:16,bold:true,color:TXD}));
  s.addText("لأن نواف يقيّم 37% فقط من الطلعات. أثره الحقيقي مكتوم خلف غيابه عن التصويت — وهذا بالضبط ما تعالجه مسألة المشاركة.",
    R({x:M+0.35,y:4.85,w:CW-0.7,h:0.8,fontSize:13,color:MU,lineSpacingMultiple:1.25}));
}
/* ══ 7 ══ */ {
  const s=light(); title(s,"تشريح الحرب: من صعّد فعلاً؟");
  s.addText("تسلسل تقييمات حكير وطلال لبعضهما عبر الدورات", R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  s.addChart(p.ChartType.line,[
    {name:"حكير ← طلال",labels:["د2","د3","د3","د4","د5"],values:[3,3,4,1,1]},
    {name:"طلال ← حكير",labels:["د2","د3","د3","د4","د5"],values:[2,3,null,4,null]},
  ],{x:M,y:1.8,w:CW,h:3.2,...CHART,showLegend:true,legendPos:"b",legendFontFace:F,legendFontSize:11,
     chartColors:[RO,SK],lineSize:3,lineDataSymbolSize:8,valAxisMinVal:0,valAxisMaxVal:5});
  card(s,M,5.25,CW,1.5,{fill:"E0F2FE"});
  s.addText("طلال لم يمنح حكير درجة 1 ولا مرة في التاريخ كله — أسوأ ما أعطاه 2، وآخر تقييم منحه كان 4.",
    R({x:M+0.35,y:5.5,w:CW-0.7,h:0.45,fontSize:14,bold:true,color:TXD}));
  s.addText("وصف «حرب متبادلة» غير دقيق: طلال يهدّئ وحكير يصعّد. تصحيح هذا الالتباس وحده قد ينهي النزاع.",
    R({x:M+0.35,y:5.98,w:CW-0.7,h:0.5,fontSize:12,color:MU}));
}
/* ══ 8 ══ */ {
  const s=light(); title(s,"الاكتشاف الثالث: صوت واحد يقلب طلعة");
  s.addText("كم يهبط معدّل الطلعة حين يمنحها شخص واحد درجة 1 بدل 4", R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  const bx=[[3,"1.00",RO],[4,"0.75","D97706"],[5,"0.60",EM]];
  bx.forEach(([n,v,c],i)=>{
    const x=M+i*(CW/3), w=CW/3-0.3;
    card(s,x,1.85,w,2.5);
    s.addText(`${n} مقيّمين`, R({x:x+0.2,y:2.1,w:w-0.4,h:0.4,fontSize:16,bold:true,color:MU,align:"center"}));
    s.addText(v, {x:x+0.2,y:2.55,w:w-0.4,h:1.0,fontSize:46,bold:true,color:c,align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
    s.addText("درجة ضرر", R({x:x+0.2,y:3.6,w:w-0.4,h:0.4,fontSize:12,color:MU,align:"center"}));
  });
  card(s,M,4.6,CW,1.7,{fill:"D1FAE5"});
  s.addText("كلما زاد عدد المقيّمين، ضعُف أثر أي مخرّب — دون أي سياسة ولا خصام.",
    R({x:M+0.35,y:4.85,w:CW-0.7,h:0.45,fontSize:15,bold:true,color:TXD}));
  s.addText("متوسط المشاركة اليوم 3.9 من 5. رفعه إلى 5 يقلّص قوة أي تصويت انتقامي بنسبة 40%.",
    R({x:M+0.35,y:5.35,w:CW-0.7,h:0.5,fontSize:12.5,color:"065F46"}));
}
/* ══ استراحة: إحصائيات على الهامش ══ */ {
  const s=light(); title(s,"إحصائيات ما لها داعي… بس حلوة");
  s.addText("استراحة قصيرة قبل ما نرجع للجد", R({x:M,y:1.2,w:CW,h:0.4,fontSize:14,color:MU}));
  const cw=(CW-0.5)/3, ch=2.32, X=(i)=>M+(2-i%3)*(cw+0.25), Y=(i)=>1.85+Math.floor(i/3)*(ch+0.28);
  const FACTS=[
    ["4.77","عزائم البيوت","مقابل 3.87 للمطاعم. ثلاث عزائم بيوت فقط، وكلها في قمة السجل. الخلاصة: بيوتكم أطيب من مطاعم الرياض",EM,"FEF3C7"],
    ["الجمعة","أفضل من الخميس","4.15 مقابل 3.94. اسم المجموعة «ملك الخميس» ويومكم الأحلى هو الجمعة. نفكّر في تغيير الاسم",SK,"E0F2FE"],
    ["81%","من أصوات شوكا خمسات","العميد لم يمنح درجة 3 ولا مرة في تاريخه — ثلاث عشرة خمسة من ست عشرة. تقييم أم مجاملة؟",GOLD,"FEF3C7"],
    ["14","اعتذار لنواف","ضعف أي عضو آخر (طلال وحكير 6 لكل واحد). حضوره نادر، لكن أثر غيابه على الترتيب ليس نادراً",RO,"FFE4E6"],
    ["80%","من المطاعم المكرّرة نزلت","أربعة من خمسة. Buffalo هبط من 4.67 إلى 3.25، وكوجة من 4.60 إلى 3.60. التكرار يقتل الحماس",VI,"EDE9FE"],
    ["3.56","معدّل الدورة الخامسة","كان 4.00 في الثانية والثالثة. ليست المطاعم التي ساءت — نحن الذين صرنا أقسى",RO,"FFE4E6"],
  ];
  FACTS.forEach(([big,lab,txt,col,bg],i)=>{
    const x=X(i), y=Y(i);
    card(s,x,y,cw,ch,{fill:bg});
    s.addText(big, {x:x+0.25,y:y+0.22,w:cw-0.5,h:0.62,fontSize: big.length>5?24:34, bold:true,
      color:col, align:"center", valign:"middle", fontFace:F, isTextBox:true, margin:0});
    s.addText(lab, {x:x+0.25,y:y+0.86,w:cw-0.5,h:0.36,fontSize:14, bold:true,
      color:TXD, align:"center", valign:"middle", fontFace:F, isTextBox:true, margin:0});
    s.addText(txt, R({x:x+0.28,y:y+1.28,w:cw-0.56,h:0.92,fontSize:11,color:MU,align:"center",lineSpacingMultiple:1.28}));
  });
  s.addNotes("شريحة استراحة — تخفّف الجو بعد قسم الحرب وقبل الترتيب.");
}
/* ══ 9 ══ */ {
  const s=dark();
  badge(s,M,2.25,"2",{d:0.7});
  s.addText("الوضع الحالي", R({x:M,y:3.15,w:CW,h:0.9,fontSize:44,bold:true,color:TXL}));
  s.addText("أين نقف اليوم، وما الذي تكشفه أرقام الحرب", R({x:M,y:4.1,w:CW,h:0.5,fontSize:16,color:GOLD}));
}
/* ══ 10 ══ */ {
  const s=light(); title(s,"الترتيب الحالي");
  s.addText("معدّلات الدورات المكتملة الأربع", R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  s.addChart(p.ChartType.bar,[{name:"المعدل",labels:["نواف","شوكا","طلال","خالد","هشام","حكير"],
    values:[3.29,3.85,3.86,4.13,4.23,4.53]}],
    {x:M,y:1.8,w:CW,h:4.9,...CHART,barDir:"bar",chartColors:[GOLD],showValue:true,
     dataLabelPosition:"outEnd",valAxisMinVal:0,valAxisMaxVal:5.2,barGapWidthPct:45});
}
/* ══ 11 ══ */ {
  const s=light(); title(s,"دليل الحرب: مطعم الشرفه");
  s.addText("طلعة طلال في الدورة الخامسة — أدنى تقييم في تاريخ المجموعة", R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  const v=[["حكير","1",RO],["هشام","2",RO],["خالد","3",MU],["شوكا","5",EM]];
  v.forEach(([n,sc,c],i)=>{
    const x=M+i*(CW/4), w=CW/4-0.25;
    card(s,x,1.85,w,1.9);
    s.addText(n, R({x:x+0.2,y:2.05,w:w-0.4,h:0.4,fontSize:15,bold:true,color:TXD,align:"center"}));
    s.addText(sc, {x:x+0.2,y:2.45,w:w-0.4,h:1.0,fontSize:44,bold:true,color:c,align:"center",valign:"middle",fontFace:F,isTextBox:true,margin:0});
  });
  card(s,M,4.05,CW,2.2,{fill:"FFE4E6"});
  s.addText("المحصّلة: 2.75", R({x:M+0.35,y:4.3,w:CW-0.7,h:0.5,fontSize:22,bold:true,color:RO}));
  s.addText("طلعة واحدة أنزلت طلال من المركز الرابع إلى الخامس. وسبقتها ماء ورد بالنمط نفسه في الدورة الرابعة.",
    R({x:M+0.35,y:4.85,w:CW-0.7,h:0.5,fontSize:13.5,color:TXD}));
  s.addText("مع المادة (12) — الطلعة المعفوّة — كانت هذه الليلة ستسقط تلقائياً ولا يبقى لها أثر.",
    R({x:M+0.35,y:5.42,w:CW-0.7,h:0.6,fontSize:12.5,bold:true,color:"9F1239"}));
}
/* ══ 12 ══ */ {
  const s=light(); title(s,"فجوة المشاركة");
  s.addText("نسبة الطلعات التي قيّمها كل عضو من أصل ما يحق له تقييمه", R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  s.addChart(p.ChartType.bar,[{name:"نسبة التقييم",labels:["نواف","هشام","حكير","شوكا","طلال","خالد"],
    values:[37,79,79,89,94,94]}],
    {x:M+3.9,y:1.75,w:CW-3.9,h:4.6,...CHART,barDir:"bar",chartColors:[SK],showValue:true,
     dataLabelPosition:"outEnd",valAxisMinVal:0,valAxisMaxVal:110,barGapWidthPct:45,dataLabelFormatCode:'0"%"'});
  card(s,M,1.75,3.6,4.6,{fill:"E0F2FE"});
  s.addText("نواف: 7 من 19", R({x:M+0.3,y:2.05,w:3.0,h:0.45,fontSize:19,bold:true,color:"075985"}));
  s.addText("غيابه عن التصويت وحده يكفي لإسقاط المتصدّر من المركز الأول إلى الثالث", R({x:M+0.3,y:2.7,w:3.0,h:1.0,fontSize:12.5,color:TXD,lineSpacingMultiple:1.3}));
  s.addText("العضو الأخير في الترتيب يملك قرار من يفوز — دون أن يدلي بصوت واحد", R({x:M+0.3,y:3.9,w:3.0,h:1.1,fontSize:12.5,bold:true,color:"075985",lineSpacingMultiple:1.3}));
}
/* ══ 16 ══ */ {
  const s=dark();
  badge(s,M,2.25,"3",{d:0.7});
  s.addText("المواد الأربع", R({x:M,y:3.15,w:CW,h:0.9,fontSize:44,bold:true,color:TXL}));
  s.addText("ما الذي يتغيّر في الدستور", R({x:M,y:4.1,w:CW,h:0.5,fontSize:16,color:GOLD}));
}
/* ══ 17 ══ */ {
  const s=light(); title(s,"المادة (12) والمادة (13)");
  card(s,M,1.3,CW,2.35,{fill:"D1FAE5"});
  badge(s,W-M-0.75,1.55,"12",{fill:EM,txt:"FFFFFF",d:0.5});
  s.addText("الطلعة المعفوّة", R({x:M+0.35,y:1.55,w:CW-1.3,h:0.45,fontSize:21,bold:true,color:"065F46"}));
  s.addText("تُسقَط أسوأ طلعة واحدة من سجل كل ملك عند احتساب الترتيب، بشرط أن يكون في سجله أربع طلعات فأكثر.",
    R({x:M+0.35,y:2.08,w:CW-0.7,h:0.5,fontSize:13.5,color:TXD}));
  s.addText("الأثر: أي هجوم منسّق على ليلة واحدة يسقط تلقائياً، فلا يُحاسَب أحد عمراً كاملاً على ليلة واحدة",
    R({x:M+0.35,y:2.62,w:CW-0.7,h:0.6,fontSize:12.5,bold:true,color:"047857",lineSpacingMultiple:1.25}));
  card(s,M,3.85,CW,2.6,{fill:"E0F2FE"});
  badge(s,W-M-0.75,4.1,"13",{fill:SK,txt:"FFFFFF",d:0.5});
  s.addText("التنحّي لتعارض المصالح", R({x:M+0.35,y:4.1,w:CW-1.3,h:0.45,fontSize:21,bold:true,color:"075985"}));
  s.addText("إذا ثبتت خصومة بين عضوين، لا يُحتسب تقييم أيٍّ منهما على طلعة الآخر — بقرار العميد وموافقة عضوين.",
    R({x:M+0.35,y:4.63,w:CW-0.7,h:0.5,fontSize:13.5,color:TXD}));
  s.addText("شرط الحماية — لا يُطبَّق التنحّي إذا كان سيُبقي الطلعة بأقل من ثلاثة مقيّمين",
    R({x:M+0.35,y:5.18,w:CW-0.7,h:0.4,fontSize:12.5,bold:true,color:"0369A1"}));
  s.addText("عند اختبار المادة بلا هذا الشرط، بلغ معدّل أحد الملوك 5.00 كاملة من مقيّم واحد فقط",
    R({x:M+0.35,y:5.6,w:CW-0.7,h:0.5,fontSize:12,color:"0369A1"}));
}
/* ══ 18 ══ */ {
  const s=light(); title(s,"المادة (14) والمادة (15)");
  card(s,M,1.3,CW,2.35,{fill:"EDE9FE"});
  badge(s,W-M-0.75,1.55,"14",{fill:VI,txt:"FFFFFF",d:0.5});
  s.addText("ترجيح الدورة الأخيرة", R({x:M+0.35,y:1.55,w:CW-1.3,h:0.45,fontSize:21,bold:true,color:"5B21B6"}));
  s.addText("تُحتسب الدورة الختامية للسنة (السادسة) بوزن 2.5 — كأنها دورتان ونصف — وباقي الدورات بوزن 1، ولا تدخل دورة الحساب قبل أن يلعبها الستة.",
    R({x:M+0.35,y:2.08,w:CW-0.7,h:0.5,fontSize:13.5,color:TXD}));
  s.addText("الأثر: الدورة الجارية تحسم الترتيب أكثر من كل ما سبقها — من تحسّن يصعد بسرعة، ومن تراجع ينزل بسرعة",
    R({x:M+0.35,y:2.62,w:CW-0.7,h:0.6,fontSize:12.5,bold:true,color:"6D28D9",lineSpacingMultiple:1.25}));
  card(s,M,3.85,CW,2.6,{fill:"FFE4E6"});
  badge(s,W-M-0.75,4.1,"15",{fill:RO,txt:"FFFFFF",d:0.5});
  s.addText("بطلان التواطؤ", R({x:M+0.35,y:4.1,w:CW-1.3,h:0.45,fontSize:21,bold:true,color:"9F1239"}));
  s.addText("كل اتفاق مسبق على منح درجة محدّدة لشخص بعينه — بصرف النظر عن التجربة — باطل ولا أثر له، سواء أُبرم قبل هذا الدستور أو بعده.",
    R({x:M+0.35,y:4.63,w:CW-0.7,h:0.55,fontSize:13.5,color:TXD}));
  s.addText("الجزاء: يُلغى تقييم المتواطئ على تلك الطلعة، وعند التكرار لبقية الدورة",
    R({x:M+0.35,y:5.22,w:CW-0.7,h:0.4,fontSize:12.5,bold:true,color:"BE123C"}));
  s.addText("القرار بيد العميد وموافقة عضوين، وفق آلية المادة (1)",
    R({x:M+0.35,y:5.64,w:CW-0.7,h:0.5,fontSize:12,color:"BE123C"}));
}
/* ══ 19 ══ */ {
  const s=light(); title(s,"النتيجة على الأرقام الحقيقية");
  s.addText("الترتيب قبل التعديلات وبعدها — محسوباً على كل بيانات التطبيق", R({x:M,y:1.2,w:CW,h:0.4,fontSize:13,color:MU}));
  s.addChart(p.ChartType.bar,[
    {name:"قبل",labels:["نواف","طلال","شوكا","خالد","هشام","حكير"],values:[3.29,3.70,3.95,4.14,4.23,4.45]},
    {name:"بعد",labels:["نواف","طلال","شوكا","خالد","هشام","حكير"],values:[3.73,4.21,3.93,4.42,4.56,4.77]},
  ],{x:M,y:1.75,w:CW,h:3.65,...CHART,barDir:"bar",chartColors:[MU,EM],showValue:true,
     dataLabelPosition:"outEnd",valAxisMinVal:0,valAxisMaxVal:5.6,showLegend:true,legendPos:"b",legendFontFace:F,legendFontSize:11});
  card(s,M,5.55,CW,1.35,{fill:"D1FAE5"});
  s.addText("المراكز الأربعة الأولى كما هي. التغيير الوحيد: طلال يصعد للرابع وشوكا ينزل للخامس",
    R({x:M+0.35,y:5.78,w:CW-0.7,h:0.45,fontSize:13.5,bold:true,color:"065F46"}));
  s.addText("أكبر المستفيدين نواف (+0.44) وطلال (+0.51) — وهما ضحيّتا الحرب. وصاحب الاقتراح الوحيد الذي يخسر مركزاً",
    R({x:M+0.35,y:6.25,w:CW-0.7,h:0.5,fontSize:12.5,color:"047857"}));
}
/* ══ 20 ══ */ {
  const s=dark();
  s.addShape(p.ShapeType.ellipse,{x:-2.4,y:4.6,w:5.4,h:5.4,fill:{color:"3D2E12"}});
  s.addText("الخلاصة", R({x:M,y:0.85,w:CW,h:0.8,fontSize:40,bold:true,color:TXL}));
  rows(s,[
    {t:"الحرب ليست عناداً — بل رد فعل على مقياس غير موحّد", d:"الفارق بين أقسى وأكرم مقيّم 1.74 درجة، وهو أكبر من الفارق بين أي مركزين"},
    {t:"المواد الأربع تنزع السلاح دون أن تمسّ أحداً", d:"لا تُسكت صوتاً ولا تُغيّر مركزاً — تعالج الآلية لا الأشخاص"},
    {t:"تدخل حيّز التنفيذ فور اعتمادها من عميد الدستور", d:"وتُراجَع في نهاية كل دورة، ويُلغى منها ما لم يُجدَّد"},
  ],M,2.2,CW,{gap:1.32,tc:TXL,sc:MU,bg:"2A2522"});
  s.addText("سارية اعتباراً من الدورة السادسة.", R({x:M,y:6.25,w:CW,h:0.7,fontSize:26,bold:true,color:GOLD}));
  s.addNotes("المواد سارية من الدورة السادسة، وتُراجَع في نهاية كل دورة.");
}

p.writeFile({fileName: path.join(__dirname, "دستور-عرش-الخميس-v12.pptx")}).then(f=>console.log("✅ تم:",f));
