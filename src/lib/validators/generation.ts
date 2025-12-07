import { z } from "zod"

export const MIN_PROMPT_LENGTH = 1000
export const MAX_PROMPT_LENGTH = 10000

export const createGenerationSchema = z.object({
  prompt_text: z
    .string()
    .trim()
    .min(MIN_PROMPT_LENGTH, { message: "prompt_text_too_short" })
    .max(MAX_PROMPT_LENGTH, { message: "prompt_text_too_long" }),
})

export type CreateGenerationPayload = z.infer<typeof createGenerationSchema>

