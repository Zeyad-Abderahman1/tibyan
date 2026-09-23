import { z } from 'zod';

// ─── Assistant Session & Messages ───────────────────────────────────────────

export const AssistantMessageRoleSchema = z.enum(['user', 'assistant', 'tool-result']);
export type AssistantMessageRole = z.infer<typeof AssistantMessageRoleSchema>;

export const AssistantMessageTypeSchema = z.enum(['text', 'tool-call', 'tool-result', 'preview', 'confirmation', 'execution-receipt', 'undo-result', 'error']);
export type AssistantMessageType = z.infer<typeof AssistantMessageTypeSchema>;

export const AssistantAttachmentSchema = z.object({
  attachmentId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  purpose: z.string().optional(),
});
export type AssistantAttachmentDto = z.infer<typeof AssistantAttachmentSchema>;

export const UploadAssistantAttachmentInputSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileContentBase64: z.string().min(1),
  mimeType: z.string().optional(),
});
export type UploadAssistantAttachmentInput = z.infer<typeof UploadAssistantAttachmentInputSchema>;

export const AssistantMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: AssistantMessageRoleSchema,
  type: AssistantMessageTypeSchema,
  content: z.string(),
  success: z.boolean().optional(),
  attachments: z.array(AssistantAttachmentSchema).optional(),
  toolCallId: z.string().uuid().optional(),
  toolName: z.string().optional(),
  toolInput: z.unknown().optional(),
  toolOutput: z.unknown().optional(),
  confirmationToken: z.string().optional(),
  previewId: z.string().uuid().optional(),
  receiptId: z.string().uuid().optional(),
  undoAvailable: z.boolean().optional(),
  undoToken: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

export const AssistantSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string().optional(),
  contextScope: z.string().optional(),
  contextEntityId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AssistantSession = z.infer<typeof AssistantSessionSchema>;

// ─── Tool Call Proposal (Gemini → Core) ─────────────────────────────────────

export const ToolCallProposalSchema = z.object({
  toolName: z.string().min(1).max(128),
  toolInput: z.record(z.unknown()),
  reasoning: z.string().optional(),
});
export type ToolCallProposal = z.infer<typeof ToolCallProposalSchema>;

export const AssistantStructuredResponseSchema = z.object({
  type: z.enum(['reply', 'tool-call', 'multi-tool-call']),
  reply: z.string().optional(),
  toolCalls: z.array(ToolCallProposalSchema).optional(),
  reasoning: z.string().optional(),
});
export type AssistantStructuredResponse = z.infer<typeof AssistantStructuredResponseSchema>;

// ─── Tool Result (Core → Gemini or UI) ──────────────────────────────────────

export const ToolResultSchema = z.object({
  toolName: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  needsConfirmation: z.boolean().optional(),
  previewId: z.string().uuid().optional(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

// ─── Preview ────────────────────────────────────────────────────────────────

export const PreviewChangeKindSchema = z.enum(['create', 'update', 'delete', 'bulk-update', 'reassign']);
export type PreviewChangeKind = z.infer<typeof PreviewChangeKindSchema>;

export const PreviewFieldChangeSchema = z.object({
  field: z.string(),
  label: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});
export type PreviewFieldChange = z.infer<typeof PreviewFieldChangeSchema>;

export const PreviewItemSchema = z.object({
  entityLabel: z.string(),
  entityId: z.string().optional(),
  changeKind: PreviewChangeKindSchema,
  changes: z.array(PreviewFieldChangeSchema),
  irreversible: z.boolean().optional(),
});
export type PreviewItem = z.infer<typeof PreviewItemSchema>;

export const PreviewSchema = z.object({
  id: z.string().uuid(),
  toolName: z.string(),
  toolInput: z.record(z.unknown()),
  summary: z.string(),
  items: z.array(PreviewItemSchema),
  requiresConfirmation: z.boolean(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type Preview = z.infer<typeof PreviewSchema>;

// ─── Confirmation ───────────────────────────────────────────────────────────

export const ConfirmationRequestSchema = z.object({
  previewId: z.string().uuid(),
  toolName: z.string(),
  summary: z.string(),
  irreversible: z.boolean(),
  expiresAt: z.string().datetime(),
});
export type ConfirmationRequest = z.infer<typeof ConfirmationRequestSchema>;

export const ConfirmationInputSchema = z.object({
  previewId: z.string().uuid(),
  confirmed: z.boolean(),
  sessionId: z.string().uuid().optional(),
});
export type ConfirmationInput = z.infer<typeof ConfirmationInputSchema>;

// ─── Execution Receipt ──────────────────────────────────────────────────────

export const ExecutionReceiptSchema = z.object({
  id: z.string().uuid(),
  toolName: z.string(),
  toolInput: z.record(z.unknown()),
  previewId: z.string().uuid(),
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  undoAvailable: z.boolean(),
  undoToken: z.string().optional(),
  executedAt: z.string().datetime(),
});
export type ExecutionReceipt = z.infer<typeof ExecutionReceiptSchema>;

// ─── Undo ───────────────────────────────────────────────────────────────────

export const UndoInputSchema = z.object({
  receiptId: z.string().uuid(),
  undoToken: z.string(),
  sessionId: z.string().uuid().optional(),
});
export type UndoInput = z.infer<typeof UndoInputSchema>;

export const UndoResultSchema = z.object({
  success: z.boolean(),
  receiptId: z.string().uuid(),
  undoneAt: z.string().datetime(),
  error: z.string().optional(),
});
export type UndoResult = z.infer<typeof UndoResultSchema>;

// ─── Context ────────────────────────────────────────────────────────────────

export const AssistantContextScopeSchema = z.enum([
  'global',
  'student',
  'group',
  'exam',
  'analytics',
  'lesson',
  'capture',
  'PLATFORM_CONTROL',
  'EXAM',
  'SLIDES',
  'REVIEW',
  'NOTES',
]);
export type AssistantContextScope = z.infer<typeof AssistantContextScopeSchema>;

export const AssistantContextInputSchema = z.object({
  scope: AssistantContextScopeSchema.optional(),
  entityId: z.string().optional(),
});
export type AssistantContextInput = z.infer<typeof AssistantContextInputSchema>;

// ─── Conversation Input ─────────────────────────────────────────────────────

export const SendMessageInputSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(4096),
  attachments: z.array(AssistantAttachmentSchema).optional(),
  context: AssistantContextInputSchema.optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const CreateSessionInputSchema = z.object({
  title: z.string().optional(),
  context: AssistantContextInputSchema.optional(),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

// ─── Assistant Error ────────────────────────────────────────────────────────

export const AssistantErrorCodeSchema = z.enum([
  'GEMINI_UNAVAILABLE',
  'GEMINI_CREDENTIAL_MISSING',
  'GEMINI_TIMEOUT',
  'GEMINI_MALFORMED_RESPONSE',
  'TOOL_NOT_FOUND',
  'TOOL_INVALID_INPUT',
  'TOOL_EXECUTION_FAILED',
  'PERMISSION_DENIED',
  'LOOP_LIMIT_EXCEEDED',
  'CONFIRMATION_REQUIRED',
  'CONFIRMATION_STALE',
  'CONFIRMATION_EXPIRED',
  'CONFIRMATION_ALREADY_USED',
  'CONFIRMATION_NOT_FOUND',
  'UNDO_UNAVAILABLE',
  'UNDO_FAILED',
  'SESSION_NOT_FOUND',
  'CONTEXT_INVALID',
  'CANCELED',
  'RATE_LIMITED',
  'UNKNOWN',
]);
export type AssistantErrorCode = z.infer<typeof AssistantErrorCodeSchema>;

// ─── Assistant Response (IPC return) ────────────────────────────────────────

export const AssistantResponseSchema = z.object({
  success: z.boolean(),
  messages: z.array(AssistantMessageSchema).default([]),
  message: AssistantMessageSchema.optional(),
  preview: PreviewSchema.optional(),
  receipt: ExecutionReceiptSchema.optional(),
  undoResult: UndoResultSchema.optional(),
  error: z.object({
    code: AssistantErrorCodeSchema,
    message: z.string(),
  }).optional(),
});
export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;

// ─── Conversation History ───────────────────────────────────────────────────

export const ConversationHistorySchema = z.object({
  sessionId: z.string().uuid(),
  messages: z.array(AssistantMessageSchema),
  hasMore: z.boolean(),
});
export type ConversationHistory = z.infer<typeof ConversationHistorySchema>;
