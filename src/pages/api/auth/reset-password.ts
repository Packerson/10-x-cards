import type { APIRoute } from "astro"

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts"
import { updatePasswordWithRecovery } from "../../../lib/services/auth.service.ts"
import { authResetPasswordSchema } from "../../../lib/validators/auth.ts"

export const prerender = false

export const POST: APIRoute = async ({ request, cookies }) => {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "validation_error", details: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const validation = authResetPasswordSchema.safeParse(payload)
  if (!validation.success) {
    return new Response(JSON.stringify({ error: "validation_error", details: validation.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    requestUrl: request.url,
  })

  const { error } = await updatePasswordWithRecovery(
    { supabase },
    {
      code: validation.data.code,
      newPassword: validation.data.newPassword,
    },
  )

  if (error) {
    switch (error.code) {
      case "invalid_token":
        return new Response(JSON.stringify({ error: "invalid_token" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      case "token_expired":
        return new Response(JSON.stringify({ error: "token_expired" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      case "weak_password":
        return new Response(JSON.stringify({ error: "weak_password" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      default:
        return new Response(JSON.stringify({ error: "server_error", details: error.details }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
