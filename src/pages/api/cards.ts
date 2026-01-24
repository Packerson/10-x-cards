import type { APIRoute } from "astro"

import { supabaseClient } from "../../db/supabase.client"
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
  const userId = (locals as any)?.userId

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
    (card) =>
      (card.source === "ai_created" || card.source === "ai_edited") &&
      card.generation_id === undefined,
  )

  if (missingGenerationId) {
    return new Response(JSON.stringify({ error: "generation_id_required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // TODO (MVP/FE): jeśli user edytuje propozycję przed zapisem, frontend powinien wysłać
  // source: "ai_edited" oraz nadal przekazywać generation_id (żeby zachować powiązanie z generacją).
  // Wtedy warto rozszerzyć walidację serwera tak, aby generation_id było wymagane także dla "ai_edited".

  const generationIds = Array.from(
    new Set(
      cards
        .map((card) => card.generation_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  )

  const supabase = (locals as any)?.supabase ?? supabaseClient
  const userId = (locals as any)?.userId

  let generationsForRequest: Array<{ id: number; total_generated: number | null }> | null = null

  if (generationIds.length > 0) {
    const { data: generations, error: generationError } = await supabase
      .from("generations")
      .select("id, total_generated")
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

    generationsForRequest = generations
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

  // Jeśli zapisujemy karty powiązane z generacją, domykamy cykl życia generacji.
  // Best-effort: nie psujemy odpowiedzi 201 w razie błędu update'u (żeby uniknąć retry + duplikatów).
  if (generationIds.length > 0) {
    const acceptedByGenerationId = new Map<number, number>()
    for (const card of cards) {
      if (typeof card.generation_id !== "number") continue
      if (card.source !== "ai_created" && card.source !== "ai_edited") continue
      acceptedByGenerationId.set(
        card.generation_id,
        (acceptedByGenerationId.get(card.generation_id) ?? 0) + 1,
      )
    }

    const generations = generationsForRequest

    if (!generations) {
      console.error("POST /api/cards: missing generationsForRequest for counters update", {
        userId,
        generationIds,
      })
    } else {
      await Promise.all(
        generations.map(async (g: { id: number; total_generated: number | null }) => {
          const accepted = acceptedByGenerationId.get(g.id) ?? 0
          const totalGenerated = typeof g.total_generated === "number" ? g.total_generated : 0
          const rejected = Math.max(0, totalGenerated - accepted)

          const { error: updateError } = await supabase
            .from("generations")
            .update({ status: "completed", total_accepted: accepted, total_rejected: rejected })
            .eq("user_id", userId)
            .eq("id", g.id)

          if (updateError) {
            console.error("POST /api/cards: failed to update generation status/counters", {
              userId,
              generationId: g.id,
              accepted,
              rejected,
              totalGenerated,
              db_code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
            })
          }
        }),
      )
    }
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  })
}

