import { z } from "zod"

const MIN_FRONT_LENGTH = 1
const MAX_FRONT_LENGTH = 200
const MIN_BACK_LENGTH = 1
const MAX_BACK_LENGTH = 500
const MAX_BULK_SIZE = 100
const MIN_PAGE = 1
const MIN_LIMIT = 1
const MAX_LIMIT = 100

const cardSourceEnum = z.enum(["manual", "ai_created", "ai_edited"])
const cardStatusEnum = z.enum(["pending", "accepted", "rejected"])

export const cardCreateSchema = z.object({
  front: z.string().trim().min(MIN_FRONT_LENGTH).max(MAX_FRONT_LENGTH),
  back: z.string().trim().min(MIN_BACK_LENGTH).max(MAX_BACK_LENGTH),
  source: cardSourceEnum,
  generation_id: z.number().int().positive().optional(),
  status: cardStatusEnum.optional(),
})

export const createCardsSchema = z.object({
  cards: z.array(cardCreateSchema).min(1).max(MAX_BULK_SIZE),
})

export type CardCreateInput = z.infer<typeof cardCreateSchema>
export type CreateCardsInput = z.infer<typeof createCardsSchema>

export const cardsListQuerySchema = z.object({
  page: z
    .coerce.number()
    .int()
    .default(1)
    .transform((val) => {
      if (!Number.isFinite(val) || val < MIN_PAGE) return MIN_PAGE
      return val
    }),
  limit: z
    .coerce.number()
    .int()
    .default(10)
    .transform((val) => {
      if (!Number.isFinite(val)) return MIN_LIMIT
      if (val < MIN_LIMIT) return MIN_LIMIT
      if (val > MAX_LIMIT) return MAX_LIMIT
      return val
    }),
  sort: z.enum(["created_at", "updated_at", "front"]).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: cardStatusEnum.optional(),
  source: cardSourceEnum.optional(),
  generation_id: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(200).optional(),
})

export type CardsListQueryInput = z.infer<typeof cardsListQuerySchema>

