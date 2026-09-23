import { z } from 'zod';

/** Accepted only by the Main-process credential boundary; never persisted or returned to the renderer. */
export const GeminiCredentialInputSchema = z.object({
  apiKey: z.string().trim().min(1).max(1024),
  ownerPassword: z.string().min(1).max(1024),
}).strict();
export type GeminiCredentialInput = z.infer<typeof GeminiCredentialInputSchema>;
export const GeminiCredentialDeleteInputSchema = z.object({ ownerPassword: z.string().min(1).max(1024) }).strict();
export type GeminiCredentialDeleteInput = z.infer<typeof GeminiCredentialDeleteInputSchema>;

/** Deliberately opaque: the renderer learns availability, never credential material. */
export const GeminiConfigurationStatusSchema = z.object({
  configured: z.boolean(),
  maskedKey: z.string().nullable(),
}).strict();
export type GeminiConfigurationStatus = z.infer<typeof GeminiConfigurationStatusSchema>;
export const GeminiConnectionResultSchema = z.object({ message: z.string().min(1) }).strict();
export type GeminiConnectionResult = z.infer<typeof GeminiConnectionResultSchema>;
