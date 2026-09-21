import { sqliteTable, text, integer, uniqueIndex, index, check, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import {
  UserRole,
  PermissionCode,
  ActorType,
  EducationSystem,
  GradeLevel,
  LanguageTrack,
  MathBranch,
  CurriculumCatalogStatus,
  CurriculumNodeTier,
  SourceDocumentStatus,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
} from '@tibyan/contracts';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique(),
  pinHash: text('pin_hash').notNull(),
  salt: text('salt').notNull(),
  role: text('role').$type<UserRole>().notNull(),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).notNull().default('ACTIVE'),
  failedAttempts: integer('failed_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const permissions = sqliteTable('permissions', {
  code: text('code').$type<PermissionCode>().primaryKey(),
  nameAr: text('name_ar').notNull(),
  descriptionAr: text('description_ar').notNull(),
  category: text('category').notNull(),
});

export const userPermissions = sqliteTable('user_permissions', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionCode: text('permission_code').notNull().references(() => permissions.code, { onDelete: 'cascade' }),
  grantedAt: text('granted_at').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.permissionCode] }),
}));

export const academicYears = sqliteTable('academic_years', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // e.g. "2026-2027"
  dbFilename: text('db_filename').notNull().unique(), // e.g. "tibyan-2026-2027.sqlite"
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  // Database-level enforcement that only one academic year can be active at a time
  singleActiveYearIdx: uniqueIndex('idx_academic_years_single_active')
    .on(t.isActive)
    .where(sql`is_active = 1`),
}));

export const globalSettings = sqliteTable('global_settings', {
  key: text('key').primaryKey(),
  valueJson: text('value_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const systemAuditLog = sqliteTable('system_audit_log', {
  id: text('id').primaryKey(),
  actorType: text('actor_type').$type<ActorType>().notNull().default('USER'),
  actorUserId: text('actor_user_id'),
  actorNameSnapshot: text('actor_name_snapshot').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  metadataJson: text('metadata_json'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  actorInvariantCheck: check(
    'chk_system_audit_actor_invariant',
    sql`("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL)`
  ),
  idxSystemAuditCreated: uniqueIndex('idx_system_audit_created').on(t.createdAt, t.id),
}));

export const backupRecords = sqliteTable('backup_records', {
  id: text('id').primaryKey(),
  backupPath: text('backup_path').notNull(),
  backupDate: text('backup_date').notNull(),
  status: text('status', { enum: ['SUCCESS', 'FAILED'] }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  academicYearsIncludedJson: text('academic_years_included_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type PermissionRow = typeof permissions.$inferSelect;
export type UserPermissionRow = typeof userPermissions.$inferSelect;
export type AcademicYearRow = typeof academicYears.$inferSelect;
export type NewAcademicYearRow = typeof academicYears.$inferInsert;
export type GlobalSettingRow = typeof globalSettings.$inferSelect;
export type SystemAuditLogRow = typeof systemAuditLog.$inferSelect;
export type NewSystemAuditLogRow = typeof systemAuditLog.$inferInsert;
export type BackupRecordRow = typeof backupRecords.$inferSelect;
export type NewBackupRecordRow = typeof backupRecords.$inferInsert;

export const curriculumCatalogs = sqliteTable(
  'curriculum_catalogs',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    educationSystem: text('education_system').$type<EducationSystem>().notNull(),
    gradeLevel: text('grade_level').$type<GradeLevel>().notNull(),
    languageTrack: text('language_track').$type<LanguageTrack>().notNull(),
    mathBranch: text('math_branch').$type<MathBranch | null>(),
    version: integer('version').notNull().default(1),
    status: text('status', { enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
      .$type<CurriculumCatalogStatus>()
      .notNull()
      .default('DRAFT'),
    publishedAt: text('published_at'),
    description: text('description'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxCatalogScopeVersionBranch: uniqueIndex('idx_curriculum_catalog_scope_version_branch')
      .on(t.educationSystem, t.gradeLevel, t.languageTrack, t.mathBranch, t.version)
      .where(sql`math_branch IS NOT NULL`),
    idxCatalogScopeVersionNoBranch: uniqueIndex('idx_curriculum_catalog_scope_version_nobranch')
      .on(t.educationSystem, t.gradeLevel, t.languageTrack, t.version)
      .where(sql`math_branch IS NULL`),
    idxCatalogCodeVersion: uniqueIndex('idx_curriculum_catalog_code_version').on(t.code, t.version),
    idxCatalogStatus: index('idx_curriculum_catalog_status').on(t.status),
  })
);

export const curriculumNodes = sqliteTable(
  'curriculum_nodes',
  {
    id: text('id').primaryKey(),
    catalogId: text('catalog_id')
      .notNull()
      .references(() => curriculumCatalogs.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    tier: text('tier', { enum: ['UNIT', 'LESSON', 'CONCEPT', 'SKILL'] })
      .$type<CurriculumNodeTier>()
      .notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en'),
    code: text('code').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    description: text('description'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxNodeCatalogParent: index('idx_curriculum_node_catalog_parent').on(t.catalogId, t.parentId),
    idxNodeCatalogOrder: index('idx_curriculum_node_catalog_order').on(t.catalogId, t.orderIndex),
    idxNodeCatalogTier: index('idx_curriculum_node_catalog_tier').on(t.catalogId, t.tier),
  })
);

export type CurriculumCatalogRow = typeof curriculumCatalogs.$inferSelect;
export type NewCurriculumCatalogRow = typeof curriculumCatalogs.$inferInsert;
export type CurriculumNodeRow = typeof curriculumNodes.$inferSelect;
export type NewCurriculumNodeRow = typeof curriculumNodes.$inferInsert;

// Phase 3 — Task 4: Source Documents & Page References
export const sourceDocuments = sqliteTable(
  'source_documents',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    author: text('author'),
    publisher: text('publisher'),
    editionYear: text('edition_year'),
    curriculumCatalogId: text('curriculum_catalog_id').references(() => curriculumCatalogs.id, {
      onDelete: 'set null',
    }),
    filePath: text('file_path').notNull(),
    fileName: text('file_name').notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),
    sha256Hash: text('sha256_hash').notNull(),
    pageCount: integer('page_count').notNull(),
    status: text('status', { enum: ['INDEXED', 'PROCESSING', 'ERROR'] })
      .$type<SourceDocumentStatus>()
      .notNull()
      .default('INDEXED'),
    metadataJson: text('metadata_json'),
    gradeLevel: text('grade_level'),
    educationSystem: text('education_system'),
    subject: text('subject'),
    description: text('description'),
    academicYearId: text('academic_year_id'),
    importSource: text('import_source').notNull().default('MANUAL'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxSourceDocumentHash: uniqueIndex('idx_source_document_hash').on(t.sha256Hash),
    idxSourceDocumentCatalog: index('idx_source_document_catalog').on(t.curriculumCatalogId),
    idxSourceDocumentGrade: index('idx_source_document_grade').on(t.gradeLevel),
    idxSourceDocumentSubject: index('idx_source_document_subject').on(t.subject),
  })
);

export const sourceReferences = sqliteTable(
  'source_references',
  {
    id: text('id').primaryKey(),
    sourceDocumentId: text('source_document_id')
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: 'cascade' }),
    startPage: integer('start_page').notNull(),
    endPage: integer('end_page').notNull(),
    referenceLabel: text('reference_label').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxSourceRefDocument: index('idx_source_ref_document').on(t.sourceDocumentId),
    idxSourceRefPages: index('idx_source_ref_pages').on(t.sourceDocumentId, t.startPage, t.endPage),
  })
);

// Phase 3 — Task 5 & 6: Question Bank, Skill Tagging & Multi-Source Linking
export const questions = sqliteTable(
  'questions',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    bodyJson: text('body_json').notNull(),
    modelAnswerJson: text('model_answer_json'),
    questionType: text('question_type', {
      enum: ['MULTIPLE_CHOICE', 'ESSAY', 'SHORT_ANSWER', 'TRUE_FALSE'],
    })
      .$type<QuestionType>()
      .notNull()
      .default('MULTIPLE_CHOICE'),
    difficulty: text('difficulty', {
      enum: ['EASY', 'MEDIUM', 'HARD', 'ADVANCED'],
    })
      .$type<QuestionDifficulty>()
      .notNull()
      .default('MEDIUM'),
    defaultMarks: integer('default_marks').notNull().default(1),
    languageTrack: text('language_track').$type<LanguageTrack>().notNull().default('ARABIC'),
    status: text('status', { enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] })
      .$type<QuestionStatus>()
      .notNull()
      .default('ACTIVE'),
    contentFingerprint: text('content_fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    idxQuestionCode: uniqueIndex('idx_question_code').on(t.code),
    idxQuestionFingerprint: index('idx_question_fingerprint').on(t.contentFingerprint),
    idxQuestionTypeDiff: index('idx_question_type_diff').on(t.questionType, t.difficulty),
    idxQuestionStatus: index('idx_question_status').on(t.status),
  })
);

export const questionCurriculumTags = sqliteTable(
  'question_curriculum_tags',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    curriculumNodeId: text('curriculum_node_id')
      .notNull()
      .references(() => curriculumNodes.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    idxQuestionNodeUnique: uniqueIndex('idx_question_node_unique').on(t.questionId, t.curriculumNodeId),
    idxQuestionTagNode: index('idx_question_tag_node').on(t.curriculumNodeId),
  })
);

export const questionSourceReferences = sqliteTable(
  'question_source_references',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    sourceReferenceId: text('source_reference_id')
      .notNull()
      .references(() => sourceReferences.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    idxQuestionSourceUnique: uniqueIndex('idx_question_source_unique').on(t.questionId, t.sourceReferenceId),
    idxQuestionSourceRef: index('idx_question_source_ref').on(t.sourceReferenceId),
  })
);

export type SourceDocumentRow = typeof sourceDocuments.$inferSelect;
export type NewSourceDocumentRow = typeof sourceDocuments.$inferInsert;
export type SourceReferenceRow = typeof sourceReferences.$inferSelect;
export type NewSourceReferenceRow = typeof sourceReferences.$inferInsert;
export type QuestionRow = typeof questions.$inferSelect;
export type NewQuestionRow = typeof questions.$inferInsert;
export type QuestionCurriculumTagRow = typeof questionCurriculumTags.$inferSelect;
export type NewQuestionCurriculumTagRow = typeof questionCurriculumTags.$inferInsert;
export type QuestionSourceReferenceRow = typeof questionSourceReferences.$inferSelect;
export type NewQuestionSourceReferenceRow = typeof questionSourceReferences.$inferInsert;

// ─── Phase 6: Assistant Tables ──────────────────────────────────────────────

export const assistantSessions = sqliteTable('assistant_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  contextScope: text('context_scope'),
  contextEntityId: text('context_entity_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  idxAssistantSessionUser: index('idx_assistant_session_user').on(t.userId),
  idxAssistantSessionUpdated: index('idx_assistant_session_updated').on(t.updatedAt),
}));

export const assistantMessages = sqliteTable('assistant_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => assistantSessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'tool-result'] }).notNull(),
  type: text('type', { enum: ['text', 'tool-call', 'tool-result', 'preview', 'confirmation', 'execution-receipt', 'undo-result', 'error'] }).notNull(),
  content: text('content').notNull(),
  toolCallId: text('tool_call_id'),
  toolName: text('tool_name'),
  toolInputJson: text('tool_input_json'),
  toolOutputJson: text('tool_output_json'),
  confirmationToken: text('confirmation_token'),
  previewId: text('preview_id'),
  receiptId: text('receipt_id'),
  undoAvailable: integer('undo_available', { mode: 'boolean' }).default(false),
  undoToken: text('undo_token'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  idxAssistantMsgSession: index('idx_assistant_msg_session').on(t.sessionId, t.createdAt),
  idxAssistantMsgPreview: index('idx_assistant_msg_preview').on(t.previewId),
  idxAssistantMsgReceipt: index('idx_assistant_msg_receipt').on(t.receiptId),
}));

export const assistantAuditLog = sqliteTable('assistant_audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull().references(() => users.id),
  sessionId: text('session_id').notNull(),
  toolName: text('tool_name').notNull(),
  action: text('action').notNull(),
  inputSummaryJson: text('input_summary_json'),
  affectedEntitiesJson: text('affected_entities_json'),
  outcome: text('outcome', { enum: ['SUCCESS', 'FAILED', 'CANCELED', 'UNDO'] }).notNull(),
  receiptId: text('receipt_id'),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  idxAssistantAuditUser: index('idx_assistant_audit_user').on(t.actorUserId),
  idxAssistantAuditSession: index('idx_assistant_audit_session').on(t.sessionId),
  idxAssistantAuditTool: index('idx_assistant_audit_tool').on(t.toolName),
  idxAssistantAuditCreated: index('idx_assistant_audit_created').on(t.createdAt),
}));

export const assistantConfirmations = sqliteTable('assistant_confirmations', {
  id: text('id').primaryKey(),
  previewId: text('preview_id').notNull(),
  toolName: text('tool_name').notNull(),
  toolInputJson: text('tool_input_json').notNull(),
  summary: text('summary').notNull(),
  requiresConfirmation: integer('requires_confirmation', { mode: 'boolean' }).notNull().default(true),
  confirmed: integer('confirmed', { mode: 'boolean' }).notNull().default(false),
  executed: integer('executed', { mode: 'boolean' }).notNull().default(false),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (t) => ({
  idxAssistantConfirmPreview: uniqueIndex('idx_assistant_confirm_preview').on(t.previewId),
}));

export type AssistantSessionRow = typeof assistantSessions.$inferSelect;
export type NewAssistantSessionRow = typeof assistantSessions.$inferInsert;
export type AssistantMessageRow = typeof assistantMessages.$inferSelect;
export type NewAssistantMessageRow = typeof assistantMessages.$inferInsert;
export type AssistantAuditLogRow = typeof assistantAuditLog.$inferSelect;
export type NewAssistantAuditLogRow = typeof assistantAuditLog.$inferInsert;
export type AssistantConfirmationRow = typeof assistantConfirmations.$inferSelect;
export type NewAssistantConfirmationRow = typeof assistantConfirmations.$inferInsert;
