import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types.ts";
import { LoginPage } from "./page-objects/LoginPage";
import { HeaderNav } from "./page-objects/HeaderNav";
import { GeneratePage } from "./page-objects/GeneratePage";
import { CardsPage } from "./page-objects/CardsPage";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function repeatChar(char: string, length: number): string {
  return char.repeat(length);
}

function buildRandomPrompt(length: number): string {
  const prefix = `seed-${Date.now()}-${Math.random().toString(36).slice(2)}-`;
  if (prefix.length >= length) {
    return prefix.slice(0, length);
  }
  return prefix + repeatChar("a", length - prefix.length);
}

async function signInAndClearCards(): Promise<void> {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseKey = requireEnv("SUPABASE_KEY");
  const email = requireEnv("E2E_USERNAME");
  const password = requireEnv("E2E_PASSWORD");

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw signInError;
  }

  if (!data.user) {
    throw new Error("Missing user after sign-in.");
  }

  const { error: deleteError } = await supabase.from("cards").delete().eq("user_id", data.user.id);

  if (deleteError) {
    throw deleteError;
  }
}

async function loginThroughUi(page: Page): Promise<void> {
  const email = requireEnv("E2E_USERNAME");
  const password = requireEnv("E2E_PASSWORD");

  const login = new LoginPage(page);
  await login.goto();
  await login.form.waitFor();
  await login.login(email, password);
  await page.waitForURL("/", { waitUntil: "domcontentloaded" });
  await page.getByText("Cześć").waitFor({ state: "visible" });
}

test.describe.serial("generate e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await signInAndClearCards();
    await loginThroughUi(page);
  });

  test("happy path: generate and save proposals", async ({ page }) => {
    const header = new HeaderNav(page);
    const generate = new GeneratePage(page);
    const cards = new CardsPage(page);

    await header.goToGenerate();
    await generate.root.waitFor();
    await expect(generate.root).toHaveAttribute("data-hydrated", "true");

    const minText = buildRandomPrompt(1000);
    const maxText = buildRandomPrompt(10000);
    const overMaxText = buildRandomPrompt(10001);

    await generate.fillPrompt(minText);
    await expect(generate.submitButton).toBeEnabled();

    await generate.fillPrompt(maxText);
    await expect(generate.submitButton).toBeEnabled();

    await generate.fillPrompt("");
    await expect(generate.submitButton).toBeDisabled();

    await generate.fillPrompt(overMaxText);
    await expect(generate.submitButton).toBeDisabled();

    await generate.fillPrompt(minText);
    await expect(generate.submitButton).toBeEnabled();

    await generate.submitPrompt();
    await expect(generate.loadingOverlay).toBeVisible();
    await expect(generate.loadingOverlay).toBeHidden({ timeout: 30000 });

    await expect(generate.proposalItems).toHaveCount(10, { timeout: 30000 });
    await expect(generate.saveAcceptedButton).toBeDisabled();

    await generate.acceptAllButton.click();
    await expect(generate.saveAcceptedButton).toBeEnabled();

    await generate.saveAcceptedButton.click();

    await header.goToCards();
    await cards.waitForLoad();
    await expect(cards.flashcards).toHaveCount(10, { timeout: 30000 });
  });

  test("error: duplicate prompt", async ({ page }) => {
    const header = new HeaderNav(page);
    const generate = new GeneratePage(page);

    await header.goToGenerate();
    await generate.root.waitFor();

    const prompt = buildRandomPrompt(1000);

    await generate.fillPrompt(prompt);
    await expect(generate.submitButton).toBeEnabled();
    await generate.submitPrompt();
    await expect(generate.loadingOverlay).toBeVisible();
    await expect(generate.loadingOverlay).toBeHidden({ timeout: 30000 });
    await expect(generate.proposalItems).toHaveCount(10, { timeout: 30000 });

    await generate.fillPrompt(prompt);
    await expect(generate.submitButton).toBeEnabled();
    await generate.submitPrompt();
    await expect(generate.errorMessage).toBeVisible({ timeout: 30000 });
    await expect(generate.errorMessage).toContainText("Ten prompt był już użyty. Zmień treść i spróbuj ponownie.");
  });
});
