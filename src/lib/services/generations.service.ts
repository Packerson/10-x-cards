import { createHash } from "node:crypto"
import type { PostgrestError } from "@supabase/supabase-js"
import type { SupabaseClient } from "../../db/supabase.client.ts"
import type {
  CardProposalDTO,
  CreateGenerationCommand,
  GenerationCreatedDTO,
  GenerationsListQuery,
  GenerationsListResponseDTO
} from "../../types.ts"
import { createGenerationSchema } from "../validators/generations.ts"


interface CreateGenerationDeps {
  supabase: SupabaseClient
  userId: string
}

type CreateGenerationError =
  | { code: "validation_error"; details: unknown }
  | { code: "duplicate_prompt" }
  | { code: "database_error"; details?: unknown }

const DEFAULT_MODEL = "gpt-4.1"

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
      userId,
      promptHash,
      error: findError,
    })
    return { error: { code: "database_error", details: findError.message } }
  }

  if (existing && existing.length > 0) {
    return { error: { code: "duplicate_prompt" } }
  }

  const cardProposals = buildMockProposals(promptText)

  const { data: inserted, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      prompt_text: promptText,
      prompt_hash: promptHash,
      status: "processing",
      total_generated: cardProposals.length,
      total_accepted: 0,
      total_deleted: 0,
      model: DEFAULT_MODEL,
      model_settings: {},
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

  try {
    return {
      data: {
        ...inserted,
        card_proposals: cardProposals,
      },
    }
  } catch (processingError) {
    await logGenerationError(
      supabase,
      inserted.id,
      "processing_error",
      processingError instanceof Error
        ? processingError.message
        : "unknown_processing_error",
    )
    return { error: { code: "database_error", details: "processing_failed" } }
  }
}

function buildMockProposals(promptText: string): CardProposalDTO[] {
  const sentences = promptText
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (sentences.length === 0) {
    const fallback = promptText.trim().slice(0, 240) || "Uzupełnij treść pytania"
    return [
      {
        front: `Na podstawie tekstu: ${fallback}`,
        back: "Odpowiedź do uzupełnienia",
        source: "ai_created",
      },
    ]
  }

  return sentences.slice(0, 3).map((sentence, index) => ({
    front: `Kluczowa teza ${index + 1}: ${sentence.slice(0, 160)}`,
    back: `Wyjaśnienie: ${sentence.slice(0, 200)}`,
    source: "ai_created",
  }))
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
      "id, prompt_text, total_generated, total_accepted, total_deleted, created_at, updated_at, model, status",
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

