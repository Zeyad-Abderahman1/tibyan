# تِبيان — Master Specification v1.0

**الاسم:** تِبيان — Tibyan  
**الوصف:** مساعد المدرس الذكي  
**الشعار الوظيفي:** من التحضير إلى الامتحان، كل أدوات المدرس في مكان واحد  
**نوع المنتج:** Local-first Windows desktop application + mobile companion over LAN  
**المستخدم الأساسي:** مدرس رياضيات يدرّس من الصف الأول الإعدادي حتى الصف الثالث الثانوي، ويشمل نظام البكالوريا، بالعربي وMath لغات، ويغطي جميع فروع الرياضيات.

---

## 1. هدف المنتج

تِبيان ليس نظام مدرسة ولا ERP تقليدي ولا برنامج كاشير. هو **Teacher Operating System** محلي أولًا، يساعد المدرس في إدارة المجموعات والطلاب، التحضير، بناء بنك أسئلة، إنشاء امتحانات ورقية بالذكاء الاصطناعي، التحقق الرياضي، الطباعة الاحترافية، تصحيح أوراق الطلاب المصورة، تحليل الأداء، الحضور، المدفوعات، والمتابعة اليومية.

القيمة الأساسية:

1. تقليل وقت التحضير والإدارة اليدوية.
2. جعل الامتحان من المصدر إلى الطباعة عملية واحدة متكاملة.
3. ربط نتائج الامتحانات بنقاط ضعف الطلاب والتحضير للحصص التالية.
4. إعطاء المدرس Assistant AI حقيقي يستطيع قراءة بيانات تِبيان وتنفيذ أوامر عليها بأمان.
5. العمل بدون Cloud أو Server خارجي في النسخة الأولى.

---

## 2. مبادئ التصميم الأساسية

### 2.1 Local-first
- جهاز Windows واحد هو المصدر الرئيسي للبيانات.
- قاعدة البيانات والملفات محفوظة محليًا.
- لا يوجد Cloud dependency في V1.
- تطبيقات الموبايل تتصل فقط عبر نفس Wi‑Fi/LAN.
- البرنامج يظل قابلًا للاستخدام بدون إنترنت في كل ما لا يحتاج Gemini API.

### 2.2 AI مساعد وليس صاحب القرار
- Gemini لا يكتب SQL ولا يصل لقاعدة البيانات مباشرة.
- كل عملية AI تمر عبر Tools/Commands محددة.
- العمليات الحساسة تستخدم: Preview → Confirm → Execute → Audit → Undo حيث ينطبق.
- التوليد الأكاديمي يبقى قابلًا لمراجعة المدرس قبل الاعتماد.

### 2.3 Math-first
- لأن المنتج لمدرس رياضيات، دعم المعادلات، LaTeX، الرسوم، الأسئلة متعددة الخطوات، التحقق الرياضي، والدرجات الجزئية هو Core وليس إضافة.

### 2.4 Print-first exams
- الامتحان النهائي ورقي.
- الـAI يولد المحتوى، لكن Print/Layout Engine هو المسؤول عن الشكل النهائي.
- WYSIWYG preview قبل الطباعة.
- دعم PDF عالي الجودة والطباعة المباشرة.

### 2.5 Premium UX
- لا يشبه POS/ERP التقليدي.
- واجهة هادئة Premium، RTL حقيقي، Light/Dark.
- تقريبًا 70% productivity app (Apple/Linear/Notion style) + 30% educational intelligence.
- هوية تِبيان: كحلي/تركواز/ذهبي، مع الشعار العربي المعتمد.

---

## 3. النطاق الدراسي

### 3.1 المراحل
- الصف الأول الإعدادي.
- الصف الثاني الإعدادي.
- الصف الثالث الإعدادي.
- الصف الأول الثانوي.
- الصف الثاني الثانوي.
- الصف الثالث الثانوي.
- نظام البكالوريا.

### 3.2 المسارات اللغوية
- عربي.
- Math لغات/English.
- المجموعات العربية واللغات منفصلة تمامًا.

### 3.3 الفروع
النظام لا يفرض قائمة ثابتة، لكنه يدعم كل فروع الرياضيات مثل:
- Algebra.
- Geometry.
- Trigonometry.
- Calculus.
- Statistics.
- Applied mathematics / Mechanics عند الحاجة.
- أي تقسيم خاص بالمرحلة أو البكالوريا.

### 3.4 هيكل المنهج
`Academic System → Grade → Language Track → Math Branch → Unit/Chapter → Lesson → Concept → Skill`

هذا الهيكل يستخدم في التحضير، بنك الأسئلة، الامتحانات، التحليلات، وتتبع التقدم.

---

## 4. المستخدمون والصلاحيات

### 4.1 Teacher / Owner
يمتلك كامل الصلاحيات:
- الطلاب والمجموعات.
- الحضور.
- المدفوعات.
- بنك الأسئلة.
- الامتحانات.
- النتائج.
- التحضير.
- إعدادات النظام.
- الصلاحيات.
- النسخ الاحتياطي.
- AI Assistant.

### 4.2 Assistant
- حساب مستقل باسم المستخدم + PIN.
- صلاحيات قابلة للتخصيص.
- أمثلة الصلاحيات:
  - تسجيل الحضور.
  - Scan QR/Barcode.
  - تسجيل المدفوعات.
  - طباعة الإيصالات.
  - عرض بيانات الطالب الأساسية.
  - متابعة الغياب والمتأخرات.
  - فتح رسائل WhatsApp جاهزة.
- لا يرى أو يعدل إعدادات حساسة إلا بإذن صريح.

### 4.3 Audit Log
كل عملية مهمة تسجل:
- المستخدم.
- الوقت.
- نوع العملية.
- الكيان المتأثر.
- القيمة السابقة والجديدة عند الحاجة.
- الجهاز/الجلسة.

---

## 5. الهيكل التقني المقترح

### 5.1 Desktop
- Electron.
- React.
- TypeScript.
- UI component system حديث ومخصص لهوية تِبيان.

### 5.2 Database
- SQLite محلية.
- كل سنة دراسية Database مستقلة.
- السنة السابقة تؤرشف كملف مستقل للرجوع إليها.

### 5.3 Mobile
- React Native + Expo.
- تطبيق واحد بتجربة مختلفة حسب Role.
- Teacher mode.
- Assistant mode.

### 5.4 LAN Architecture
- Windows app يشغل Local API service.
- الموبايلات تكتشف/تتصل بالـPC على نفس الشبكة.
- Pairing أول مرة عبر QR أو PIN.
- لا يوجد Remote Access خارجي في V1.

### 5.5 AI
- Gemini API للوظائف الذكية داخل المنتج.
- Function Calling / structured outputs.
- AI Tool Layer منفصلة عن Database Layer.

### 5.6 Math Engine
- محرك رياضي deterministic محلي، مثل SymPy service/bridge أو ما يعادله.
- مسؤول عن التحقق الرياضي وليس اللغة الطبيعية.

### 5.7 Math UI
- MathLive أو ما يعادله لإدخال الرياضيات.
- KaTeX أو ما يعادله للعرض.
- دعم عربي/إنجليزي + RTL/LTR mixed content.

---

## 6. الصفحة الرئيسية — Today Dashboard

الهدف: المدرس يفتح البرنامج ويعرف فورًا ماذا يفعل اليوم.

المحتوى المقترح:
- حصص اليوم.
- زر واضح: **ابدأ الحصة**.
- الطلاب المتوقع حضورهم.
- الطلاب الذين يحتاجون متابعة.
- متأخرات مالية مهمة.
- امتحانات قريبة.
- تحضير غير مكتمل.
- آخر نشاط.
- Quick actions: حضور، دفع، إنشاء امتحان، تحضير درس، فتح AI.

لا تكثر الرسوم البيانية. التركيز على العمل اليومي والإجراءات.

---

## 7. إدارة الطلاب

### 7.1 بيانات الطالب
- Student ID داخلي.
- الاسم.
- الصورة.
- الصف.
- المسار: عربي / لغات.
- المجموعة.
- رقم ولي أمر واحد أساسي.
- نوع الدفع: شهري / بالحصة.
- قيمة الاشتراك/الحصة.
- الحالة: Active / Inactive.
- ملاحظات.
- Tags.
- QR token.
- Barcode value.

### 7.2 Student Timeline
يعرض:
- الحضور والغياب.
- المدفوعات.
- الامتحانات والدرجات.
- الملاحظات.
- نقاط الضعف.
- التغييرات على المجموعة.

### 7.3 Student Notes
- ملاحظات حرة.
- Tags سريعة مثل: ضعيف في الجبر، يحتاج متابعة، ممتاز، كثير الغياب.
- تظهر أهم الملاحظات بسرعة قبل الحصة.

---

## 8. إدارة المجموعات والجلسات

### 8.1 Group
- الاسم.
- الصف.
- عربي/لغات.
- الفرع الرياضي عند الحاجة.
- الجدول الأسبوعي الأساسي.
- قيمة الاشتراك.
- نوع الدفع الافتراضي.
- الطلاب.

### 8.2 Sessions
- كل حصة فعلية Entity مستقلة.
- المواعيد ثابتة عادةً، لكن يمكن تعديل Session واحدة دون تغيير الجدول الأساسي.
- حالات الحصة:
  - Scheduled.
  - Completed.
  - Rescheduled.
  - Cancelled by teacher.

### 8.3 1-to-1
- موجود كخيار مدعوم تقنيًا، لكنه ليس الاستخدام الرئيسي.

---

## 9. الحضور

### 9.1 طرق التسجيل
- يدوي سريع من القائمة.
- QR scan من تطبيق الموبايل.
- Barcode/QR USB scanner على Windows.

### 9.2 حالات الحضور
- Present.
- Absent.
- Late.
- Excused عند الحاجة.

### 9.3 قواعد مالية مرتبطة بالحضور
- الدفع بالحصة: الحصة تتحسب على الطالب سواء حضر أو غاب.
- إذا المدرس ألغى الحصة، لا تُحتسب ماليًا.
- الفصل بين Attendance status وFinancial entitlement.

### 9.4 End-of-Day Follow-up
في نهاية اليوم يظهر للـAssistant:
- الطلاب الغائبون.
- من تم التواصل مع ولي أمره.
- من لم يتم التواصل معه.
- زر فتح WhatsApp برسالة جاهزة بدون API.
- حالات: تم التواصل / لم يتم / تعذر التواصل.

---

## 10. Student Cards

### 10.1 Card Content
- اسم الطالب.
- صورته.
- الصف.
- المجموعة.
- Student ID.
- QR.
- Barcode.
- هوية المدرس/تِبيان حسب القالب.

### 10.2 Card Design
- قالب ثابت قابل للإعداد.
- رفع صورة الطالب داخل ملفه.
- تصدير Print-ready للمطبعة.
- High-resolution PDF.
- مقاسات حقيقية + Safe Area/Bleed حسب إعداد القالب.
- تصدير مجموعة كاملة دفعة واحدة.

---

## 11. الإدارة المالية

### 11.1 طرق التسعير
- شهري.
- بالحصة.

### 11.2 الدفع
- Physical / Cash في V1.
- لا Wallet مسبق.
- دعم دفعة جزئية عند الحاجة.
- خصومات بإذن مناسب.

### 11.3 Monthly
- يولد الاستحقاق الشهري.
- يعرض Paid / Partially Paid / Overdue.

### 11.4 Per Session
- بمجرد إنشاء Session مستحقة للمجموعة، يحتسب الاستحقاق على الطلاب.
- الحضور/الغياب لا يلغي الاستحقاق.
- إلغاء المدرس للحصة يلغي الاستحقاق.

### 11.5 Thermal Receipt
عند تسجيل دفعة:
- طباعة إيصال فوري.
- الاسم.
- المجموعة.
- المبلغ.
- نوع الدفع.
- المتبقي.
- التاريخ والوقت.
- اسم المستخدم الذي استلم.
- Transaction ID.
- QR اختياري للعملية.
- Reprint مسموح ويسجل في Audit Log.

### 11.6 Payment Alerts
- متأخرات.
- قائمة الطلاب المتأخرين.
- تنبيه Assistant/Teacher.
- زر WhatsApp برسالة جاهزة، بدون Auto-send في V1.

---

## 12. Curriculum & Lesson Preparation

### 12.1 Curriculum Progress
لكل مجموعة:
- ما تم شرحه.
- ما تبقى.
- نسبة التقدم.
- توقع موعد الانتهاء.

### 12.2 Lesson Planner
لكل درس:
- أهداف.
- مراجعة سابقة.
- شرح.
- أمثلة.
- أسئلة أثناء الحصة.
- أخطاء شائعة.
- Homework.
- مدة كل جزء.
- ملاحظات.

### 12.3 AI Lesson Assistant
- يعتمد على ملفات المدرس والمحتوى المحدد.
- يقترح خطة حصة حسب المدة.
- يستطيع أخذ مستوى المجموعة في الاعتبار.
- لا يعتمد أي تغيير نهائي دون مراجعة المدرس.

### 12.4 Lesson Reflection
بعد الحصة:
- Completed / Partially completed.
- ماذا لم يتم؟
- نقاط تحتاج مراجعة.
- ملاحظات سريعة.

---

## 13. PDF Ingestion & Question Bank

### 13.1 Sources
يمكن رفع:
- PDF واحد.
- عدة PDFs لنفس الامتحان أو نفس البنك.
- تحديد صفحات/أجزاء بعينها.

### 13.2 PDF Role
الـPDF مصدر لبنك الأسئلة والمحتوى، وليس مجرد مكتبة ملفات عامة.

### 13.3 Extraction
النظام يستخرج/يقترح:
- السؤال.
- النوع.
- الخيارات.
- الإجابة إن وجدت.
- الحل إن وجد.
- الصف.
- اللغة.
- الفرع.
- الوحدة/الباب/الدرس.
- Concept/Skill.
- الصعوبة المقترحة.
- Source file + page reference.

### 13.4 Bulk Review
بعد الاستخراج:
- Preview جماعي.
- Select all / deselect.
- استبعاد أسئلة.
- تعديل سريع.
- تغيير تصنيف/صعوبة بالجملة.
- اعتماد المحدد دفعة واحدة.

### 13.5 Duplicate Detection
- كشف exact duplicates.
- كشف semantic similarity.
- عرض similarity score.
- خيارات: Skip / Merge Sources / Keep Both.
- يفضل سؤال واحد متعدد المصادر بدل تكرار التخزين.

### 13.6 Question Entity
كل سؤال عنصر مستقل يحتوي:
- النص.
- math blocks.
- images/graphs.
- type.
- marks.
- difficulty.
- source references.
- language.
- curriculum tags.
- model answer.
- step rubric إن وجد.
- usage history.
- performance statistics لاحقًا.

---

## 14. AI Exam Builder

### 14.1 Source Restriction
- الـAI يلتزم بالمحتوى الموجود في PDFs المختارة.
- لا يدخل Topic من خارج المصدر افتراضيًا.
- يمكن استخدام عدة PDFs معًا.

### 14.2 Teacher Controls
المدرس يحدد:
- الصف.
- عربي/لغات.
- الفروع.
- الأبواب/الدروس.
- ملفات/صفحات المصدر.
- عدد الأسئلة.
- نوع الأسئلة.
- الدرجة الكلية.
- الزمن.
- توزيع الصعوبة.
- شكل الامتحان.

### 14.3 Difficulty
طريقتان:
1. المدرس يحدد النسب يدويًا، مثل 20/50/30.
2. تِبيان يقترح التوزيع حسب مستوى المجموعة، مع إمكانية التعديل.

### 14.4 Question Types
- MCQ.
- Short Answer.
- Numeric.
- Equation/Expression.
- Long Problem.
- Proof.
- Graph-related.
- Geometry-related.
- Mixed exam.

### 14.5 Models
- A/B/C/D عند الحاجة.
- نفس Blueprint والدرجة والزمن تقريبًا.
- توزيع صعوبة متوازن.
- يمكن تغيير الأسئلة أو ترتيبها.
- Answer key منفصل لكل نموذج.

### 14.6 AI Output
Structured output، وليس نصًا حرًا فقط.

---

## 15. Math Engine

### 15.1 الوظيفة
التحقق الرياضي deterministic من:
- المعادلات.
- الحلول.
- التكافؤ بين التعبيرات.
- التبسيط.
- المشتقات.
- التكاملات.
- النهايات.
- النتائج الرقمية.
- بعض المتجهات والمصفوفات.

### 15.2 Workflow
AI generates/reads → Math Engine validates → Teacher sees status.

### 15.3 Failure Handling
إذا لم يستطع Math Engine التحقق:
- لا يدّعي الصحة.
- يحول السؤال إلى Review Required.

---

## 16. Exam Layout & Printing Engine

### 16.1 Principle
AI يولد المحتوى فقط. Layout Engine هو صاحب القرار في شكل الورقة.

### 16.2 Templates
يمكن حفظ Templates مثل:
- Weekly Quiz.
- Monthly Exam.
- Final Revision.
- Comprehensive Exam.

### 16.3 Teacher Controls
- ترتيب الأقسام.
- MCQ/long problems/mixed.
- عدد الأعمدة.
- مساحة الإجابة.
- بداية سؤال في صفحة جديدة.
- Keep question together.
- Header/footer.
- اسم المدرس.
- الصف.
- الزمن.
- الدرجة.
- QR.

### 16.4 WYSIWYG
المدرس يرى ما سيخرج على الورق فعلًا.

### 16.5 Smart Page Breaking
- محاولة عدم فصل السؤال وفروعه.
- تحريك السؤال للصفحة التالية إذا لزم.
- السماح بتجاوز يدوي.

### 16.6 Math Printing
يجب أن تظهر باحتراف:
- Fractions.
- Roots.
- Integrals.
- Limits.
- Matrices.
- Vectors.
- Trigonometry.
- Piecewise functions.
- عربي/English mixed layout.

### 16.7 Outputs
- Student Copy.
- Teacher Copy.
- Answer Key.
- Model Answer.
- PDF.
- Direct Print.

---

## 17. Exam Identification & QR

يدعم خيارين:

### 17.1 Personalized Exam Paper
- اسم الطالب.
- QR خاص.
- Exam ID.
- Model ID.
- Group reference.

### 17.2 Generic Exam + Personalized Answer Sheet
- ورقة أسئلة عامة.
- Answer sheet منفصلة لكل طالب.
- QR يربط الطالب بالامتحان والنموذج.

الـQR لا يعرض بيانات حساسة مباشرة؛ يستخدم Token/IDs داخلية.

---

## 18. Paper Exam Correction

### 18.1 Input
- صورة من تطبيق الموبايل.
- Scanner/ملف صورة على Windows عند الحاجة.

### 18.2 Identification
- قراءة QR.
- معرفة Student + Exam + Version تلقائيًا.

### 18.3 Correction
- MCQ: auto-correct.
- Numeric/short: OCR + structured comparison.
- Mathematical expression: AI read + Math Engine check.
- Long solution: AI reads steps + rubric + Math Engine where applicable.

### 18.4 Partial Credit
يدعم درجات جزئية حسب Rubric، مثل:
- اختيار القانون.
- التعويض.
- خطوات الحل.
- النتيجة النهائية.

### 18.5 Confidence
- High confidence: اقتراح قوي ويمكن اعتماده بسرعة.
- Low confidence: يذهب إلى Review Queue.
- المدرس هو صاحب الاعتماد النهائي عند الحالات غير الواضحة.

### 18.6 Result Write-back
بعد الاعتماد:
- يسجل الدرجة تلقائيًا.
- يسجل item-level results.
- يحدث الطالب والمجموعة.
- يظهر في التحليلات.

---

## 19. Results & Learning Analytics

### 19.1 Student
- الدرجات بمرور الوقت.
- التحسن/الهبوط.
- نقاط القوة.
- نقاط الضعف.
- Concepts ضعيفة.

### 19.2 Group
- متوسط المجموعة.
- سؤال صعب على الجميع.
- Concept ضعيف عند نسبة كبيرة.

### 19.3 Needs Attention
قائمة سريعة للطلاب الذين يحتاجون تدخلًا بناءً على:
- انخفاض الدرجات.
- الغياب.
- ملاحظات المدرس.
- Concepts ضعيفة.

### 19.4 Feedback Loop
Assessment → Analysis → Suggest review topic → Add to next lesson preparation.

---

## 20. AI Assistant داخل تِبيان

### 20.1 Read examples
- مين غاب النهاردة؟
- مين متأخر في الدفع؟
- مين درجاته نزلت آخر 3 امتحانات؟
- المجموعة وصلت لفين في المنهج؟

### 20.2 Write examples
- سجل أحمد غائب.
- أضف ملاحظة لسارة.
- سجل دفعة 500 جنيه.
- أنشئ امتحان من الملفات المحددة.
- أنشئ مجموعة مراجعة من الطلاب الضعفاء.

### 20.3 Safety model
- Read-only actions: تنفذ مباشرة.
- Safe writes: confirmation خفيف حسب العملية.
- Critical/bulk writes: Preview واضح + Confirm.
- كل AI action تسجل في Audit Log.
- Undo حيث يكون ممكنًا.

---

## 21. Mobile App

### 21.1 Teacher Mode
- Today.
- المجموعات.
- الطلاب.
- حضور.
- نتائج.
- AI Assistant.
- Exam draft review.
- Notes.

### 21.2 Assistant Mode
- Scan attendance.
- Manual attendance.
- Student lookup.
- Payment recording.
- Thermal receipt trigger على Windows/local printer flow حسب البنية.
- End-of-day follow-up.
- WhatsApp prepared message.

### 21.3 Camera Features
- QR/Barcode scan.
- تصوير ورقة الامتحان للتصحيح.
- تصوير سؤال/صفحة مستقبلًا للاستخراج.

### 21.4 LAN-only
- يعمل عند اتصال الجهاز بنفس شبكة Windows master.
- لا توجد مزامنة Cloud في V1.

---

## 22. WhatsApp بدون API

- لا Auto-send في V1.
- النظام يولد رسالة جاهزة.
- يفتح WhatsApp/WhatsApp Desktop/Web على رقم ولي الأمر.
- المستخدم يضغط Send يدويًا.
- بعد الإرسال يسجل Follow-up state يدويًا.

Use cases:
- غياب.
- تأخر دفع.
- تغيير موعد.
- متابعة عامة.

---

## 23. Reports

في V1 التقارير داخل البرنامج فقط.

أمثلة:
- Attendance report.
- Payment/overdue report.
- Exam results.
- Student performance.
- Group performance.
- Daily follow-up.

PDF/Excel report exports ليست Requirement أساسية في V1.

---

## 24. Backup & Academic Year Lifecycle

### 24.1 Backup
- Backup تلقائي أسبوعي على نفس جهاز Windows.
- الاحتفاظ بعدة نسخ سابقة.
- Verify backup integrity.
- Manual restore.

### 24.2 New Academic Year
- Database جديدة.
- قاعدة السنة السابقة تؤرشف.
- يمكن فتحها للقراءة عند الحاجة.
- لا تختلط بيانات السنوات في نفس DB.

---

## 25. UX / Visual Design

### 25.1 Visual Direction
- Premium, calm, modern.
- RTL-first.
- Light/Dark من V1.
- هوية تِبيان المعتمدة.

### 25.2 Navigation
Sidebar مختصر مثل:
- الرئيسية.
- حصص اليوم.
- المجموعات.
- الطلاب.
- التحضير.
- بنك الأسئلة.
- الامتحانات.
- النتائج.
- المالية.
- المساعد الذكي.
- الإعدادات.

### 25.3 UX Principles
- Contextual screens.
- Quick actions.
- Command palette.
- Search سريع.
- Keyboard friendly.
- تقليل الجداول إلا عند الحاجة.
- لا توجد شاشات مزدحمة تشبه أنظمة الكاشير.

---

## 26. Non-goals for V1

لا نضيف الآن:
- موقع للمدرس.
- تسجيل طلاب أونلاين.
- Parent app.
- Student app.
- Cloud server.
- Remote access من خارج السنتر.
- Online exams.
- WhatsApp Business API.
- Payment gateway.
- Marketplace.
- Multi-PC Windows deployment.
- Prepaid student wallet.
- PDF/Excel report exports كمتطلب أساسي.

---

## 27. Core Data Entities

هذه ليست SQL نهائية، لكنها حدود الدومين الأساسية:

- AcademicYear
- AcademicSystem
- Grade
- LanguageTrack
- MathBranch
- CurriculumUnit
- Lesson
- Concept
- Skill
- User
- Role
- Permission
- Student
- StudentNote
- Group
- GroupEnrollment
- GroupSchedule
- Session
- AttendanceRecord
- GuardianContact
- PricingPlan
- Charge
- Payment
- Receipt
- QuestionSource
- SourceDocument
- Question
- QuestionVariant
- QuestionRubric
- Exam
- ExamSection
- ExamQuestion
- ExamVersion
- ExamAssignment
- AnswerSheet
- ExamSubmission
- QuestionResult
- StudentExamResult
- LessonPlan
- Homework
- AIAction
- AuditLog
- BackupRecord
- AppSetting

---

## 28. Key Workflows

### 28.1 Add student
Create Student → Upload photo → Assign group → Set payment type → Generate QR/Barcode → Card ready.

### 28.2 Attendance
Scan/manual → identify student → validate group/session → record attendance → show financial state if needed.

### 28.3 Payment
Search/scan student → enter amount → system allocates payment → calculate remaining → save transaction → print thermal receipt → audit.

### 28.4 PDF to question bank
Upload PDFs → parse/OCR → extract questions → classify → duplicate detection → bulk preview → approve selected → save question bank.

### 28.5 Create exam
Select group/grade/source → set blueprint → AI drafts → Math Engine validates → quality checks → teacher edits → layout → print/PDF.

### 28.6 Correct exam
Capture paper → QR identification → OCR/vision → answer extraction → AI/rubric/math validation → confidence review → approve → grade written to DB → analytics updated.

### 28.7 End of day
Show absent students + overdue actions → open prepared WhatsApp message → mark follow-up status.

---

## 29. Quality Rules

1. لا عملية مالية تُحذف بصمت؛ تستخدم reversal/adjustment أو audit واضح.
2. لا AI bulk write بدون Preview.
3. لا Math answer يُعتبر صحيحًا لمجرد قول LLM ذلك إذا كان يمكن التحقق حسابيًا.
4. لا طباعة امتحان بدون Preview.
5. لا سؤال مستورد يُخزن عشوائيًا دون duplicate check.
6. لا حفظ درجات تصحيح منخفض الثقة بدون Review.
7. كل UI عربي يجب أن يكون RTL حقيقيًا، وليس مجرد محاذاة نص.
8. Mixed Arabic/English/math يجب اختباره في كل الشاشات المطبوعة.
9. Auto-save في editors المهمة.
10. Crash recovery للمدخلات الطويلة قدر الإمكان.

---

## 30. V1 Acceptance Criteria

تعتبر V1 صالحة للاستخدام الحقيقي عندما يستطيع المدرس:

1. إنشاء مجموعة وطلاب.
2. إنشاء كروت QR/Barcode جاهزة للمطبعة.
3. تسجيل الحضور يدويًا أو بالماسح.
4. تسجيل المدفوعات بنظام شهري أو بالحصة.
5. طباعة إيصال حراري.
6. إدارة المنهج وتحضير درس.
7. رفع PDF واحد أو أكثر وتحويله لبنك أسئلة بعد Bulk Review.
8. كشف التكرار في بنك الأسئلة.
9. إنشاء امتحان بالـAI ملتزمًا بالمصادر المحددة.
10. التحقق من المسائل بالـMath Engine حيث ينطبق.
11. تصميم الامتحان وPreview وطباعته/PDF.
12. إصدار Personalized Exam أو Generic Exam + QR Answer Sheet.
13. تصوير ورقة محلولة والتعرف على الطالب والامتحان.
14. اقتراح تصحيح ودرجات جزئية مع Review للحالات غير الواضحة.
15. تسجيل الدرجة في ملف الطالب تلقائيًا بعد الاعتماد.
16. عرض تحليل أساسي للطالب والمجموعة.
17. استخدام AI Assistant للاستعلام وتنفيذ Actions آمنة.
18. استخدام تطبيق Teacher/Assistant على نفس LAN.
19. عرض End-of-day follow-up.
20. إجراء Backup أسبوعي واسترجاعه.

---

## 31. Proposed Build Order

### Phase 1 — Foundation
- Monorepo.
- Desktop shell.
- Design system.
- SQLite/domain layer.
- Auth/PIN/Roles.
- Groups/Students.

### Phase 2 — Operations
- Sessions.
- Attendance.
- QR/Barcode.
- Student cards.
- Finance.
- Thermal receipts.

### Phase 3 — Academic Core
- Curriculum.
- Lesson planner.
- Math editor.
- PDF ingestion.
- Question bank.
- Duplicate detection.

### Phase 4 — Exam System
- Exam blueprint.
- Gemini exam generation.
- Math Engine.
- Layout/Print Engine.
- Models + answer keys.

### Phase 5 — Results
- Paper capture pipeline.
- QR identification.
- OCR/Vision.
- Rubrics/partial credit.
- Result write-back.
- Analytics.

### Phase 6 — AI Assistant
- Tool registry.
- Read queries.
- Safe writes.
- Preview/confirm.
- Audit/undo.

### Phase 7 — Mobile LAN
- Pairing.
- Teacher mode.
- Assistant mode.
- Scanner.
- Paper capture.
- Follow-up.

### Phase 8 — Hardening
- Backup.
- Crash recovery.
- Security review.
- Print stress tests.
- Arabic/English mixed tests.
- Real teacher pilot.

---

## 32. Implementation Guardrails for Antigravity

- لا تبني كل شيء في Prompt واحد.
- كل Module بواجهة واضحة واختبارات مستقلة.
- TypeScript strict mode.
- Database access خلف repository/service layer.
- AI tools خلف explicit schemas.
- لا direct SQL من UI أو AI.
- لا business rules داخل React components.
- Print engine منفصل عن exam generation.
- Math validation منفصل عن AI generation.
- Mobile and desktop share types/contracts، لا share database file مباشرة.
- كل migration لها version.
- كل feature مالية/درجات لها audit.
- استخدم tests للـbusiness rules قبل توسيع UI.

---

## 33. Decision Log — Confirmed by Product Owner

- الاسم: تِبيان / Tibyan.
- المدرس يدرّس من أولى إعدادي حتى ثالثة ثانوي + البكالوريا.
- كل فروع الرياضيات.
- عربي وMath لغات، والمجموعات منفصلة.
- Groups أساسي، و1-to-1 خيار.
- المواعيد ثابتة عادةً مع إمكانية تغيير Session منفردة.
- الامتحانات ورقية.
- تصوير الورقة المصححة مطلوب.
- الدرجات الجزئية مطلوبة.
- QR على الامتحان/Answer Sheet.
- Personalized exam وGeneric + personalized answer sheet كلاهما مطلوب.
- Exam layout مرن يختاره المدرس.
- Difficulty يدوي أو مقترح ذكي.
- AI exam generation ملتزم بالـPDFs المختارة.
- أكثر من PDF مسموح.
- PDF يستخدم كمصدر لبنك الأسئلة.
- Bulk approve للأسئلة المستخرجة.
- Duplicate detection مطلوب.
- Model answer لكل سؤال؛ AI يولده عند غيابه ثم Math validation.
- المالية Core.
- الدفع Physical.
- شهري أو بالحصة.
- Assistant مستخدم فعلي محتمل.
- لكل Assistant حساب/PIN وصلاحيات/Audit.
- الحضور Manual + mobile scan + cashier-style USB scanner.
- Student cards من داخل البرنامج، وتصدر للمطبعة.
- Thermal receipt مطلوب.
- الدفع بالحصة يحتسب تلقائيًا على Session.
- لا prepaid wallet.
- الغياب لا يلغي استحقاق الحصة.
- إلغاء المدرس للحصة يلغي الاستحقاق.
- WhatsApp بدون API: فتح رسالة جاهزة فقط.
- End-of-day absence follow-up مطلوب.
- رقم ولي أمر واحد لكل طالب في V1.
- Student notes مطلوبة.
- التقارير داخل البرنامج فقط في V1.
- كل سنة DB جديدة.
- Windows master واحد + mobile app للTeacher/Assistant.
- LAN-only في V1.
- Backup أسبوعي محلي.
- Light + Dark.
- Premium UI وليس POS/ERP style.

---

**Status:** Product architecture approved. Ready for implementation planning after spec review.
