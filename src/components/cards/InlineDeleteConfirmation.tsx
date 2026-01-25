export interface InlineDeleteConfirmationProps {
  isSubmitting?: boolean
  error?: string | null
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function InlineDeleteConfirmation(props: InlineDeleteConfirmationProps) {
  const { isSubmitting, error, onConfirm, onCancel } = props

  return (
    <div
      className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3"
      role="alert"
      aria-live="polite"
      data-testid="inline-delete-confirmation"
    >
      <div className="text-sm font-medium text-destructive">Usunąć tę fiszkę?</div>

      {error && (
        <div className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="h-9 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground disabled:opacity-50"
          disabled={isSubmitting}
          onClick={() => onConfirm()}
          data-testid="inline-delete-confirm"
        >
          {isSubmitting ? "Usuwanie..." : "Potwierdź"}
        </button>
        <button
          type="button"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          disabled={isSubmitting}
          onClick={onCancel}
          data-testid="inline-delete-cancel"
        >
          Anuluj
        </button>
      </div>
    </div>
  )
}

