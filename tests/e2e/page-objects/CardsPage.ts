import type { Locator, Page } from "@playwright/test"
import { BasePage } from "./BasePage"

export class CardsPage extends BasePage {
  readonly addButton: Locator
  readonly createModal: Locator
  readonly frontInput: Locator
  readonly backInput: Locator
  readonly submitButton: Locator
  readonly cancelButton: Locator
  readonly closeButton: Locator
  readonly emptyState: Locator
  readonly cardsGrid: Locator
  readonly flashcards: Locator
  readonly flashcardDeleteButtons: Locator
  readonly inlineDeleteConfirmation: Locator
  readonly inlineDeleteConfirmButton: Locator
  readonly inlineDeleteCancelButton: Locator

  constructor(page: Page) {
    super(page)
    this.addButton = page.getByTestId("cards-add-button")
    this.createModal = page.getByTestId("create-card-modal")
    this.frontInput = page.getByTestId("create-card-front-input")
    this.backInput = page.getByTestId("create-card-back-input")
    this.submitButton = page.getByTestId("create-card-submit")
    this.cancelButton = page.getByTestId("create-card-cancel")
    this.closeButton = page.getByTestId("create-card-close")
    this.emptyState = page.getByTestId("cards-empty-state")
    this.cardsGrid = page.getByTestId("cards-grid")
    this.flashcards = page.locator(
      "[data-testid^='flashcard-']:not([data-testid^='flashcard-delete-'])",
    )
    this.flashcardDeleteButtons = page.locator("[data-testid^='flashcard-delete-']")
    this.inlineDeleteConfirmation = page.getByTestId("inline-delete-confirmation")
    this.inlineDeleteConfirmButton = page.getByTestId("inline-delete-confirm")
    this.inlineDeleteCancelButton = page.getByTestId("inline-delete-cancel")
  }

  async openCreateModal(): Promise<void> {
    await this.addButton.click()
    await this.createModal.waitFor()
  }

  async fillCard(front: string, back: string): Promise<void> {
    await this.frontInput.fill(front)
    await this.backInput.fill(back)
  }

  async submitCreateCard(): Promise<void> {
    await this.submitButton.click()
  }

  firstFlashcard(): Locator {
    return this.flashcards.first()
  }

  firstFlashcardDeleteButton(): Locator {
    return this.flashcardDeleteButtons.first()
  }

  flashcardById(cardId: number): Locator {
    return this.page.getByTestId(`flashcard-${cardId}`)
  }

  flashcardDeleteButtonById(cardId: number): Locator {
    return this.page.getByTestId(`flashcard-delete-${cardId}`)
  }

  async flashcardCount(): Promise<number> {
    return this.flashcards.count()
  }
}
