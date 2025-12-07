import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types.ts"

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_KEY

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)

export type SupabaseClient = typeof supabaseClient

export const DEFAULT_USER_ID = "5047581d-65c0-41f7-94fb-47c453987921"
