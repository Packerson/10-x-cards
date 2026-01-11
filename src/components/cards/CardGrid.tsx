import { FlashCard } from "./FlashCard"
import type { CardVM } from "./types"

export interface CardGridProps {
  cards: CardVM[]
  deleteState:
    | null
    | {
        cardId: number
        isSubmitting: boolean
        error: string | null
      }
  onDeleteRequest: (cardId: number) => void
  onDeleteCancel: () => void
  onDeleteConfirm: () => Promise<void>
}

export function CardGrid(props: CardGridProps) {
  const { cards, deleteState, onDeleteRequest, onDeleteCancel, onDeleteConfirm } = props

  return (
    <section aria-label="Lista fiszek" className="mt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <FlashCard
            key={card.id}
            card={card}
            isDeleteConfirmOpen={deleteState?.cardId === card.id}
            deleteIsSubmitting={deleteState?.cardId === card.id ? deleteState.isSubmitting : undefined}
            deleteError={deleteState?.cardId === card.id ? deleteState.error : null}
            onDeleteRequest={onDeleteRequest}
            onDeleteCancel={onDeleteCancel}
            onDeleteConfirm={onDeleteConfirm}
          />
        ))}
      </div>
    </section>
  )
}

