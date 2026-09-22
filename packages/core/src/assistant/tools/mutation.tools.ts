import { registerTool } from '../tool-registry.js';

export function registerMutationTools(): void {
  // ─── Students ─────────────────────────────────────────────────────────────
  registerTool({
    name: 'create_student',
    description: 'Create a new student record',
    descriptionAr: 'إنشاء ملف طالب جديد',
    inputSchema: { fullName: 'string', phone: 'string?', parentPhone: 'string?', notes: 'string?' },
    outputSchema: { id: 'string', name: 'string', code: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['STUDENTS_WRITE'],
    category: 'students',
  });

  registerTool({
    name: 'update_student',
    description: 'Update student information',
    descriptionAr: 'تحديث بيانات طالب',
    inputSchema: { studentId: 'string', fullName: 'string?', phone: 'string?', parentPhone: 'string?' },
    outputSchema: { id: 'string', name: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['STUDENTS_WRITE'],
    category: 'students',
  });

  registerTool({
    name: 'add_student_note',
    description: 'Add a note to a student record',
    descriptionAr: 'إضافة ملاحظة لسجل طالب',
    inputSchema: { studentId: 'string', content: 'string', tag: 'string?' },
    outputSchema: { id: 'string', studentId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'none',
    undoCapability: 'snapshot',
    requiredPermissions: ['STUDENTS_WRITE'],
    category: 'students',
  });

  // ─── Groups ───────────────────────────────────────────────────────────────
  registerTool({
    name: 'create_group',
    description: 'Create a new student study group',
    descriptionAr: 'إنشاء مجموعة دراسية جديدة',
    inputSchema: { name: 'string', subject: 'string?', gradeLevel: 'string?', maxCapacity: 'number?' },
    outputSchema: { id: 'string', name: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'groups',
  });

  registerTool({
    name: 'update_group',
    description: 'Update group details and settings',
    descriptionAr: 'تحديث بيانات وسعة المجموعة',
    inputSchema: { groupId: 'string', name: 'string?', maxCapacity: 'number?' },
    outputSchema: { id: 'string', name: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'groups',
  });

  registerTool({
    name: 'set_group_schedule',
    description: 'Set weekly schedule slots for a group',
    descriptionAr: 'تحديد وضبط مواعيد الحصص الأسبوعية للمجموعة',
    inputSchema: { groupId: 'string', scheduleSlots: 'array' },
    outputSchema: { groupId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'groups',
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
    requiredPermissions: ['GROUPS_WRITE'],
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
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'groups',
  });

  // ─── Sessions ─────────────────────────────────────────────────────────────
  registerTool({
    name: 'reschedule_session',
    description: 'Reschedule an existing teaching session to a new date/time',
    descriptionAr: 'إعادة جدولة موعد حصة دراسية',
    inputSchema: { sessionId: 'string', newDate: 'string', newStartTime: 'string?', newEndTime: 'string?' },
    outputSchema: { sessionId: 'string', date: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['SESSIONS_MANAGE'],
    category: 'sessions',
  });

  registerTool({
    name: 'cancel_session',
    description: 'Cancel a scheduled session',
    descriptionAr: 'إلغاء حصة دراسية مع توضيح السبب',
    inputSchema: { sessionId: 'string', reason: 'string?' },
    outputSchema: { sessionId: 'string', status: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['SESSIONS_MANAGE'],
    category: 'sessions',
  });

  registerTool({
    name: 'complete_session',
    description: 'Mark a teaching session as completed',
    descriptionAr: 'إتمام وإنهاء حصة دراسية',
    inputSchema: { sessionId: 'string' },
    outputSchema: { sessionId: 'string', status: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['SESSIONS_MANAGE'],
    category: 'sessions',
  });

  // ─── Attendance ───────────────────────────────────────────────────────────
  registerTool({
    name: 'record_attendance',
    description: 'Record attendance for a student in a session',
    descriptionAr: 'تسجيل حضور أو غياب طالب في حصة',
    inputSchema: { sessionId: 'string', studentId: 'string', status: 'PRESENT|ABSENT|LATE|EXCUSED' },
    outputSchema: { recordId: 'string', status: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['ATTENDANCE_WRITE'],
    category: 'attendance',
  });

  registerTool({
    name: 'batch_record_attendance',
    description: 'Record attendance for multiple students simultaneously',
    descriptionAr: 'تسجيل الحضور الجماعي لعدة طلاب في حصة',
    inputSchema: { sessionId: 'string', records: 'array' },
    outputSchema: { recordedCount: 'number' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['ATTENDANCE_WRITE'],
    category: 'attendance',
  });

  registerTool({
    name: 'update_follow_up_status',
    description: 'Update the follow-up contact status for an absent student',
    descriptionAr: 'تحديث حالة متابعة وتواصل الطالب الغائب',
    inputSchema: { recordId: 'string', status: 'string', note: 'string?' },
    outputSchema: { recordId: 'string', status: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['ATTENDANCE_WRITE'],
    category: 'attendance',
  });

  // ─── Curriculum ───────────────────────────────────────────────────────────
  registerTool({
    name: 'assign_group_curriculum',
    description: 'Assign a curriculum catalog to a group',
    descriptionAr: 'تعيين منهج دراسي لمجموعة',
    inputSchema: { groupId: 'string', catalogId: 'string' },
    outputSchema: { groupId: 'string', catalogId: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'curriculum',
  });

  registerTool({
    name: 'update_group_curriculum_progress',
    description: 'Update curriculum progress status for a group node',
    descriptionAr: 'تحديث تقدم المنهج لمجموعة في درس معين',
    inputSchema: { groupId: 'string', nodeId: 'string', status: 'NOT_STARTED|IN_PROGRESS|COMPLETED|SKIPPED' },
    outputSchema: { groupId: 'string', nodeId: 'string', status: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'curriculum',
  });

  // ─── Lesson Planning ──────────────────────────────────────────────────────
  registerTool({
    name: 'create_lesson_plan',
    description: 'Create a new lesson plan',
    descriptionAr: 'إنشاء خطة درس جديدة',
    inputSchema: { title: 'string', nodeId: 'string', objectives: 'string[]?', content: 'string?' },
    outputSchema: { id: 'string', title: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'update_lesson_plan',
    description: 'Update an existing lesson plan',
    descriptionAr: 'تحديث خطة درس موجودة',
    inputSchema: { planId: 'string', title: 'string?', objectives: 'string[]?', content: 'string?' },
    outputSchema: { id: 'string', title: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'archive_lesson_plan',
    description: 'Archive a lesson plan',
    descriptionAr: 'أرشفة خطة درس',
    inputSchema: { planId: 'string' },
    outputSchema: { id: 'string', status: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'lesson-plans',
  });

  registerTool({
    name: 'create_session_reflection',
    description: 'Create a reflection for a completed session',
    descriptionAr: 'إنشاء تأمّل وملاحظات بعد انتهاء الحصة',
    inputSchema: { sessionId: 'string', content: 'string', rating: 'number?' },
    outputSchema: { id: 'string', sessionId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'none',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'lesson-plans',
  });

  // ─── Slides ───────────────────────────────────────────────────────────────
  registerTool({
    name: 'create_slide_deck',
    description: 'Create a new teaching slide deck',
    descriptionAr: 'إنشاء عرض شرائح جديد',
    inputSchema: { title: 'string', description: 'string?', curriculumNodeId: 'string?' },
    outputSchema: { id: 'string', title: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'update_slide_deck',
    description: 'Update title or metadata of a slide deck',
    descriptionAr: 'تحديث عنوان أو وصف عرض الشرائح',
    inputSchema: { deckId: 'string', title: 'string?', description: 'string?' },
    outputSchema: { id: 'string', title: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'add_slide_to_deck',
    description: 'Add a new slide to an existing deck',
    descriptionAr: 'إضافة شريحة جديدة لعرض الشرح',
    inputSchema: { deckId: 'string', title: 'string?' },
    outputSchema: { id: 'string', deckId: 'string', position: 'number' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'update_slide',
    description: 'Update slide title or properties',
    descriptionAr: 'تحديث بيانات الشريحة',
    inputSchema: { slideId: 'string', title: 'string?' },
    outputSchema: { id: 'string', title: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'delete_slide',
    description: 'Delete a slide from a deck',
    descriptionAr: 'حذف شريحة من العرض',
    inputSchema: { slideId: 'string' },
    outputSchema: { id: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'duplicate_slide',
    description: 'Duplicate a slide with its content blocks',
    descriptionAr: 'تكرار شريحة بمحتوياتها',
    inputSchema: { slideId: 'string' },
    outputSchema: { id: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'reorder_slides',
    description: 'Reorder slides within a deck',
    descriptionAr: 'إعادة ترتيب شرائح العرض',
    inputSchema: { deckId: 'string', slideIds: 'array' },
    outputSchema: { deckId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'add_block_to_slide',
    description: 'Add a content block (text, math, image, question) to a slide',
    descriptionAr: 'إضافة كتلة محتوى إلى شريحة',
    inputSchema: { slideId: 'string', blockType: 'string', contentJson: 'string' },
    outputSchema: { id: 'string', slideId: 'string', blockType: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'update_slide_block',
    description: 'Update content of a slide block',
    descriptionAr: 'تعديل محتوى كتلة في الشريحة',
    inputSchema: { blockId: 'string', contentJson: 'string' },
    outputSchema: { id: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'delete_slide_block',
    description: 'Delete a content block from a slide',
    descriptionAr: 'حذف كتلة محتوى من الشريحة',
    inputSchema: { blockId: 'string' },
    outputSchema: { id: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'reorder_slide_blocks',
    description: 'Reorder content blocks within a slide',
    descriptionAr: 'إعادة ترتيب كتل المحتوى في الشريحة',
    inputSchema: { slideId: 'string', blockIds: 'array' },
    outputSchema: { slideId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  registerTool({
    name: 'move_slide_block',
    description: 'Move a content block to another slide',
    descriptionAr: 'نقل كتلة محتوى إلى شريحة أخرى',
    inputSchema: { blockId: 'string', targetSlideId: 'string', targetIndex: 'number' },
    outputSchema: { blockId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'slides',
  });

  // ─── Finance ──────────────────────────────────────────────────────────────
  registerTool({
    name: 'record_payment',
    description: 'Record a fee payment receipt for a student',
    descriptionAr: 'تسجيل دفعة مالية وإصدار إيصال قبض',
    inputSchema: { studentId: 'string', amount: 'number', paymentMethod: 'string?', notes: 'string?' },
    outputSchema: { id: 'string', studentId: 'string', amount: 'number' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_WRITE'],
    category: 'finance',
  });

  registerTool({
    name: 'create_invoice',
    description: 'Create an invoice for a student',
    descriptionAr: 'إصدار فاتورة مطالبة مالية لطالب',
    inputSchema: { studentId: 'string', amount: 'number', dueDate: 'string?', description: 'string?' },
    outputSchema: { id: 'string', invoiceNumber: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_WRITE'],
    category: 'finance',
  });

  registerTool({
    name: 'apply_discount',
    description: 'Apply an exemption or fee discount for a student',
    descriptionAr: 'تطبيق خصم أو إعفاء مالي لطالب',
    inputSchema: { studentId: 'string', percentage: 'number', reason: 'string' },
    outputSchema: { id: 'string', studentId: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['PAYMENTS_WRITE'],
    category: 'finance',
  });

  // ─── Capture & Grading ────────────────────────────────────────────────────
  registerTool({
    name: 'create_capture_session',
    description: 'Create a new exam scan/capture session',
    descriptionAr: 'بدء جلسة مسح أوراق إجابة جديدة لاختبار',
    inputSchema: { examId: 'string', name: 'string?' },
    outputSchema: { id: 'string', examId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'capture',
  });

  registerTool({
    name: 'associate_submission',
    description: 'Associate a scanned submission with a specific student',
    descriptionAr: 'ربط ورقة إجابة ممسوحة بطالب محدد',
    inputSchema: { submissionId: 'string', studentId: 'string' },
    outputSchema: { submissionId: 'string', studentId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'capture',
  });

  registerTool({
    name: 'review_extracted_answer',
    description: 'Review and confirm an extracted student answer from scanned paper',
    descriptionAr: 'مراجعة وتعديل إجابة مستخرجة من ورقة الطالب',
    inputSchema: { answerId: 'string', correctedText: 'string' },
    outputSchema: { answerId: 'string' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'optional',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'grading',
  });

  registerTool({
    name: 'override_grading_decision',
    description: 'Manually override the awarded score or grading decision on an answer',
    descriptionAr: 'تعديل الدرجة الممنوحة يدوياً لسؤال معين',
    inputSchema: { submissionId: 'string', questionId: 'string', score: 'number', feedback: 'string?' },
    outputSchema: { decisionId: 'string', score: 'number' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'grading',
  });

  registerTool({
    name: 'finalize_grading',
    description: 'Finalize grading for an exam submission and commit final results',
    descriptionAr: 'اعتماد الدرجات النهائية لورقة الإجابة وقفله',
    inputSchema: { submissionId: 'string' },
    outputSchema: { submissionId: 'string', finalizedAt: 'string' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'none',
    requiredPermissions: ['GROUPS_WRITE'],
    category: 'grading',
  });

  registerTool({
    name: 'preview_student_import',
    description: 'Parse student file data and preview rows before importing',
    descriptionAr: 'معاينة وفحص بيانات ملف الطلاب قبل الاستيراد',
    inputSchema: { attachmentId: 'string?', fileContentBase64: 'string?', fileName: 'string?', rawText: 'string?' },
    outputSchema: { previewId: 'string', totalRows: 'number', validCount: 'number', duplicateCount: 'number', invalidCount: 'number' },
    riskLevel: 'low-risk',
    confirmationPolicy: 'none',
    undoCapability: 'none',
    requiredPermissions: ['STUDENTS_READ'],
    category: 'students',
  });

  registerTool({
    name: 'execute_student_import',
    description: 'Execute bulk creation of validated student records from preview',
    descriptionAr: 'تنفيذ استيراد وإضافة مجموعة من الطلاب دفعة واحدة بعد المعاينة',
    inputSchema: { previewId: 'string?', rows: 'array?', approvedRows: 'array?' },
    outputSchema: { importedCount: 'number', skippedCount: 'number', failedCount: 'number' },
    riskLevel: 'sensitive',
    confirmationPolicy: 'required',
    undoCapability: 'snapshot',
    requiredPermissions: ['STUDENTS_WRITE'],
    category: 'students',
  });
}
