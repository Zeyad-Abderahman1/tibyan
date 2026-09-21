import { z } from 'zod';

/** Accepted only by the Main-process credential boundary; never persisted or returned to the renderer. */
export const GeminiCredentialInputSchema = z.object({
  apiKey: z.string().trim().min(1).max(1024),
});
export type GeminiCredentialInput = z.infer<typeof GeminiCredentialInputSchema>;

/** Deliberately opaque: the renderer learns availability, never credential material. */
export const GeminiConfigurationStatusSchema = z.object({
  configured: z.boolean(),
}).strict();
export type GeminiConfigurationStatus = z.infer<typeof GeminiConfigurationStatusSchema>;
