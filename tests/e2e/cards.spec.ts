import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types.ts";
import { CardsPage } from "./page-objects/CardsPage";
import { LoginPage } from "./page-objects/LoginPage";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
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

test.describe.serial("cards e2e", () => {
  test.beforeEach(async ({ page }) => {
    await signInAndClearCards();
    await loginThroughUi(page);
    await page.goto("/cards");
  });

  test("happy path: create and delete card", async ({ page }) => {
    const cards = new CardsPage(page);
    await cards.waitForLoad();

    await expect(cards.emptyState).toBeVisible();

    await cards.openCreateModal();
    await cards.fillCard("Przód testowy", "Tył testowy");
    await cards.submitCreateCard();

    await expect(cards.flashcards).toHaveCount(1);

    await cards.firstFlashcardDeleteButton().click();
    await expect(cards.inlineDeleteConfirmation).toBeVisible();
    await expect(page.getByText("Usunąć tę fiszkę?")).toBeVisible();
    await cards.inlineDeleteConfirmButton.click();

    await expect(cards.flashcards).toHaveCount(0);
    await expect(cards.emptyState).toBeVisible();
  });

  test("validation: empty front disables submit", async ({ page }) => {
    const cards = new CardsPage(page);
    await cards.waitForLoad();

    await cards.openCreateModal();
    await cards.fillCard("", "Tył testowy");
    await expect(cards.submitButton).toBeDisabled();
  });

  test("validation: empty back disables submit", async ({ page }) => {
    const cards = new CardsPage(page);
    await cards.waitForLoad();

    await cards.openCreateModal();
    await cards.fillCard("Przód testowy", "");
    await expect(cards.submitButton).toBeDisabled();
  });
});
