import type { Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class HeaderNav extends BasePage {
  readonly header: Locator;
  readonly desktopNav: Locator;
  readonly logo: Locator;
  readonly loginLink: Locator;
  readonly registerLink: Locator;
  readonly generateLink: Locator;
  readonly cardsLink: Locator;
  readonly historyLink: Locator;

  constructor(page: Page) {
    super(page);
    this.header = page.getByTestId("site-header");
    this.logo = page.getByTestId("header-logo");
    this.desktopNav = page.getByTestId("header-nav-desktop");
    this.loginLink = this.desktopNav.getByTestId("header-nav-login");
    this.registerLink = this.desktopNav.getByTestId("header-nav-register");
    this.generateLink = this.desktopNav.getByTestId("header-nav-generate");
    this.cardsLink = this.desktopNav.getByTestId("header-nav-cards");
    this.historyLink = this.desktopNav.getByTestId("header-nav-history");
  }

  async goToGenerate(): Promise<void> {
    await this.desktopNav.waitFor({ state: "visible" });
    await this.generateLink.waitFor({ state: "visible" });
    await this.generateLink.click();
  }

  async goToCards(): Promise<void> {
    await this.desktopNav.waitFor({ state: "visible" });
    await this.cardsLink.waitFor({ state: "visible" });
    await this.cardsLink.click();
  }
}
