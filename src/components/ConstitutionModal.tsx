import { X, BookOpen, ScrollText } from "lucide-react";

export default function ConstitutionModal({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="text-xl sm:text-2xl font-bold text-amber-500 flex items-center gap-3">
                        <ScrollText className="w-6 h-6 sm:w-8 sm:h-8" />
                        دستور عرش الخميس لسنة 2026 (v12)
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors focus:outline-none"
                        aria-label="إغلاق التقرير"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-5 sm:space-y-8 text-slate-300 text-sm sm:text-base leading-relaxed font-sans scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

                    {/* المادة 1 */}
                    <div className="bg-amber-900/10 border border-amber-500/20 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-amber-500 text-base sm:text-lg leading-snug">
                            المادة (1): وصف ومكانة عميد الدستور (شوكا)
                        </h3>
                        <p className="text-amber-400 font-medium">
                            "شوكا" هو عميد الدستور، وملك التذوق الأعظم لعام 2026، والمؤتمن على "الگوگل شيت" والمصالح العليا للمجموعة.
                        </p>
                        <ul className="space-y-3 list-none pl-0 pr-2 mt-2">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                                <p><strong className="text-amber-200">الوصف الوظيفي:</strong> هو المرجع الأول والأخير في تفسير بنود الدستور، والمسؤول "فضلاً وليس أمراً" عن تيسير أمور الطلعات وتحديث النتائج بكل سرية وأمانة.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                                <p><strong className="text-amber-200">السلطة التشريعية:</strong> هو الصوت الوحيد الذي يملك حق تعديل الدستور أو إبلاغ المجموعة بالقرارات السيادية.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                                <p><strong className="text-amber-200">صلاحية "المصلحة العليا":</strong> يملك العميد وحده حق "ثني" أي قانون عادي أو منح استثناءات طارئة. أما تعديل بنود الدستور نفسها فيتطلب موافقة شخصين إضافيين من الأعضاء الستة.</p>
                            </li>
                        </ul>
                    </div>

                    {/* المادة 2 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (2): نصاب "الأكيلة" (شرط انعقاد الطلعة)</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>لا تُعتبر الطلعة رسمية ولا يُعتد بها في الجدول إلا بحضور شخصين (آكلين) غير الملك.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p><strong className="text-sky-300">الحضور الشرفي:</strong> من يحضر دون أن يأكل لا يُحسب ضمن نصاب الثلاثة المطلوبين لانعقاد الطلعة.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>في حال لم يكتمل نصاب "الأكيلة"، يحق للملك تأجيل الطلعة لليوم التالي (الجمعة) أو ترحيلها للأسبوع القادم.</p>
                            </li>
                        </ul>
                    </div>

                    {/* المادة 3 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (3): مواعيد الحسم (يوم الأربعاء)</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 mt-2 shrink-0"></div>
                                <p>يوم الأربعاء هو الموعد النهائي لقرارات ملك الأسبوع.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 mt-2 shrink-0"></div>
                                <p>يحق للملك تغيير (يوم الطلعة) أو (المطعم المختار) كما يشاء، على أن يكون القرار النهائي والقطعي بحلول الساعة 10:00 مساءً من يوم الأربعاء.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 mt-2 shrink-0"></div>
                                <p>بمجرد تجاوز الساعة 10:00م، يُقفل باب التغيير ويصبح القرار ملزماً للجميع.</p>
                            </li>
                        </ul>
                    </div>

                    {/* المادة 4 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (4): الجزاءات والعقوبات</span>
                        </h3>
                        <p className="text-slate-300 pr-0 sm:pr-8">إذا تأخر الملك عن حسم قراره (اليوم والمطعم) بعد الساعة 10:00م من يوم الأربعاء، يُخير بين أمرين أحلاهما مرّ:</p>
                        <ul className="space-y-4 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 border border-rose-500/30">1</div>
                                <p className="mt-0.5">الاحتفاظ بحقه في الاختيار، مقابل عزيمة المجموعة كاملة (على حسابه).</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 border border-rose-500/30">2</div>
                                <p className="mt-0.5">التنازل عن دوره فوراً، ويتحول الأسبوع إلى "أسبوع عشوائي".</p>
                            </li>
                        </ul>
                    </div>

                    {/* المادة 5 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (5): ضوابط الاختيار والميزانية</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <p><strong className="text-emerald-300">سقف الإنفاق:</strong> الميزانية لا تزيد عن 175 ريالاً للشخص الواحد.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <p><strong className="text-emerald-300">قاعدة عدم التكرار:</strong> يُمنع على الملك اختيار نفس المطعم لدورتين متتاليتين.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <p><strong className="text-emerald-300">البدائل:</strong> في حال تعذر حضور الملك، يلتزم بتأمين "بديل" يبادله الدور في الجدول.</p>
                            </li>
                        </ul>
                    </div>

                    {/* المادة 6 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (6): آلية التصويت السرية (حق الأكيلة فقط)</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p>يتم التصويت داخل تطبيق "عرش الخميس" بشكل آمن وفوري؛ كل عضو شارك في "التذوق" يدخل تقييمه (من ١ إلى ٥) مباشرة في التطبيق، والمعدّل يُحسب تلقائياً ويظهر في لوحة الترتيب.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p><strong className="text-violet-300">الحرمان من التصويت:</strong> يُحرم من التصويت كل من لم يحضر الطلعة، وكذلك من حضر ولم يأكل. التصويت حق حصري لمن شارك في "التذوق" فقط.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p>المعدّلات تظهر للجميع في لوحة الترتيب أثناء الدورة، لكن **هوية المُصوِّت** عن كل تقييم تبقى سرية ولا تُكشف إلا للعميد. الترتيب النهائي السنوي يُعلن مع نهاية العام.</p>
                            </li>
                        </ul>
                    </div>

                    {/* المادة 7 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (7): الأسبوع العشوائي والمكافآت</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-fuchsia-500 mt-2 shrink-0"></div>
                                <p>بعد كل دورة (6 أسابيع)، يكون الأسبوع السابع "عشوائياً" لا ملك فيه.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-fuchsia-500 mt-2 shrink-0"></div>
                                <p>صاحب أعلى تقييم في الدورة السابقة يُكافأ بـ "صوتين" في تصويت الأسبوع العشوائي.</p>
                            </li>
                        </ul>
                    </div>

                    {/* المادة 8 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (8): المناسبات الخاصة والاستيلاء</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500 mt-2 shrink-0"></div>
                                <p>في حال وجود مناسبة خاصة (ترقية، زواج، مولود.. إلخ)، يحق لصاحب المناسبة "الاستيلاء" على الأسبوع وتأجيل الدورة كاملة أسبوعاً للوراء، لضمان عدم ضياع دور أحد.</p>
                            </li>
                        </ul>
                    </div>

                    {/* ═══ تعديلات v12: بنود إنصاف الترتيب ═══ */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (12): الطلعة المعفوّة</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <p>تُسقَط من سجل كل ملك <strong className="text-emerald-200">أسوأ طلعة واحدة</strong> عند احتساب ترتيب ملك السنة، ولا تُحتسب ضمن معدّله.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <p>شرط التطبيق: أن يكون في سجل الملك <strong className="text-emerald-200">أربع طلعات فأكثر</strong>، حتى لا يُحتسب أحد على طلعتين فقط.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <p><strong className="text-emerald-200">قيد مانع للتلاعب:</strong> لا تُسقَط الطلعة المعفوّة إذا كانت الطلعة الوحيدة في الدورة المرجّحة (المادة 14)؛ ويُسقَط بدلاً منها ثاني أسوأ طلعة. بدون هذا القيد يستطيع الملك أن يطلب من أصدقائه إفساد طلعته الأخيرة عمداً لتسقط ومعها وزن الدورة كله، فيرتفع معدّله بدل أن ينخفض.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                <p>الحكمة: أي طلعة تتعرّض لظرف طارئ أو استهداف منسّق تسقط تلقائياً، فلا يُحاسَب الملك عمراً كاملاً على ليلة واحدة.</p>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (13): التنحّي لتعارض المصالح</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>إذا ثبت وجود <strong className="text-sky-200">خصومة قائمة</strong> بين عضوين، يجوز للعميد بموافقة عضوين آخرين إعلانهما "متعارضَين"، فلا يُحتسب تقييم أيٍّ منهما على طلعة الآخر.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p><strong className="text-sky-200">شرط الحماية:</strong> لا يُطبَّق التنحّي إذا كان سيُبقي الطلعة بأقل من <strong className="text-sky-200">ثلاثة مقيّمين</strong>؛ ففي هذي الحالة يبقى التقييم محتسباً، لأن رأي شخص أو شخصين لا يصلح معدّلاً.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>التنحّي <strong className="text-sky-200">متبادل دائماً</strong> — لا يجوز أن يتنحّى طرف دون الآخر.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>يُراجَع كل تعارض في نهاية كل دورة، ويُلغى تلقائياً ما لم يُجدَّد.</p>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-violet-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (14): ترجيح الدورة الأخيرة</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p>تُحتسب <strong className="text-violet-200">الدورة الختامية للسنة (السادسة) بوزن ٢.٥</strong> — أي كأنها دورتان ونصف عادية — وباقي الدورات بوزن ١. أما قبل اكتمالها فتتساوى الدورات كلها، فلا تُرجَّح دورةٌ ليست ختام السنة.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p><strong className="text-violet-200">لا تدخل دورة في الحساب إلا بعد أن يلعبها الأعضاء الستة كاملين.</strong> الدورة الناقصة تُستثنى حتى تكتمل، منعاً لمحاسبة البعض بمقياس لم يخضع له الباقون.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p>الأثر العملي: الدورة الجارية تحسم الترتيب أكثر من كل ما سبقها، فمن تحسّن يصعد بسرعة ومن تراجع ينزل بسرعة.</p>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">المادة (15): بطلان التواطؤ</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                                <p>التواطؤ هو: <strong className="text-rose-200">اتفاق مسبق بين عضوين أو أكثر على منح تقييم محدّد لشخص بعينه بصرف النظر عن تجربة الطلعة.</strong></p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                                <p>كل اتفاق يُعقد "من تحت لتحت" حول التقييمات <strong className="text-rose-200">باطل ولا أثر له</strong>، سواء أُبرم قبل هذا الدستور أو بعده.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                                <p><strong className="text-rose-200">الجزاء:</strong> يُلغى تقييم المتواطئ على تلك الطلعة ويُحتسب المعدّل بدونه. وعند التكرار يُلغى تقييمه لبقية الدورة.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 mt-2 shrink-0"></div>
                                <p><strong className="text-rose-200">القرار:</strong> بيد العميد وموافقة عضوين، وفق آلية المادة (1). ولمن صدر ضده القرار حق عرض دفاعه على المجموعة أولاً.</p>
                            </li>
                        </ul>
                    </div>

                    {/* v9 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">v9: جائزة ملك السنة (التتويج)</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                                <p>في نهاية العام، يُحسب مجموع الأصوات، والفائز يلقب بـ (لقب يُحدد لاحقاً).</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                                <p><strong className="text-yellow-300">الجائزة:</strong> يختار المطعم وتتكفل المجموعة بعزيمته (بشرط ألا تتجاوز الفاتورة 200 ريال للفرد من البقية).</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-yellow-500 mt-2 shrink-0"></div>
                                <p><strong className="text-yellow-300">شرط التتويج:</strong> لا تتم عزيمة الفائز إلا في طلعة يكون فيها الحضور مكتملاً.</p>
                            </li>
                        </ul>
                    </div>

                    {/* v11 — features supported by the app */}
                    <div className="bg-pink-900/10 border border-pink-500/30 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-pink-300 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">v11: التطبيق وأدواته (مكمّلة للدستور)</span>
                        </h3>
                        <p className="text-slate-300 pr-0 sm:pr-8 text-sm">
                            الدستور يحكم القرارات الجوهرية، أما الأدوات التالية الموجودة في تطبيق "عرش الخميس" فهي وسائل تيسير لا قوانين بحد ذاتها:
                        </p>
                        <ul className="space-y-2 list-none pl-0 pr-2 sm:pr-8 text-sm">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>⭐ <strong className="text-pink-200">التقييم بالنجوم</strong> (١-٥) لكل عضو حضر، يُحدّد ترتيب الملك في الدورة.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>🚽 <strong className="text-pink-200">تقييم الحمّامات</strong> لكل مطعم — مكافأة إضافية لأصحاب النضافة.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>🗳️ <strong className="text-pink-200">التصويت على اليوم/المطعم</strong>: ديموقراطي (إذا اختاره الملك) أو دكتاتوري (الافتراضي).</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>🚨 <strong className="text-pink-200">"أنا فاضي"</strong>: أي عضو يقدر يبدأ لقاء مفاجئ خلال ١٥ دقيقة. لو ٢+ ردّوا &quot;أنا معك&quot; → يُعلن اللقاء.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>🗺️ <strong className="text-pink-200">خريطة المطاعم</strong>: مواقع كل المطاعم التي زرناها، مع روابط قوقل.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>🤖 <strong className="text-pink-200">المخطّط الذكي</strong>: ذكاء اصطناعي يقترح مطعم من ١١ ألف مطعم في الرياض حسب الميزانية والمزاج.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>📜 <strong className="text-pink-200">الذمّة الرقمية</strong>: العميد يقدر يفتح أي أسبوع اعتُمد بالغلط ويعيد تحديد المطعم/اليوم.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-500 mt-2 shrink-0"></div>
                                <p>🎨 <strong className="text-pink-200">الثيمات الشخصية</strong>: كل عضو يختار ثيمه (١٦ ثيم متاح، منها TikTok وبنتو وكوميك).</p>
                            </li>
                        </ul>
                        <p className="text-amber-300/80 text-xs pr-0 sm:pr-8 italic">
                            أدوات التطبيق مرنة ومتطورة باستمرار، ولا تُلزم الدستور. لو تعارضت مع روح الدستور، الدستور أعلى.
                        </p>
                    </div>

                    {/* v10 */}
                    <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-start gap-2 sm:gap-3 text-base sm:text-lg">
                            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">v10: مرونة الدستور وخدمة الأعضاء</span>
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2 sm:pr-8">
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500 mt-2 shrink-0"></div>
                                <p><strong className="text-teal-300">الهدف الأسمى:</strong> الهدف الأساسي من هذا الدستور هو خدمة الأعضاء وضمان متعتهم واجتماعهم.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500 mt-2 shrink-0"></div>
                                <p><strong className="text-teal-300">قابلية التغيير:</strong> بناءً على ذلك، تُعتبر جميع المواد المذكورة أعلاه "وسائل وليست غايات"؛ فهي قابلة للتعديل أو التعطيل المؤقت إذا ثبت أنها تعارض مصلحة الأعضاء أو تسبب حرجاً للمجموعة، وذلك وفقاً للآلية المذكورة في المادة (1) (قرار العميد + موافقة شخصين).</p>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 px-6 rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                        فهمت الدستور
                    </button>
                </div>
            </div>
        </div>
    );
}
