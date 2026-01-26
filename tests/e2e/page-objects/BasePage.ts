import type { Locator, Page } from "@playwright/test";

export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  protected root(): Locator {
    return this.page.locator("body");
  }

  async waitForLoad(): Promise<void> {
    await this.root().waitFor();
  }
}
