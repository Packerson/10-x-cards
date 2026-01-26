import { test as setup } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

setup("validate e2e env", async () => {
  requireEnv("SUPABASE_URL");
  requireEnv("SUPABASE_KEY");
  requireEnv("E2E_USERNAME_ID");
  requireEnv("E2E_USERNAME");
  requireEnv("E2E_PASSWORD");
});
