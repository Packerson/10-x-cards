import type { APIRoute } from "astro"

import { DEFAULT_USER_ID, supabaseClient } from "../../db/supabase.client"
import { createGeneration } from "../../lib/services/generation.service"

export const prerender = false

export const POST: APIRoute = async ({ request, locals }) => {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "validation_error", details: "invalid_json" }),
      { status: 400 },
    )
  }

  const userId = DEFAULT_USER_ID

  const supabase = (locals as any)?.supabase ?? supabaseClient

  const { data, error } = await createGeneration({ supabase, userId }, payload as any)

  if (error) {
    if (error.code === "validation_error") {
      return new Response(
        JSON.stringify({ error: "validation_error", details: error.details }),
        { status: 400 },
      )
    }

    if (error.code === "duplicate_prompt") {
      return new Response(JSON.stringify({ error: "duplicate_prompt" }), { status: 409 })
    }

    return new Response(
      JSON.stringify({ error: "server_error", details: error.details }),
      { status: 500 },
    )
  }

  return new Response(JSON.stringify(data), { status: 201 })
}

