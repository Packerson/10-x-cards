import { useState } from "react"
import type { CardVM } from "./types"
import { InlineDeleteConfirmation } from "./InlineDeleteConfirmation"

export interface FlashCardProps {
  card: CardVM
  isDeleteConfirmOpen?: boolean
  deleteIsSubmitting?: boolean
  deleteError?: string | null
  onDeleteRequest: (cardId: number) => void
  onDeleteCancel: () => void
  onDeleteConfirm: () => Promise<void>
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })
}

export function FlashCard(props: FlashCardProps) {
  const {
    card,
    isDeleteConfirmOpen,
    deleteIsSubmitting,
    deleteError,
    onDeleteRequest,
    onDeleteCancel,
    onDeleteConfirm,
  } = props
  const [isExpanded, setIsExpanded] = useState(false)

  const backText = isExpanded ? card.back : card.backPreview

  return (
    <article
      className="flex h-full flex-col rounded-lg border bg-card p-4"
      data-testid={`flashcard-${card.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug break-words">
          {card.front}
        </h3>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {card.source ?? "—"}
        </span>
      </header>

      <div className="mt-3 flex-1 text-sm text-foreground whitespace-pre-wrap break-words">
        {backText}
      </div>

      {card.isBackTruncated && (
        <button
          type="button"
          className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded ? "Zwiń" : "Pokaż więcej"}
        </button>
      )}

      {isDeleteConfirmOpen && (
        <InlineDeleteConfirmation
          isSubmitting={deleteIsSubmitting}
          error={deleteError ?? null}
          onCancel={onDeleteCancel}
          onConfirm={onDeleteConfirm}
        />
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Utworzono: {formatDate(card.created_at)}
        </div>
        <button
          type="button"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          onClick={() => onDeleteRequest(card.id)}
          data-testid={`flashcard-delete-${card.id}`}
        >
          Usuń
        </button>
      </div>
    </article>
  )
}

