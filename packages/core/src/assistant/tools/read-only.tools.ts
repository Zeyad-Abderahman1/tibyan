import { registerTool } from '../tool-registry.js';

export function registerReadOnlyTools(): void {
  // ─── Students ─────────────────────────────────────────────────────────────
  registerTool({
    name: 'find_students',
    description: 'Search for students by name or code',
    descriptionAr: 'البحث عن الطلاب بالاسم أو الرمز',
    inputSchema: { query: 'string', limit: 'number?' },
    outputSchema: { type: 'array', items: { id: 'string', name: 'string', code: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['STUDENTS_READ'],
    category: 'students',
  });

  registerTool({
    name: 'get_student_details',
    description: 'Get detailed information about a specific student',
    descriptionAr: 'الحصول على معلومات مفصلة عن طالب معين',
    inputSchema: { studentId: 'string' },
    outputSchema: { id: 'string', name: 'string', code: 'string', status: 'string' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['STUDENTS_READ'],
    category: 'students',
  });

  registerTool({
    name: 'list_student_notes',
    description: 'List notes recorded for a student',
    descriptionAr: 'عرض الملاحظات المسجلة لطالب',
    inputSchema: { studentId: 'string' },
    outputSchema: { type: 'array', items: { id: 'string', content: 'string', createdAt: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['STUDENTS_READ'],
    category: 'students',
  });

  registerTool({
    name: 'get_student_status',
    description: 'Get enrollment and attendance status summary for a student',
    descriptionAr: 'عرض ملخص حالة الطالب والتسجيل والحضور',
    inputSchema: { studentId: 'string' },
    outputSchema: { studentId: 'string', status: 'string' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['STUDENTS_READ'],
    category: 'students',
  });

  // ─── Groups ───────────────────────────────────────────────────────────────
  registerTool({
    name: 'list_groups',
    description: 'List all active student groups',
    descriptionAr: 'عرض جميع المجموعات النشطة',
    inputSchema: {},
    outputSchema: { type: 'array', items: { id: 'string', name: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'groups',
  });

  registerTool({
    name: 'get_group_details',
    description: 'Get detailed information about a group',
    descriptionAr: 'عرض تفاصيل مجموعة معينة ومواعيدها وسعتها',
    inputSchema: { groupId: 'string' },
    outputSchema: { id: 'string', name: 'string', schedule: 'object' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'groups',
  });

  registerTool({
    name: 'get_group_schedule',
    description: 'Get weekly schedule for a group',
    descriptionAr: 'عرض الجدول الأسبوعي للمجموعة',
    inputSchema: { groupId: 'string' },
    outputSchema: { groupId: 'string', scheduleSlots: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'groups',
  });

  registerTool({
    name: 'get_group_enrollments',
    description: 'List enrolled students in a group with their count',
    descriptionAr: 'عرض الطلاب المسجلين في مجموعة مع عددهم',
    inputSchema: { groupId: 'string' },
    outputSchema: { type: 'array', items: { studentId: 'string', studentName: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'groups',
  });

  // ─── Sessions ─────────────────────────────────────────────────────────────
  registerTool({
    name: 'get_today_sessions',
    description: 'Get all scheduled teaching sessions for today',
    descriptionAr: 'عرض جميع حصص اليوم المجدولة',
    inputSchema: {},
    outputSchema: { type: 'array', items: { id: 'string', groupName: 'string', time: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'sessions',
  });

  registerTool({
    name: 'get_date_range_sessions',
    description: 'Get scheduled sessions within a date range',
    descriptionAr: 'عرض الحصص المجدولة خلال فترة زمنية محددة',
    inputSchema: { startDate: 'string', endDate: 'string', groupId: 'string?' },
    outputSchema: { type: 'array', items: { id: 'string', date: 'string', groupName: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'sessions',
  });

  registerTool({
    name: 'get_session_details',
    description: 'Get details of a specific teaching session',
    descriptionAr: 'عرض تفاصيل حصة معينة وموعدها وحالتها',
    inputSchema: { sessionId: 'string' },
    outputSchema: { id: 'string', groupId: 'string', date: 'string', status: 'string' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'sessions',
  });

  // ─── Attendance ───────────────────────────────────────────────────────────
  registerTool({
    name: 'get_session_attendance',
    description: 'Get attendance records for a session',
    descriptionAr: 'عرض سجلات الحضور لحصة معينة',
    inputSchema: { sessionId: 'string' },
    outputSchema: { type: 'array', items: { studentId: 'string', studentName: 'string', status: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'attendance',
  });

  registerTool({
    name: 'get_student_attendance',
    description: 'Get attendance history for a student',
    descriptionAr: 'عرض سجل حضور وغياب طالب محدد',
    inputSchema: { studentId: 'string', limit: 'number?' },
    outputSchema: { studentId: 'string', records: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'attendance',
  });

  registerTool({
    name: 'get_attendance_summary',
    description: 'Get attendance percentage and statistics summary',
    descriptionAr: 'عرض إحصاءات وملخص الحضور والغياب',
    inputSchema: { groupId: 'string?', sessionId: 'string?' },
    outputSchema: { totalPresent: 'number', totalAbsent: 'number', totalLate: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'attendance',
  });

  registerTool({
    name: 'get_attendance_follow_up',
    description: 'Get absent students requiring follow-up',
    descriptionAr: 'عرض الطلاب الغائبين المطلوب متابعتهم نهاية اليوم',
    inputSchema: { date: 'string?' },
    outputSchema: { type: 'array', items: { studentId: 'string', studentName: 'string', parentPhone: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'attendance',
  });

  // ─── Curriculum ───────────────────────────────────────────────────────────
  registerTool({
    name: 'list_curriculum_documents',
    description: 'List curriculum document catalogs and library files',
    descriptionAr: 'عرض وثائق ومناهج المكتبة التعليمية',
    inputSchema: { catalogId: 'string?' },
    outputSchema: { type: 'array', items: { id: 'string', title: 'string', gradeLevel: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'curriculum',
  });

  registerTool({
    name: 'get_curriculum_metadata',
    description: 'Get metadata and structure of a curriculum catalog',
    descriptionAr: 'عرض البيانات الوصفية لمنهج دراسي',
    inputSchema: { catalogId: 'string' },
    outputSchema: { id: 'string', title: 'string', subject: 'string', nodeCount: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'curriculum',
  });

  registerTool({
    name: 'get_curriculum_tree',
    description: 'Get full curriculum node hierarchy (units, chapters, lessons)',
    descriptionAr: 'عرض شجرة المنهج كاملة (الوحدات، الفصول، الدروس)',
    inputSchema: { catalogId: 'string' },
    outputSchema: { nodes: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'curriculum',
  });

  registerTool({
    name: 'get_group_curriculum_progress',
    description: 'Get curriculum completion progress for a group',
    descriptionAr: 'عرض مدى تقدم مجموعة في المنهج والدروس المكتملة',
    inputSchema: { groupId: 'string' },
    outputSchema: { groupId: 'string', progressPercent: 'number', completedLessons: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'curriculum',
  });

  registerTool({
    name: 'list_curriculum_source_documents',
    description: 'List source PDFs and reference pages linked to curriculum',
    descriptionAr: 'عرض مراجع ومصادر PDF المرتبطة بالمنهج',
    inputSchema: { catalogId: 'string?' },
    outputSchema: { type: 'array', items: { id: 'string', filename: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'curriculum',
  });

  // ─── Question Bank ────────────────────────────────────────────────────────
  registerTool({
    name: 'list_questions',
    description: 'List or search questions in the question bank',
    descriptionAr: 'البحث في بنك الأسئلة حسب المادة أو الصعوبة أو النص',
    inputSchema: { subject: 'string?', difficulty: 'string?', search: 'string?' },
    outputSchema: { type: 'array', items: { id: 'string', body: 'string', questionType: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'questions',
  });

  registerTool({
    name: 'get_question_details',
    description: 'Get full details of a question including answers and math formulas',
    descriptionAr: 'عرض تفاصيل السؤال والخيارات والإجابة النموذجية',
    inputSchema: { questionId: 'string' },
    outputSchema: { id: 'string', body: 'string', options: 'array', correctAnswer: 'string' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'questions',
  });

  registerTool({
    name: 'get_question_bank_stats',
    description: 'Get question bank statistics and distribution by type',
    descriptionAr: 'عرض إحصائيات بنك الأسئلة وتوزيعها حسب النوع والصعوبة',
    inputSchema: {},
    outputSchema: { totalQuestions: 'number', byType: 'record' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'questions',
  });

  // ─── Exams ────────────────────────────────────────────────────────────────
  registerTool({
    name: 'list_exams',
    description: 'List exams with optional filters',
    descriptionAr: 'عرض الاختبارات المنشأة والمحفوظة',
    inputSchema: { limit: 'number?' },
    outputSchema: { type: 'array', items: { id: 'string', title: 'string', date: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'exams',
  });

  registerTool({
    name: 'get_exam_details',
    description: 'Get full configuration and blueprint of an exam',
    descriptionAr: 'عرض تفاصيل اختبار معين وتاريخه ومعاييره',
    inputSchema: { examId: 'string' },
    outputSchema: { id: 'string', title: 'string', totalMarks: 'number', totalQuestions: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'exams',
  });

  registerTool({
    name: 'get_exam_structure',
    description: 'Get questions and sections breakdown for an exam',
    descriptionAr: 'عرض هيكل الاختبار والأسئلة والدرجات الموزعة',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', sections: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'exams',
  });

  registerTool({
    name: 'get_exam_source_provenance',
    description: 'Get source materials and curriculum nodes from which exam questions were derived',
    descriptionAr: 'عرض أصل ومصادر أسئلة الاختبار من المنهج والمراجع',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', sources: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'exams',
  });

  // ─── Slides ───────────────────────────────────────────────────────────────
  registerTool({
    name: 'list_slide_decks',
    description: 'List all teaching slide decks',
    descriptionAr: 'عرض جميع عروض الشرح والشرائح',
    inputSchema: {},
    outputSchema: { type: 'array', items: { id: 'string', title: 'string', slideCount: 'number' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'slides',
  });

  registerTool({
    name: 'get_slide_deck',
    description: 'Get a slide deck with all its slides and content blocks',
    descriptionAr: 'عرض عرض شرح مع جميع شرائحه وكتل المحتوى',
    inputSchema: { deckId: 'string' },
    outputSchema: { id: 'string', title: 'string', slides: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'slides',
  });

  // ─── Capture & Grading ────────────────────────────────────────────────────
  registerTool({
    name: 'list_capture_sessions',
    description: 'List paper scanning/capture sessions for exam grading',
    descriptionAr: 'عرض جلسات مسح وتصوير أوراق الإجابة',
    inputSchema: {},
    outputSchema: { type: 'array', items: { id: 'string', examId: 'string', pageCount: 'number' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'capture',
  });

  registerTool({
    name: 'list_submissions',
    description: 'List student submissions in a capture session',
    descriptionAr: 'عرض إجابات الطلاب المسحوبة في جلسة تصحيح',
    inputSchema: { sessionId: 'string' },
    outputSchema: { type: 'array', items: { id: 'string', studentId: 'string', status: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'capture',
  });

  registerTool({
    name: 'get_grading_status',
    description: 'Get grading progress and score for a submission',
    descriptionAr: 'عرض حالة تصحيح ورقة إجابة والدرجة الحالية',
    inputSchema: { submissionId: 'string' },
    outputSchema: { submissionId: 'string', status: 'string', totalAwarded: 'number', totalMax: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'grading',
  });

  registerTool({
    name: 'get_grading_decisions',
    description: 'Get itemized grading decisions and feedback per question',
    descriptionAr: 'عرض قرارات التصحيح التفصيلية والدرجات لكل سؤال',
    inputSchema: { submissionId: 'string' },
    outputSchema: { decisions: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'grading',
  });

  // ─── Analytics ────────────────────────────────────────────────────────────
  registerTool({
    name: 'get_exam_analytics',
    description: 'Get analytics summary for an exam',
    descriptionAr: 'عرض ملخص التحليلات ونتائج اختبار معين',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', totalSubmissions: 'number', averageScore: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'analytics',
  });

  registerTool({
    name: 'get_score_distribution',
    description: 'Get score frequency distribution histogram for an exam',
    descriptionAr: 'عرض منحنى توزيع درجات الطلاب في الاختبار',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', buckets: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'analytics',
  });

  registerTool({
    name: 'get_question_performance',
    description: 'Get difficulty and discrimination metrics per question',
    descriptionAr: 'عرض أداء ومعدل صعوبة كل سؤال في الاختبار',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', questions: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'analytics',
  });

  registerTool({
    name: 'get_skill_performance',
    description: 'Get curriculum skill mastery breakdown across students',
    descriptionAr: 'عرض مستوى إتقان المهارات والمفاهيم التعليمية',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', skills: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'analytics',
  });

  registerTool({
    name: 'get_student_results',
    description: 'List all student scores and ranks for an exam',
    descriptionAr: 'عرض قائمة درجات وترتيب الطلاب في اختبار معين',
    inputSchema: { examId: 'string' },
    outputSchema: { type: 'array', items: { studentId: 'string', studentName: 'string', totalScore: 'number' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'analytics',
  });

  // ─── Finance ──────────────────────────────────────────────────────────────
  registerTool({
    name: 'get_financial_summary',
    description: 'Get financial summary for a student',
    descriptionAr: 'عرض الملخص المالي والمدفوعات والمستحقات لطالب',
    inputSchema: { studentId: 'string' },
    outputSchema: { studentId: 'string', totalPaid: 'number', totalDue: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_READ'],
    category: 'finance',
  });

  registerTool({
    name: 'get_finance_kpis',
    description: 'Get overall finance KPIs and revenue totals',
    descriptionAr: 'عرض المؤشرات المالية العامة وإجمالي الإيرادات والمستحقات',
    inputSchema: {},
    outputSchema: { totalCollected: 'number', totalOutstanding: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_READ'],
    category: 'finance',
  });

  registerTool({
    name: 'list_payments',
    description: 'List recorded payment receipts with optional student filter',
    descriptionAr: 'عرض سجل مدفوعات وإيصالات الطلاب',
    inputSchema: { studentId: 'string?', limit: 'number?' },
    outputSchema: { type: 'array', items: { id: 'string', amount: 'number', date: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_READ'],
    category: 'finance',
  });

  registerTool({
    name: 'list_invoices',
    description: 'List issued invoices',
    descriptionAr: 'عرض الفواتير الصادرة للطلاب',
    inputSchema: { studentId: 'string?' },
    outputSchema: { type: 'array', items: { id: 'string', studentName: 'string', totalAmount: 'number' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_READ'],
    category: 'finance',
  });

  registerTool({
    name: 'list_discounts',
    description: 'List applied discounts or fee exemptions',
    descriptionAr: 'عرض الخصومات والاستثناءات المطبقة للطلاب',
    inputSchema: { studentId: 'string' },
    outputSchema: { type: 'array', items: { id: 'string', percentage: 'number', reason: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_READ'],
    category: 'finance',
  });

  // ─── Lesson Planning ──────────────────────────────────────────────────────
  registerTool({
    name: 'list_lesson_plans',
    description: 'List lesson plans',
    descriptionAr: 'عرض خطط الدروس المحفوظة',
    inputSchema: { limit: 'number?' },
    outputSchema: { type: 'array', items: { id: 'string', title: 'string', nodeId: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'get_lesson_plan_details',
    description: 'Get full content and objectives of a lesson plan',
    descriptionAr: 'عرض محتوى وأهداف ومخرجات خطة درس معينة',
    inputSchema: { planId: 'string' },
    outputSchema: { id: 'string', title: 'string', content: 'string', objectives: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'list_session_reflections',
    description: 'List teacher reflections for completed teaching sessions',
    descriptionAr: 'عرض تأملات وملاحظات المعلم بعد الحصص',
    inputSchema: { sessionId: 'string?' },
    outputSchema: { type: 'array', items: { id: 'string', content: 'string', rating: 'number' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ'],
    category: 'lesson-plans',
  });

  // ─── System ───────────────────────────────────────────────────────────────
  registerTool({
    name: 'get_dashboard_today',
    description: 'Get today dashboard overview including sessions, counts, and quick KPIs',
    descriptionAr: 'عرض لوحة معلومات اليوم وإحصاءات المنصة السريعة',
    inputSchema: {},
    outputSchema: { date: 'string', sessions: 'number', studentCount: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'dashboard',
  });

  registerTool({
    name: 'get_academic_year_info',
    description: 'Get active academic year details',
    descriptionAr: 'عرض معلومات العام الدراسي الحالي النشط',
    inputSchema: {},
    outputSchema: { id: 'string', name: 'string' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'dashboard',
  });

  registerTool({
    name: 'get_app_info',
    description: 'Get safe non-secret application status and version',
    descriptionAr: 'عرض معلومات النظام وحالته العامة بأمان',
    inputSchema: {},
    outputSchema: { name: 'string', version: 'string' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'dashboard',
  });

  registerTool({
    name: 'list_grade_levels',
    description: 'List authoritative supported grade levels (Prep 1 to Sec 3) with stable codes and Arabic names',
    descriptionAr: 'عرض الصفوف والمراحل الدراسية المعتمدة في النظام برموزها وأسمائها العربية',
    inputSchema: { stage: 'string?' },
    outputSchema: { type: 'array', items: { code: 'string', nameAr: 'string', stage: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'system',
  });

  registerTool({
    name: 'list_education_systems',
    description: 'List supported education systems (General, Egyptian Baccalaureate)',
    descriptionAr: 'عرض الأنظمة التعليمية المدعومة في تِبيان',
    inputSchema: {},
    outputSchema: { type: 'array', items: { code: 'string', nameAr: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'system',
  });

  registerTool({
    name: 'list_language_tracks',
    description: 'List supported language study tracks (Arabic, English/Languages)',
    descriptionAr: 'عرض المسارات واللغات الدراسية المعتمدة',
    inputSchema: {},
    outputSchema: { type: 'array', items: { code: 'string', nameAr: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'system',
  });

  registerTool({
    name: 'list_math_branches',
    description: 'List supported mathematics branches (Algebra, Geometry, Calculus, Statistics, etc.)',
    descriptionAr: 'عرض فروع مادة الرياضيات المعتمدة في تِبيان',
    inputSchema: {},
    outputSchema: { type: 'array', items: { code: 'string', nameAr: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'system',
  });

  registerTool({
    name: 'list_academic_years',
    description: 'List all academic years registered in the system',
    descriptionAr: 'عرض جميع الأعوام الدراسية المسجلة في النظام',
    inputSchema: {},
    outputSchema: { type: 'array', items: { id: 'string', name: 'string', status: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'system',
  });

  registerTool({
    name: 'get_application_settings',
    description: 'Get safe non-sensitive application settings (theme, backup interval, active year)',
    descriptionAr: 'عرض إعدادات التطبيق العامة والآمنة',
    inputSchema: {},
    outputSchema: { theme: 'string', activeYear: 'string' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'system',
  });

  registerTool({
    name: 'list_exam_variants',
    description: 'List generated variants (models A, B, C, D) and answer keys for an exam',
    descriptionAr: 'عرض نماذج الاختبار المتعددة (أ، ب، ج، د) ومفاتيح الإجابة',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', variants: 'array' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['REPORTS_READ'],
    category: 'exams',
  });
}
