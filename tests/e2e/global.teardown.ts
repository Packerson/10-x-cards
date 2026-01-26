import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import type { Database } from "../../src/db/database.types.ts";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function clearSupabaseData(): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseKey = requireEnv("SUPABASE_KEY");
  const userId = requireEnv("E2E_USERNAME_ID");

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: generations, error: generationsError } = await supabase
    .from("generations")
    .select("id")
    .eq("user_id", userId);

  if (generationsError) {
    throw generationsError;
  }

  const generationIds = (generations ?? []).map((generation) => generation.id);

  if (generationIds.length > 0) {
    const { error: generationErrorsDeleteError } = await supabase
      .from("generation_errors")
      .delete()
      .in("generation_id", generationIds);

    if (generationErrorsDeleteError) {
      throw generationErrorsDeleteError;
    }
  }

  const { error: cardsDeleteError } = await supabase.from("cards").delete().eq("user_id", userId);

  if (cardsDeleteError) {
    throw cardsDeleteError;
  }

  const { error: generationsDeleteError } = await supabase.from("generations").delete().eq("user_id", userId);

  if (generationsDeleteError) {
    throw generationsDeleteError;
  }
}

teardown("cleanup supabase e2e data", async () => {
  await clearSupabaseData();
});
