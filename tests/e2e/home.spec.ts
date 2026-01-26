import { expect, test } from "@playwright/test";
import { HomePage } from "./pages/HomePage";

test("home loads", async ({ page }) => {
  const home = new HomePage(page);
  await home.goto();
  await home.waitForLoad();
  await expect(page).toHaveURL(/\/$/);
});
