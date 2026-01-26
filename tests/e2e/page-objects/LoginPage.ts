import { expect, type Locator, type Page } from "@playwright/test"
import { BasePage } from "./BasePage"

export class LoginPage extends BasePage {
  readonly form: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    super(page)
    this.form = page.getByTestId("login-form")
    this.emailInput = page.getByTestId("login-email-input")
    this.passwordInput = page.getByTestId("login-password-input")
    this.submitButton = page.getByTestId("login-submit")
  }

  async goto(): Promise<void> {
    await this.page.goto("/auth/login")
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.waitForLoadState("networkidle")
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.emailInput.blur()
    await this.passwordInput.blur()
    if (await this.submitButton.isDisabled()) {
      await this.emailInput.click()
      await this.page.keyboard.press("ControlOrMeta+A")
      await this.page.keyboard.type(email, { delay: 20 })
      await this.page.keyboard.press("Tab")
      await this.page.keyboard.type(password, { delay: 20 })
      await this.page.keyboard.press("Tab")
    }
    await expect(this.submitButton).toBeEnabled()
    await this.submitButton.click()
  }
}
