import { registerTool } from '../tool-registry.js';

export function registerReadOnlyTools(): void {
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
    name: 'get_group_enrollments',
    description: 'List enrolled students in a group',
    descriptionAr: 'عرض الطلاب المسجلين في مجموعة',
    inputSchema: { groupId: 'string' },
    outputSchema: { type: 'array', items: { studentId: 'string', studentName: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_READ', 'ENROLLMENTS_READ'],
    category: 'groups',
  });

  registerTool({
    name: 'get_session_attendance',
    description: 'Get attendance records for a session',
    descriptionAr: 'عرض سجلات الحضور لجلسة معينة',
    inputSchema: { sessionId: 'string' },
    outputSchema: { type: 'array', items: { studentId: 'string', studentName: 'string', status: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['ATTENDANCE_READ'],
    category: 'attendance',
  });

  registerTool({
    name: 'list_exams',
    description: 'List exams with optional filters',
    descriptionAr: 'عرض الامتحانات مع مرشحات اختيارية',
    inputSchema: { limit: 'number?' },
    outputSchema: { type: 'array', items: { id: 'string', title: 'string', date: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['EXAMS_READ'],
    category: 'exams',
  });

  registerTool({
    name: 'get_exam_analytics',
    description: 'Get analytics summary for an exam',
    descriptionAr: 'عرض ملخص التحليلات لامتحان معين',
    inputSchema: { examId: 'string' },
    outputSchema: { examId: 'string', totalSubmissions: 'number', averageScore: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['ANALYTICS_READ'],
    category: 'analytics',
  });

  registerTool({
    name: 'get_question_bank_stats',
    description: 'Get question bank statistics',
    descriptionAr: 'عرض إحصائيات بنك الأسئلة',
    inputSchema: {},
    outputSchema: { totalQuestions: 'number', byType: 'record' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['QUESTIONS_READ'],
    category: 'questions',
  });

  registerTool({
    name: 'list_lesson_plans',
    description: 'List lesson plans',
    descriptionAr: 'عرض خطط الدروس',
    inputSchema: { limit: 'number?' },
    outputSchema: { type: 'array', items: { id: 'string', title: 'string', nodeId: 'string' } },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['LESSON_PLAN_READ'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'get_financial_summary',
    description: 'Get financial summary for a student',
    descriptionAr: 'عرض الملخص المالي لطالب',
    inputSchema: { studentId: 'string' },
    outputSchema: { studentId: 'string', totalPaid: 'number', totalDue: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['FINANCE_READ'],
    category: 'finance',
  });

  registerTool({
    name: 'get_dashboard_today',
    description: 'Get today\'s dashboard overview',
    descriptionAr: 'عرض لوحة معلومات اليوم',
    inputSchema: {},
    outputSchema: { date: 'string', sessions: 'number' },
    riskLevel: 'read-only',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: [],
    category: 'dashboard',
  });

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
}
