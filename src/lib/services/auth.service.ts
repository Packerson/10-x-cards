import type { SupabaseClient } from "../../db/supabase.client.ts"
import type { AuthUserDTO } from "../../types.ts"

interface LoginDeps {
  supabase: SupabaseClient
}

type LoginError =
  | { code: "invalid_credentials" }
  | { code: "server_error"; details?: unknown }

type RegisterError =
  | { code: "user_already_exists" }
  | { code: "server_error"; details?: unknown }

export async function loginWithPassword(
  { supabase }: LoginDeps,
  { email, password }: { email: string; password: string },
): Promise<{ data?: AuthUserDTO; error?: LoginError }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const code = typeof error.code === "string" ? error.code : null
      const message = error.message?.toLowerCase() ?? ""

      if (code === "invalid_credentials" || message.includes("invalid login")) {
        return { error: { code: "invalid_credentials" } }
      }

      console.error("loginWithPassword: auth failed", {
        code,
        status: error.status,
        message: error.message,
      })

      return { error: { code: "server_error", details: error.message } }
    }

    if (!data.user) {
      return { error: { code: "server_error", details: "missing_user" } }
    }

    return {
      data: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    }
  } catch (err) {
    console.error("loginWithPassword: unexpected failure", { err })
    return {
      error: {
        code: "server_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}

export async function registerWithPassword(
  { supabase }: LoginDeps,
  { email, password }: { email: string; password: string },
): Promise<{ data?: AuthUserDTO; error?: RegisterError }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      const code = typeof error.code === "string" ? error.code : null
      const message = error.message?.toLowerCase() ?? ""

      if (code === "user_already_exists" || message.includes("already registered")) {
        return { error: { code: "user_already_exists" } }
      }

      console.error("registerWithPassword: auth failed", {
        code,
        status: error.status,
        message: error.message,
      })

      return { error: { code: "server_error", details: error.message } }
    }

    if (!data.user) {
      return { error: { code: "server_error", details: "missing_user" } }
    }

    return {
      data: {
        id: data.user.id,
        email: data.user.email ?? null,
      },
    }
  } catch (err) {
    console.error("registerWithPassword: unexpected failure", { err })
    return {
      error: {
        code: "server_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}
