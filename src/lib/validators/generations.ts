import { z } from "zod";

export const MIN_PROMPT_LENGTH = 1000;
export const MAX_PROMPT_LENGTH = 10000;
const MIN_PAGE = 1;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

export const createGenerationSchema = z.object({
  prompt_text: z
    .string()
    .trim()
    .min(MIN_PROMPT_LENGTH, { message: "prompt_text_too_short" })
    .max(MAX_PROMPT_LENGTH, { message: "prompt_text_too_long" }),
});

export type CreateGenerationPayload = z.infer<typeof createGenerationSchema>;

export const generationsListQuerySchema = z.object({
  page: z.coerce.number().int().min(MIN_PAGE).default(1),
  limit: z.coerce.number().int().min(MIN_LIMIT).max(MAX_LIMIT).default(10),
  sort: z.enum(["created_at", "updated_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type GenerationsListQueryPayload = z.infer<typeof generationsListQuerySchema>;

export const generationErrorsListQuerySchema = z.object({
  page: z.coerce.number().int().min(MIN_PAGE).default(1),
  limit: z.coerce.number().int().min(MIN_LIMIT).max(MAX_LIMIT).default(10),
  sort: z.enum(["created_at"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  error_code: z
    .string()
    .trim()
    .min(1, { message: "error_code_empty" })
    .max(100, { message: "error_code_too_long" })
    .optional(),
});

export type GenerationErrorsListQueryPayload = z.infer<typeof generationErrorsListQuerySchema>;

/**
 * Parametry path dla endpointów typu /api/generations/{id}
 */
export const generationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type GenerationIdParamInput = z.infer<typeof generationIdParamSchema>;
