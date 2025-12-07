import type { PostgrestError } from "@supabase/supabase-js"
import type { SupabaseClient } from "../../db/supabase.client.ts"
import type { TablesInsert } from "../../db/database.types.ts"
import type {
  CardCreatePayload,
  CardsListQuery,
  CardsListResponseDTO,
  CreateCardsResultDTO,
} from "../../types.ts"

interface CreateCardsDeps {
  supabase: SupabaseClient
  userId: string
}

type CreateCardsError =
  | { code: "unique_violation"; details?: unknown }
  | { code: "foreign_key_violation"; details?: unknown }
  | { code: "invalid_input"; details?: unknown }
  | { code: "database_error"; details?: unknown }

export async function createCards(
  { supabase, userId }: CreateCardsDeps,
  cards: CardCreatePayload[],
): Promise<{ data?: CreateCardsResultDTO; error?: CreateCardsError }> {
  try {
    const rows: TablesInsert<"cards">[] = cards.map((card) => ({
      user_id: userId,
      front: card.front,
      back: card.back,
      source: card.source,
      status: card.status ?? "pending",
      ...(card.generation_id !== undefined ? { generation_id: card.generation_id } : {}),
    }))

    const { error, count } = await supabase
      .from("cards")
      .insert(rows, { count: "exact" })

    if (error) {
      const mapped = mapPostgrestError(error)
      console.error("createCards: insert failed", {
        userId,
        db_code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        mapped_code: mapped.code,
      })

      return { error: mapped }
    }

    const inserted = count ?? rows.length

    return { data: { inserted } }
  } catch (err) {
    console.error("createCards: unexpected failure", { userId, err })
    return {
      error: {
        code: "database_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}

function mapPostgrestError(error: PostgrestError): CreateCardsError {
  if (error.code === "23505") {
    return { code: "unique_violation", details: error.message }
  }

  if (error.code === "23503") {
    return { code: "foreign_key_violation", details: error.message }
  }

  if (error.code === "22P02" || error.code === "23502" || error.code === "23514") {
    return { code: "invalid_input", details: error.message }
  }

  return { code: "database_error", details: error.message }
}

interface ListCardsDeps {
  supabase: SupabaseClient
  userId: string
}

type ListCardsError = { code: "database_error"; details?: unknown }

export async function listCards(
  { supabase, userId }: ListCardsDeps,
  params: CardsListQuery,
): Promise<{ data?: CardsListResponseDTO; error?: ListCardsError }> {
  const page = params.page ?? 1
  const limitInput = params.limit ?? 10
  const limit = Number.isFinite(limitInput) && limitInput >= 1 ? limitInput : 1
  const sort = params.sort ?? "created_at"
  const order = params.order ?? "desc"

  const offset = (page - 1) * limit
  const to = offset + limit - 1

  const applyFilters = (query: ReturnType<SupabaseClient["from"]>) => {
    let q = query.eq("user_id", userId)

    if (params.status) {
      q = q.eq("status", params.status)
    }

    if (params.source) {
      q = q.eq("source", params.source)
    }

    if (params.generation_id !== undefined) {
      q = q.eq("generation_id", params.generation_id)
    }

    if (params.search) {
      q = q.ilike("front", `%${params.search}%`)
    }

    return q
  }

  const { count, error: countError } = await applyFilters(
    supabase.from("cards").select("*", { count: "exact", head: true }),
  )

  if (countError) {
    console.error("listCards: count query failed", { userId, params, error: countError })
    return { error: { code: "database_error", details: countError.message } }
  }

  const totalItems = count ?? 0
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit)

  if (totalItems === 0 || offset >= totalItems) {
    return {
      data: {
        data: [],
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

  const { data, error } = await applyFilters(
    supabase
      .from("cards")
      .select("*")
      .order(sort, { ascending: order === "asc" })
      .range(offset, to),
  )

  if (error) {
    console.error("listCards: query failed", { userId, params, error })
    return { error: { code: "database_error", details: error.message } }
  }

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

