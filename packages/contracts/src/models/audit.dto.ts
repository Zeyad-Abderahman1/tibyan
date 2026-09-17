import { z } from 'zod';
import { ActorTypeSchema } from '../enums/auth.js';

export const CreateAuditEntrySchema = z
  .object({
    actorType: ActorTypeSchema,
    actorUserId: z.string().uuid('Invalid actor user ID').nullable(),
    actorNameSnapshot: z.string().trim().min(1, 'Actor name snapshot cannot be empty'),
    action: z.string().trim().min(1, 'Action cannot be empty'),
    entityType: z.string().trim().min(1, 'Entity type cannot be empty'),
    entityId: z.string().trim().min(1, 'Entity ID cannot be empty'),
    beforeJson: z.string().nullable().optional().default(null),
    afterJson: z.string().nullable().optional().default(null),
    metadataJson: z.string().nullable().optional().default(null),
  })
  .refine(
    (data) => {
      // USER events require a valid non-null user ID
      if (data.actorType === 'USER') {
        return typeof data.actorUserId === 'string' && data.actorUserId.length > 0;
      }
      // SYSTEM events allow null actorUserId
      return true;
    },
    {
      message: 'actorUserId is required when actorType is USER',
      path: ['actorUserId'],
    }
  );
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
