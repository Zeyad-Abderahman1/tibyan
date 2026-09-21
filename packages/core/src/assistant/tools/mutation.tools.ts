import { registerTool } from '../tool-registry.js';

export function registerMutationTools(): void {
  registerTool({
    name: 'create_lesson_plan',
    description: 'Create a new lesson plan',
    descriptionAr: 'إنشاء خطة درس جديدة',
    inputSchema: { title: 'string', nodeId: 'string', objectives: 'string[]?', content: 'string?' },
    outputSchema: { id: 'string', title: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['LESSON_PLAN_WRITE'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'update_lesson_plan',
    description: 'Update an existing lesson plan',
    descriptionAr: 'تحديث خطة درس موجودة',
    inputSchema: { planId: 'string', title: 'string?', objectives: 'string[]?', content: 'string?' },
    outputSchema: { id: 'string', title: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['LESSON_PLAN_WRITE'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'add_student_note',
    description: 'Add a note to a student record',
    descriptionAr: 'إضافة ملاحظة لسجل طالب',
    inputSchema: { studentId: 'string', content: 'string', tag: 'string?' },
    outputSchema: { id: 'string', studentId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['STUDENTS_WRITE'],
    category: 'students',
  });

  registerTool({
    name: 'record_attendance',
    description: 'Record attendance for a student in a session',
    descriptionAr: 'تسجيل حضور طالب في جلسة',
    inputSchema: { sessionId: 'string', studentId: 'string', status: 'PRESENT|ABSENT|LATE|EXCUSED' },
    outputSchema: { recordId: 'string', status: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['ATTENDANCE_WRITE'],
    category: 'attendance',
  });

  registerTool({
    name: 'create_session_reflection',
    description: 'Create a reflection for a completed session',
    descriptionAr: 'إنشاء تأمّل لجلسة مكتملة',
    inputSchema: { sessionId: 'string', content: 'string', rating: 'number?' },
    outputSchema: { id: 'string', sessionId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['LESSON_PLAN_WRITE'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'update_group_curriculum_progress',
    description: 'Update curriculum progress for a group',
    descriptionAr: 'تحديث تقدم المنهج لمجموعة',
    inputSchema: { groupId: 'string', nodeId: 'string', status: 'NOT_STARTED|IN_PROGRESS|COMPLETED|SKIPPED' },
    outputSchema: { groupId: 'string', nodeId: 'string', status: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['CURRICULUM_WRITE'],
    category: 'curriculum',
  });

  registerTool({
    name: 'archive_lesson_plan',
    description: 'Archive a lesson plan',
    descriptionAr: 'أرشفة خطة درس',
    inputSchema: { planId: 'string' },
    outputSchema: { id: 'string', status: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['LESSON_PLAN_WRITE'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'enroll_student',
    description: 'Enroll a student in a group',
    descriptionAr: 'تسجيل طالب في مجموعة',
    inputSchema: { groupId: 'string', studentId: 'string' },
    outputSchema: { enrollmentId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['ENROLLMENTS_WRITE'],
    category: 'groups',
  });

  registerTool({
    name: 'end_enrollment',
    description: 'End a student enrollment in a group',
    descriptionAr: 'إنهاء تسجيل طالب في مجموعة',
    inputSchema: { enrollmentId: 'string', reason: 'string?' },
    outputSchema: { enrollmentId: 'string', status: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['ENROLLMENTS_WRITE'],
    category: 'groups',
  });

  registerTool({
    name: 'update_student',
    description: 'Update student information',
    descriptionAr: 'تحديث معلومات طالب',
    inputSchema: { studentId: 'string', fullName: 'string?', phone: 'string?', parentPhone: 'string?' },
    outputSchema: { id: 'string', name: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['STUDENTS_WRITE'],
    category: 'students',
  });
}
