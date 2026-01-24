import type { APIRoute } from "astro"

import { listGenerationErrors } from "../../../../lib/services/generations.service"
import { generationErrorsListQuerySchema, generationIdParamSchema } from "../../../../lib/validators/generations"

export const prerender = false

export const GET: APIRoute = async ({ params, url, locals }) => {
  const idValidation = generationIdParamSchema.safeParse({ id: params.id })
  if (!idValidation.success) {
    return new Response(
      JSON.stringify({ error: "validation_error", details: idValidation.error.format() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  const rawQuery = Object.fromEntries(url.searchParams.entries())
  const queryValidation = generationErrorsListQuerySchema.safeParse(rawQuery)
  if (!queryValidation.success) {
    return new Response(
      JSON.stringify({ error: "validation_error", details: queryValidation.error.format() }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  const supabase = (locals as any)?.supabase
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "server_error", details: "supabase_not_configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  const userId = (locals as any)?.userId

  const generationId = idValidation.data.id
  const { data, error } = await listGenerationErrors(
    { supabase, userId },
    generationId,
    queryValidation.data,
  )

  if (error) {
    if (error.code === "not_found") {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

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


