import { ScrollText, BookOpen } from "lucide-react";
import BottomSheet from "./BottomSheet";

export default function ConstitutionModal({
    isOpen,
    onClose
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title="دستور عرش الخميس لسنة 2026"
            icon={<ScrollText className="w-6 h-6" />}
            headerAccentClass="from-amber-500/20 via-amber-500/10 to-transparent"
        >
                <div className="space-y-5 sm:space-y-8 text-slate-300 text-sm sm:text-base leading-relaxed font-sans">

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
                                <p><strong className="text-amber-200">صلاحية "المصلحة العليا":</strong> يملك العميد وحده حق "ثني" أي قانون أو منح استثناءات طارئة، بشرط الحصول على تأييد شخصين إضافيين من الأعضاء الستة لضمان العدالة.</p>
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
                                <p>عميد الدستور هو المسؤول عن جمع الأصوات مجهولة المصدر عبر الواتساب وتحديث "الگوگل شيت" بشكل مؤتمت.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p><strong className="text-violet-300">الحرمان من التصويت:</strong> يُحرم من التصويت كل من لم يحضر الطلعة، وكذلك من حضر ولم يأكل. التصويت حق حصري لمن شارك في "التذوق" فقط.</p>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-violet-500 mt-2 shrink-0"></div>
                                <p>تظل الأصوات التفصيلية سرية لدى العميد حتى نهاية السنة، حيث تُكشف الحقائق للجميع عند احتساب الفائز.</p>
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

                <button
                    onClick={onClose}
                    className="w-full mt-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold py-3 rounded-xl transition-all"
                >
                    فهمت الدستور
                </button>
        </BottomSheet>
    );
}
