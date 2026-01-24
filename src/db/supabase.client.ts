import type { AstroCookies } from "astro"
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types.ts"

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_KEY

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)

export type SupabaseClient = typeof supabaseClient

export const DEFAULT_USER_ID = "5047581d-65c0-41f7-94fb-47c453987921"

const baseCookieOptions: CookieOptionsWithName = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
}

function resolveSecureFlag(headers: Headers, requestUrl?: string): boolean {
  const forwardedProto = headers.get("x-forwarded-proto")
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim() === "https"
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).protocol === "https:"
    } catch {
      return false
    }
  }

  return false
}

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader
    .split(";")
    .map((cookie) => {
      const [name, ...rest] = cookie.trim().split("=")
      return { name, value: rest.join("=") }
    })
    .filter((cookie) => cookie.name)
}

export const createSupabaseServerInstance = (context: {
  headers: Headers
  cookies: AstroCookies
  requestUrl?: string
}) => {
  const cookieOptions: CookieOptionsWithName = {
    ...baseCookieOptions,
    secure: resolveSecureFlag(context.headers, context.requestUrl),
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "")
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  return supabase
}
