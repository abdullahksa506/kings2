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
                        دستور عرش الخميس لسنة 2026
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
                <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4 sm:space-y-6 text-slate-300 text-sm sm:text-base leading-relaxed font-sans scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

                    <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-xl">
                        <p className="text-amber-400 font-medium">
                            عميد الدستور (شوكا) ملك التذوق الأعظم لسنة 2026 سيكون مسؤول (فضلاً وليس امراً) عن تيسير أمور الطلعات لهذي السنة.
                        </p>
                    </div>

                    <ul className="space-y-4 list-none pl-0 pr-2">
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>يجب على ملك الخميس أن يقرر <strong>يوم الطلعة</strong> (إن كانت الخميس أو الجمعة) قبل يوم الأربعاء الساعة 8:00م. وفيه مجال لاعتراض الآخرين حتى الساعة 10:00م. إن لم يعترض أحد قبل الساعة 10:00م، تكون الطلعة في اليوم المختار من ملك الخميس، ولا يمكن تغييره.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>يجب على ملك الخميس <strong>اختيار المطعم</strong> قبل يوم الأربعاء 10:00م (إن كانت الطلعة الخميس أو الجمعة).</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>لو تأخر الملك في اختيار المطعم عن يوم الأربعاء الساعة 10:00م، أو في اختيار اليوم عن 8:00م، يخير بين أمرين: إما أن يحتفظ بحقه في الاختيار <strong>لكن يعزمنا</strong>، أو أن يتنازل عن دوره <strong>ويصبح أسبوع عشوائي</strong>.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>في حال تعذر على ملك الخميس الحضور في أسبوعه، فهو مسؤول عن <strong>إيجاد بديل</strong> يبدل دوره بدوره.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>الميزانية ما تزيد عن <strong>175 ريال</strong> للشخص.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p><strong>ممنوع</strong> على الشخص أن يختار نفس المطعم دورتين ورا بعض.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>في حال المناسبات الخاصة يمكنك الاستيلاء على الاسبوع، وتتأجل الدورة كاملة أسبوع (محد يروح دوره).</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>لملك الخميس <strong>الحق في القيادة</strong> إن أراد. إذا حدثت أي خلافات حول القيادة، يحق لملك الخميس الاختيار وفك النزاع.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>لملك الخميس الحق في <strong>اختيار الفعالية</strong>، ولكن في حال اتفقت الأغلبية على عدم الذهاب، تلغى الفعالية.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>إذا كان تقييم أحد الأفراد لدورتين متتالية <strong>2 أو أقل من 5</strong>، يسقط دوره القادم ونتخطاه للشخص الي بعده في التسلسل.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>أعلى تقييم في كل جولة يصير عنده <strong>صوتين</strong> في اختيار المطعم في تصويت الأسبوع العشوائي.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p>بعد كل دورة (6 أسابيع)، يكون <strong>الأسبوع السابع عشوائي لا ملك فيه</strong>.</p>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                            <p><strong>استثناءات:</strong> في الحالات الاستثنائية (مثل زحمة مجنونة في المطعم)، يحق للمجموعة التصويت لتجاهل المطعم المختار، والسماح للملك باختيار مطعم بديل. التصويت يكون بالأغلبية.</p>
                        </li>
                    </ul>

                    <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl space-y-3">
                        <h3 className="font-bold text-slate-200 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-sky-400" />
                            نظام التصويت والنتائج
                        </h3>
                        <ul className="space-y-3 list-none pl-0 pr-2">
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>سيكون عميد الدستور شوكا مسؤول عن جمع الأصوات بعد كل طلعة. ستكون آلية التصويت عن طريق الموقع. ستكون الأصوات مجهولة للجميع (ما عدا العميد)، ويمكنكم الاطلاع على النتيجة النهائية لكل طلعة.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>سيتم حساب النتيجة النهائية بشكل مؤتمت وسري. <strong>لن يتمكن من المشاركة في التصويت سوى الأفراد الحاضرين والمشاركين في الطلعة</strong>.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>ستكون أصوات كل فرد سرية حتى نهاية السنة (إلا لعميد الدستور). في نهاية السنة، عند احتساب الفائز، وسيتم الكشف عن <strong>جميع الأصوات التفصيلية</strong> لكل الأشخاص للجميع.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p><strong>عميد الدستور فقط يحق له تغيير الدستور</strong> وهو الصوت الوحيد في هذا الأمر وفقط مسؤوليته الوحيدة هي التبليغ.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0"></div>
                                <p>آخر السنة، تجمع جميع الأصوات ونحسب من كان أفضل ملك خميس. الفائز يختار المطعم ونعزمه (بشرط أن الفاتورة ما تزيد عن 200 للفرد لبقية المجموعة). عزيمة الفائز لا تكون إلا في <strong>طلعة الحضور فيها مكتمل</strong>.</p>
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
