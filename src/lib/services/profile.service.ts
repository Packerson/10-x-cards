import type { SupabaseClient } from "../../db/supabase.client.ts";
import type { GetProfileDTO, UpdateProfileCommand } from "../../types.ts";
import type { PostgrestError } from "@supabase/supabase-js";

interface GetProfileDeps {
  supabase: SupabaseClient;
  userId?: string;
}

type GetProfileError = { code: "unauthorized" } | { code: "not_found" } | { code: "database_error"; details?: unknown };

/**
 * Zwraca profil aktualnego użytkownika.
 *
 * Uwaga: zapytanie zawsze filtruje po `id = userId`, co minimalizuje ryzyko IDOR
 * i jest spójne z docelowym RLS w Supabase.
 */
export async function getProfile({
  supabase,
  userId,
}: GetProfileDeps): Promise<{ data?: GetProfileDTO; error?: GetProfileError }> {
  if (!userId) {
    return { error: { code: "unauthorized" } };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, locale, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return { error: { code: "database_error", details: error.message } };
    }

    if (!data) {
      // Profil powinien być 1:1 z userem. Jeśli go nie ma, próbujemy go utworzyć z defaultami.
      const created = await createDefaultProfile({ supabase, userId });
      if (created.error) return created;

      return { data: created.data };
    }

    return { data: data as GetProfileDTO };
  } catch (err) {
    return {
      error: {
        code: "database_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    };
  }
}

async function createDefaultProfile({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ data?: GetProfileDTO; error?: GetProfileError }> {
  // DB ma default now() na created_at; locale ustawiamy zgodnie z wymaganiem.
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, locale: "en" })
    .select("id, locale, created_at")
    .maybeSingle();

  if (error) {
    // Jeśli dwa równoległe requesty spróbują utworzyć profil, PK na id spowoduje konflikt.
    // Wtedy robimy re-SELECT i zwracamy wynik.
    if (isUniqueViolation(error)) {
      const { data: reread, error: rereadError } = await supabase
        .from("profiles")
        .select("id, locale, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (rereadError) {
        return { error: { code: "database_error", details: rereadError.message } };
      }

      if (!reread) {
        return { error: { code: "database_error", details: "unexpected_empty_result" } };
      }

      return { data: reread as GetProfileDTO };
    }

    return { error: { code: "database_error", details: error.message } };
  }

  if (!data) {
    return { error: { code: "database_error", details: "unexpected_empty_result" } };
  }

  return { data: data as GetProfileDTO };
}

function isUniqueViolation(error: PostgrestError): boolean {
  // Postgres unique_violation
  return error.code === "23505";
}

interface UpdateProfileDeps {
  supabase: SupabaseClient;
  userId?: string;
}

type UpdateProfileError =
  | { code: "unauthorized" }
  | { code: "not_found" }
  | { code: "database_error"; details?: unknown };

/**
 * Aktualizuje profil aktualnego użytkownika (MVP: tylko `locale`).
 *
 * Uwaga: filtrujemy wyłącznie po `id = userId`, co minimalizuje ryzyko IDOR
 * i jest spójne z docelowym RLS w Supabase.
 */
export async function updateProfile(
  { supabase, userId }: UpdateProfileDeps,
  command: UpdateProfileCommand
): Promise<{ data?: GetProfileDTO; error?: UpdateProfileError }> {
  if (!userId) {
    return { error: { code: "unauthorized" } };
  }

  const locale = command.locale ?? "en";

  try {
    const { data, error } = await supabase
      .from("profiles")
      // Uwaga: profil jest 1:1 z userem (profiles.id = auth.users.id, PK),
      // więc użycie UPSERT (onConflict=id) eliminuje ryzyko wyścigów typu "update -> insert"
      // i gwarantuje brak duplikatów nawet przy równoległych żądaniach.
      .upsert({ id: userId, locale }, { onConflict: "id" })
      .select("id, locale, created_at")
      .maybeSingle();

    if (error) {
      return { error: { code: "database_error", details: error.message } };
    }

    if (!data) {
      return { error: { code: "database_error", details: "unexpected_empty_result" } };
    }

    return { data: data as GetProfileDTO };
  } catch (err) {
    return {
      error: {
        code: "database_error",
        details: err instanceof Error ? err.message : "unknown_error",
      },
    };
  }
}
