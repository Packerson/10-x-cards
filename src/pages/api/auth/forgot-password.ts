import type { APIRoute } from "astro"

import { createSupabaseServerInstance } from "../../../db/supabase.client.ts"
import { requestPasswordReset } from "../../../lib/services/auth.service.ts"
import { authForgotPasswordSchema } from "../../../lib/validators/auth.ts"

export const prerender = false

export const POST: APIRoute = async ({ request, cookies }) => {
  let payload: unknown

  const successResponse = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

  try {
    payload = await request.json()
  } catch {
    return successResponse
  }

  const validation = authForgotPasswordSchema.safeParse(payload)
  if (!validation.success) {
    return successResponse
  }

  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    requestUrl: request.url,
  })

  const redirectTo = new URL("/auth/reset-password", request.url).toString()
  const { error } = await requestPasswordReset({ supabase }, { email: validation.data.email, redirectTo })

  if (error) {
    console.warn("forgot-password: reset request failed", error)
  }

  return successResponse
}
