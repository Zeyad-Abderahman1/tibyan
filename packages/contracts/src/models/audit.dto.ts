import { z } from 'zod';
import { ActorTypeSchema } from '../enums/auth.js';

const BaseAuditEntrySchema = z.object({
  actorNameSnapshot: z.string().trim().min(1, 'Actor name snapshot cannot be empty'),
  action: z.string().trim().min(1, 'Action cannot be empty'),
  entityType: z.string().trim().min(1, 'Entity type cannot be empty'),
  entityId: z.string().trim().min(1, 'Entity ID cannot be empty'),
  beforeJson: z.string().nullable().optional().default(null),
  afterJson: z.string().nullable().optional().default(null),
  metadataJson: z.string().nullable().optional().default(null),
});

export const UserAuditEntrySchema = BaseAuditEntrySchema.extend({
  actorType: z.literal('USER'),
  actorUserId: z.string().uuid('Invalid actor user ID for USER actor'),
});
export type UserAuditEntryInput = z.infer<typeof UserAuditEntrySchema>;

export const SystemAuditEntrySchema = BaseAuditEntrySchema.extend({
  actorType: z.literal('SYSTEM'),
  actorUserId: z.literal(null).default(null),
});
export type SystemAuditEntryInput = z.infer<typeof SystemAuditEntrySchema>;

/**
 * Discriminated union schema enforcing strict audit actor invariants:
 * - When actorType is 'USER', actorUserId must be a valid non-null UUID.
 * - When actorType is 'SYSTEM', actorUserId must be strictly null.
 */
export const CreateAuditEntrySchema = z.discriminatedUnion('actorType', [
  UserAuditEntrySchema,
  SystemAuditEntrySchema,
]);
export type CreateAuditEntryInput = z.infer<typeof CreateAuditEntrySchema>;

export const AuditQueryFilterSchema = z.object({
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  actorUserId: z.string().uuid().optional(),
  actorType: ActorTypeSchema.optional(),
  limit: z.number().int().positive().max(500).default(50),
  offset: z.number().int().nonnegative().default(0),
});
export type AuditQueryFilterInput = z.infer<typeof AuditQueryFilterSchema>;

export interface AuditEntryDto {
  id: string;
  actorType: z.infer<typeof ActorTypeSchema>;
  actorUserId: string | null;
  actorNameSnapshot: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
  metadataJson: string | null;
  createdAt: string;
}
