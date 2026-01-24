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

type ForgotPasswordError =
  | { code: "server_error"; details?: unknown }

type ResetPasswordError =
  | { code: "invalid_token" }
  | { code: "token_expired" }
  | { code: "weak_password" }
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

export async function requestPasswordReset(
  { supabase }: LoginDeps,
  { email, redirectTo }: { email: string; redirectTo: string },
): Promise<{ error?: ForgotPasswordError }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.error("requestPasswordReset: auth failed", {
        code: error.code,
        status: error.status,
        message: error.message,
      })
      return { error: { code: "server_error", details: error.message } }
    }

    return {}
  } catch (err) {
    console.error("requestPasswordReset: unexpected failure", { err })
    return {
      error: {
        code: "server_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}

export async function updatePasswordWithRecovery(
  { supabase }: LoginDeps,
  {
    accessToken,
    refreshToken,
    code,
    newPassword,
  }: { accessToken?: string; refreshToken?: string; code?: string; newPassword: string },
): Promise<{ error?: ResetPasswordError }> {
  try {
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        const exchangeCode = typeof exchangeError.code === "string" ? exchangeError.code : null
        const exchangeMessage = exchangeError.message?.toLowerCase() ?? ""

        if (exchangeCode === "token_expired" || exchangeMessage.includes("expired")) {
          return { error: { code: "token_expired" } }
        }
        if (exchangeCode === "invalid_token" || exchangeMessage.includes("invalid")) {
          return { error: { code: "invalid_token" } }
        }

        console.error("updatePasswordWithRecovery: exchange failed", {
          code: exchangeCode,
          status: exchangeError.status,
          message: exchangeError.message,
        })

        return { error: { code: "server_error", details: exchangeError.message } }
      }
    } else if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        const sessionCode = typeof sessionError.code === "string" ? sessionError.code : null
        const sessionMessage = sessionError.message?.toLowerCase() ?? ""

        if (sessionCode === "token_expired" || sessionMessage.includes("expired")) {
          return { error: { code: "token_expired" } }
        }
        if (sessionCode === "invalid_token" || sessionMessage.includes("invalid")) {
          return { error: { code: "invalid_token" } }
        }

        console.error("updatePasswordWithRecovery: session failed", {
          code: sessionCode,
          status: sessionError.status,
          message: sessionError.message,
        })

        return { error: { code: "server_error", details: sessionError.message } }
      }
    } else {
      return { error: { code: "invalid_token" } }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      const code = typeof updateError.code === "string" ? updateError.code : null
      const message = updateError.message?.toLowerCase() ?? ""

      if (code === "weak_password" || message.includes("weak password")) {
        return { error: { code: "weak_password" } }
      }

      console.error("updatePasswordWithRecovery: update failed", {
        code,
        status: updateError.status,
        message: updateError.message,
      })
      return { error: { code: "server_error", details: updateError.message } }
    }

    return {}
  } catch (err) {
    console.error("updatePasswordWithRecovery: unexpected failure", { err })
    return {
      error: {
        code: "server_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    }
  }
}
