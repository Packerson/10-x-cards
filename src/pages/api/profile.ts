import type { APIRoute } from "astro"

import { supabaseClient } from "../../db/supabase.client"
import { getProfile, updateProfile } from "../../lib/services/profile.service"
import { updateProfileSchema } from "../../lib/validators/profile"

export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  const userId = locals.user?.id
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const supabase = (locals as any)?.supabase ?? supabaseClient

  const { data, error } = await getProfile({ supabase, userId })

  if (error) {
    switch (error.code) {
      case "unauthorized":
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      case "not_found":
        return new Response(JSON.stringify({ error: "profile_not_found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      default:
        return new Response(
          JSON.stringify({ error: "server_error", details: error.details }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
    }
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

export const PATCH: APIRoute = async ({ request, locals }) => {
  const supabase = (locals as any)?.supabase
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "server_error", details: "supabase_not_configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const userId = locals.user?.id
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  let jsonBody: unknown
  try {
    jsonBody = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "validation_error", details: "invalid_json" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const validation = updateProfileSchema.safeParse(jsonBody)
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: "validation_error", details: validation.error.flatten() }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    )
  }

  const { data, error } = await updateProfile({ supabase, userId }, validation.data)

  if (error) {
    switch (error.code) {
      case "unauthorized":
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      case "not_found":
        return new Response(JSON.stringify({ error: "profile_not_found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      default:
        return new Response(
          JSON.stringify({ error: "server_error", details: error.details }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        )
    }
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}


