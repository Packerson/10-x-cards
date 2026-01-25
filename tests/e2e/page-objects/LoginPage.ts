import type { Locator, Page } from "@playwright/test"
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
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
