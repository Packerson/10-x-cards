import type { Locator, Page } from "@playwright/test"
import { BasePage } from "./BasePage"

export class GeneratePage extends BasePage {
  readonly root: Locator
  readonly promptSection: Locator
  readonly promptForm: Locator
  readonly promptInput: Locator
  readonly promptCounter: Locator
  readonly submitButton: Locator
  readonly loadingOverlay: Locator
  readonly errorMessage: Locator
  readonly emptyState: Locator
  readonly proposalSection: Locator
  readonly proposalList: Locator
  readonly proposalItems: Locator
  readonly proposalCards: Locator
  readonly proposalAcceptButtons: Locator
  readonly proposalEditButtons: Locator
  readonly proposalRejectButtons: Locator
  readonly bulkActions: Locator
  readonly acceptAllButton: Locator
  readonly rejectAllButton: Locator
  readonly saveAcceptedButton: Locator

  constructor(page: Page) {
    super(page)
    this.root = page.getByTestId("generate-view")
    this.promptSection = page.getByTestId("generate-prompt-section")
    this.promptForm = page.getByTestId("generate-prompt-form")
    this.promptInput = page.getByTestId("generate-prompt-input")
    this.promptCounter = page.getByTestId("generate-prompt-counter")
    this.submitButton = page.getByTestId("generate-submit")
    this.loadingOverlay = page.getByTestId("generate-loading")
    this.errorMessage = page.getByTestId("generate-error")
    this.emptyState = page.getByTestId("generate-empty-state")
    this.proposalSection = page.getByTestId("proposal-section")
    this.proposalList = page.getByTestId("proposal-list")
    this.proposalItems = page.locator("[data-testid^='proposal-item-']")
    this.proposalCards = page.locator("[data-testid^='proposal-card-']")
    this.proposalAcceptButtons = page.getByTestId("proposal-accept")
    this.proposalEditButtons = page.getByTestId("proposal-edit")
    this.proposalRejectButtons = page.getByTestId("proposal-reject")
    this.bulkActions = page.getByTestId("proposal-bulk-actions")
    this.acceptAllButton = page.getByTestId("proposal-accept-all")
    this.rejectAllButton = page.getByTestId("proposal-reject-all")
    this.saveAcceptedButton = page.getByTestId("proposal-save-accepted")
  }

  async goto(): Promise<void> {
    await this.page.goto("/generate")
  }

  async fillPrompt(text: string): Promise<void> {
    await this.promptInput.fill(text)
  }

  async submitPrompt(): Promise<void> {
    await this.submitButton.click()
  }

  proposalCardById(id: number): Locator {
    return this.page.getByTestId(`proposal-card-${id}`)
  }
}
