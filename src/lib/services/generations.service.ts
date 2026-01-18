import { createHash } from "node:crypto"
import type { PostgrestError } from "@supabase/supabase-js"
import type { SupabaseClient } from "../../db/supabase.client.ts"
import type {
  CardProposalDTO,
  CreateGenerationCommand,
  GenerationCreatedDTO,
  GenerationDetailDTO,
  GenerationErrorsListQuery,
  GenerationErrorsListResponseDTO,
  GenerationsListQuery,
  GenerationsListResponseDTO,
  UserLocale
} from "../../types.ts"
import type { Json } from "../../db/database.types.ts"
import { createGenerationSchema } from "../validators/generations.ts"
import { OpenRouterService, buildSystemMessage } from "./openrouter.service.ts"
import type { OpenRouterResponseFormat } from "../openrouter.types.ts"
import { getProfile } from "./profile.service.ts"


interface CreateGenerationDeps {
  supabase: SupabaseClient
  userId: string
}

type CreateGenerationError =
  | { code: "validation_error"; details: unknown }
  | { code: "duplicate_prompt" }
  | { code: "database_error"; details?: unknown }

const DEFAULT_CARD_COUNT = 10
const CARD_PROPOSALS_RESPONSE_FORMAT: OpenRouterResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "flashcards_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: { type: "string" },
              back: { type: "string" },
            },
            required: ["front", "back"],
            additionalProperties: false,
          },
        },
      },
      required: ["cards"],
      additionalProperties: false,
    },
  },
}

export async function createGeneration(
  { supabase, userId }: CreateGenerationDeps,
  payload: CreateGenerationCommand,
): Promise<{ data?: GenerationCreatedDTO; error?: CreateGenerationError }> {
  const validation = createGenerationSchema.safeParse(payload)
  if (!validation.success) {
    return { error: { code: "validation_error", details: validation.error.format() } }
  }

  const promptText = validation.data.prompt_text
  const promptHash = createHash("md5").update(promptText).digest("hex")

  const { data: existing, error: findError } = await supabase
    .from("generations")
    .select("id")
    .eq("user_id", userId)
    .eq("prompt_hash", promptHash)
    .limit(1)

  if (findError) {
    console.error("createGeneration: duplicate check failed", {
      promptHash,
      error: findError,
    })
    return { error: { code: "database_error", details: findError.message } }
  }

  if (existing && existing.length > 0) {
    return { error: { code: "duplicate_prompt" } }
  }

  const openRouter = new OpenRouterService()

  const { data: inserted, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt_text: promptText,
      prompt_hash: promptHash,
      // MVP: "processing" oznacza etap propozycji (w mocku zwracamy je od razu).
      // Po zapisaniu zaakceptowanych/zmodyfikowanych kart w POST /api/cards ustawiamy "completed".
      status: "processing",
      total_generated: 0,
      total_accepted: 0,
      total_rejected: 0,
      model: openRouter.defaultModel,
      model_settings: (openRouter.defaultParams ?? {}) as Json,
    })
    .select("id, prompt_text, total_generated, status")
    .single()

  if (insertError || !inserted) {
    console.error("createGeneration: insert failed", {
      userId,
      promptHash,
      error: insertError,
    })
    return { error: { code: "database_error", details: insertError?.message } }
  }

  let cardProposals: CardProposalDTO[] = []
  try {
    const locale = await resolveLocale({ supabase, userId })
    const structured = await openRouter.createStructuredCompletion<{
      cards: Array<{ front: string; back: string }>
    }>({
      systemMessage: buildSystemPrompt(locale),
      userMessage: promptText,
      model: openRouter.defaultModel,
      responseFormat: CARD_PROPOSALS_RESPONSE_FORMAT,
    })

    cardProposals = normalizeCardProposals(structured?.cards)
    if (cardProposals.length === 0) {
      throw new Error("empty_card_proposals")
    }
  } catch (processingError) {
    await logGenerationError(
      supabase,
      inserted.id,
      "processing_error",
      processingError instanceof Error ? processingError.message : "unknown_processing_error",
    )
    return { error: { code: "database_error", details: "processing_failed" } }
  }

  const { data: updated, error: updateError } = await supabase
    .from("generations")
    .update({ total_generated: cardProposals.length })
    .eq("id", inserted.id)
    .select("id, prompt_text, total_generated, status")
    .single()

  if (updateError || !updated) {
    console.error("createGeneration: update failed", {
      generationId: inserted.id,
      error: updateError,
    })
    return { error: { code: "database_error", details: updateError?.message } }
  }

  return {
    data: {
      ...updated,
      card_proposals: cardProposals,
    },
  }
}

function normalizeCardProposals(
  cards: Array<{ front?: string; back?: string }> | undefined,
): CardProposalDTO[] {
  if (!cards || !Array.isArray(cards)) {
    return []
  }

  return cards
    .map((card) => ({
      front: (card.front ?? "").trim(),
      back: (card.back ?? "").trim(),
      source: "ai_created" as CardProposalDTO["source"],
    }))
    .filter((card) => card.front.length > 0 && card.back.length > 0)
}

function buildSystemPrompt(locale: UserLocale) {
  if (locale === "en") {
    return `${buildSystemMessage(locale)} Generate exactly ${DEFAULT_CARD_COUNT} flashcards from the provided text.`
  }

  return `${buildSystemMessage(locale)} Wygeneruj dokładnie ${DEFAULT_CARD_COUNT} fiszek na podstawie dostarczonego tekstu.`
}

async function resolveLocale({
  supabase,
  userId,
}: {
  supabase: SupabaseClient
  userId: string
}): Promise<UserLocale> {
  const profile = await getProfile({ supabase, userId })
  if (profile.data?.locale) {
    return profile.data.locale
  }

  if (profile.error) {
    console.error("createGeneration: failed to resolve locale, fallback to pl", {
      userId,
      error: profile.error,
    })
  }

  return "pl"
}

async function logGenerationError(
  supabase: SupabaseClient,
  generationId: number,
  errorCode: string,
  errorMessage: string,
) {
  const [statusUpdate, errorInsert] = await Promise.all([
    supabase.from("generations").update({ status: "failed" }).eq("id", generationId),
    supabase
      .from("generation_errors")
      .insert({ generation_id: generationId, error_code: errorCode, error_message: errorMessage }),
  ])

  if (statusUpdate.error || errorInsert.error) {
    const dbErrors: PostgrestError[] = []
    if (statusUpdate.error) dbErrors.push(statusUpdate.error)
    if (errorInsert.error) dbErrors.push(errorInsert.error)
    console.error("Failed to log generation error", dbErrors)
  }
}

interface ListGenerationsDeps {
  supabase: SupabaseClient
  userId: string
}

type ListGenerationsError = { code: "database_error"; details?: unknown }

export async function listGenerations(
  { supabase, userId }: ListGenerationsDeps,
  params: GenerationsListQuery,
): Promise<{ data?: GenerationsListResponseDTO; error?: ListGenerationsError }> {
  const page = params.page ?? 1
  const limit = params.limit ?? 10
  const sort = params.sort ?? "created_at"
  const order = params.order ?? "desc"

  const offset = (page - 1) * limit
  const to = offset + limit - 1

  const { data, error, count } = await supabase
    .from("generations")
    .select(
      "id, prompt_text, total_generated, total_accepted, total_rejected, created_at, updated_at, model, status",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .order(sort, { ascending: order === "asc" })
    .range(offset, to)

  if (error) {
    console.error("listGenerations: query failed", { userId, params, error })
    return { error: { code: "database_error", details: error.message } }
  }

  const totalItems = count ?? 0
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit)

  return {
    data: {
      data: data ?? [],
      pagination: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
        sort,
        order,
      },
    },
  }
}

interface GetGenerationByIdDeps {
  supabase: SupabaseClient
  userId: string
}

type GetGenerationByIdError =
  | { code: "not_found" }
  | { code: "database_error"; details?: unknown }

/**
 * Zwraca pojedynczą generację należącą do użytkownika.
 *
 * Uwaga: filtr po `user_id` jest krytyczny — 404 maskuje zarówno "nie istnieje",
 * jak i "nie należy do użytkownika".
 */
export async function getGenerationById(
  { supabase, userId }: GetGenerationByIdDeps,
  generationId: number,
): Promise<{ data?: GenerationDetailDTO; error?: GetGenerationByIdError }> {
  try {
    const { data, error } = await supabase
      .from("generations")
      .select(
        "id, user_id, prompt_text, prompt_hash, status, total_generated, total_accepted, total_rejected, model, model_settings, cost_usd, duration_s, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("id", generationId)
      .maybeSingle()

    if (error) {
      console.error("getGenerationById: query failed", { userId, generationId, error })
      return { error: { code: "database_error", details: error.message } }
    }

    if (!data) {
      return { error: { code: "not_found" } }
    }

    return { data }
  } catch (err) {
    console.error("getGenerationById: unexpected failure", { userId, generationId, err })
    return {
      error: {
        code: "database_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}

interface DeleteGenerationByIdDeps {
  supabase: SupabaseClient
  userId: string
}

type DeleteGenerationByIdError =
  | { code: "not_found" }
  | { code: "database_error"; details?: unknown }

/**
 * Usuwa generację użytkownika.
 *
 * Uwaga: filtr po `user_id` jest krytyczny — 404 maskuje zarówno "nie istnieje",
 * jak i "nie należy do użytkownika".
 *
 * Zakładamy, że baza ma FK z `cards.generation_id` i `generation_errors.generation_id`
 * ustawione na ON DELETE CASCADE, więc jedno DELETE na `generations` usuwa artefakty atomowo.
 */
export async function deleteGenerationById(
  { supabase, userId }: DeleteGenerationByIdDeps,
  generationId: number,
): Promise<{ data?: { id: number }; error?: DeleteGenerationByIdError }> {
  try {
    const { data, error } = await supabase
      .from("generations")
      .delete()
      .eq("user_id", userId)
      .eq("id", generationId)
      .select("id")
      .maybeSingle()

    if (error) {
      console.error("deleteGenerationById: delete failed", {
        userId,
        generationId,
        db_code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return { error: { code: "database_error", details: error.message } }
    }

    if (!data) {
      return { error: { code: "not_found" } }
    }

    return { data: { id: data.id } }
  } catch (err) {
    console.error("deleteGenerationById: unexpected failure", { userId, generationId, err })
    return {
      error: {
        code: "database_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}

interface ListGenerationErrorsDeps {
  supabase: SupabaseClient
  userId: string
}

type ListGenerationErrorsError =
  | { code: "not_found" }
  | { code: "database_error"; details?: unknown }

/**
 * Zwraca paginowaną listę błędów generacji należącej do użytkownika.
 *
 * Uwaga: `generation_errors` nie ma `user_id`, więc autoryzacja musi iść przez
 * sprawdzenie istnienia generacji w `generations` po `(user_id, id)`.
 * Zwracamy 404 zarówno dla "nie istnieje", jak i "cudza" (maskowanie dostępu).
 */
export async function listGenerationErrors(
  { supabase, userId }: ListGenerationErrorsDeps,
  generationId: number,
  params: GenerationErrorsListQuery,
): Promise<{ data?: GenerationErrorsListResponseDTO; error?: ListGenerationErrorsError }> {
  const page = params.page ?? 1
  const limit = params.limit ?? 10
  const sort = params.sort ?? "created_at"
  const order = params.order ?? "desc"
  const errorCode = params.error_code

  const offset = (page - 1) * limit
  const to = offset + limit - 1

  try {
    const { data: generation, error: generationError } = await supabase
      .from("generations")
      .select("id")
      .eq("user_id", userId)
      .eq("id", generationId)
      .maybeSingle()

    if (generationError) {
      console.error("listGenerationErrors: generation check failed", {
        userId,
        generationId,
        error: generationError,
      })
      return { error: { code: "database_error", details: generationError.message } }
    }

    if (!generation) {
      return { error: { code: "not_found" } }
    }

    let query = supabase
      .from("generation_errors")
      .select("id, generation_id, error_code, error_message, created_at", { count: "exact" })
      .eq("generation_id", generationId)

    if (errorCode) {
      query = query.eq("error_code", errorCode)
    }

    const { data, error, count } = await query
      .order(sort, { ascending: order === "asc" })
      .range(offset, to)

    if (error) {
      console.error("listGenerationErrors: query failed", {
        userId,
        generationId,
        params,
        error,
      })
      return { error: { code: "database_error", details: error.message } }
    }

    const totalItems = count ?? 0
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit)

    return {
      data: {
        data: data ?? [],
        pagination: {
          page,
          limit,
          total_items: totalItems,
          total_pages: totalPages,
          sort,
          order,
        },
      },
    }
  } catch (err) {
    console.error("listGenerationErrors: unexpected failure", { userId, generationId, err })
    return {
      error: {
        code: "database_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}

