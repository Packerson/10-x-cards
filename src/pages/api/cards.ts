import type { APIRoute } from "astro"

import { DEFAULT_USER_ID, supabaseClient } from "../../db/supabase.client"
import { createCards, listCards } from "../../lib/services/cards.service"
import { cardsListQuerySchema, createCardsSchema } from "../../lib/validators/cards"

export const prerender = false

export const GET: APIRoute = async ({ url, locals }) => {
  const rawQuery = Object.fromEntries(url.searchParams.entries())
  const validation = cardsListQuerySchema.safeParse(rawQuery)

  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: "validation_error", details: validation.error.format() }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const supabase = (locals as any)?.supabase ?? supabaseClient
  const userId = DEFAULT_USER_ID // TODO: zastąpić realnym userId po wdrożeniu auth

  const { data, error } = await listCards({ supabase, userId }, validation.data)

  if (error) {
    return new Response(JSON.stringify({ error: "server_error", details: error.details }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

export const POST: APIRoute = async ({ request, locals }) => {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "validation_error", details: "invalid_json" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const validation = createCardsSchema.safeParse(payload)

  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: "validation_error", details: validation.error.format() }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const cards = validation.data.cards

  const missingGenerationId = cards.some(
    (card) => card.source === "ai_created" && card.generation_id === undefined,
  )

  if (missingGenerationId) {
    return new Response(JSON.stringify({ error: "generation_id_required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const generationIds = Array.from(
    new Set(
      cards
        .map((card) => card.generation_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  )

  const supabase = (locals as any)?.supabase ?? supabaseClient
  const userId = DEFAULT_USER_ID

  if (generationIds.length > 0) {
    const { data: generations, error: generationError } = await supabase
      .from("generations")
      .select("id")
      .eq("user_id", userId)
      .in("id", generationIds)

    if (generationError) {
      return new Response(
        JSON.stringify({ error: "server_error", details: generationError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (!generations || generations.length !== generationIds.length) {
      return new Response(JSON.stringify({ error: "generation_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  const { data, error } = await createCards({ supabase, userId }, cards)

  if (error) {
    switch (error.code) {
      case "unique_violation":
        return new Response(JSON.stringify({ error: "duplicate_front" }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        })
      case "foreign_key_violation":
        return new Response(JSON.stringify({ error: "generation_not_found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      case "invalid_input":
        return new Response(JSON.stringify({ error: "validation_error", details: error.details }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        })
      default:
        return new Response(JSON.stringify({ error: "server_error", details: error.details }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
    }
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  })
}

