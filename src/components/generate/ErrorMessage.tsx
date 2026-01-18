import { Button } from "@/components/ui/button"
import type { ErrorMessageProps, GenerateErrorType } from "./types"

const ERROR_MESSAGES: Record<GenerateErrorType, string> = {
  validation_error: "Tekst musi mieć od 1000 do 10000 znaków.",
  duplicate_prompt: "Ten prompt był już użyty. Zmień treść i spróbuj ponownie.",
  server_error: "Wystąpił błąd serwera. Spróbuj ponownie później.",
  network_error: "Brak połączenia z siecią. Sprawdź połączenie i spróbuj ponownie.",
  save_error: "Nie udało się zapisać fiszek. Spróbuj ponownie.",
}

const RETRYABLE_ERRORS: GenerateErrorType[] = [
  "server_error",
  "network_error",
  "save_error",
]

export function ErrorMessage({
  errorType,
  errorMessage,
  onRetry,
  onDismiss,
}: ErrorMessageProps) {
  const message = errorMessage || ERROR_MESSAGES[errorType]
  const canRetry = RETRYABLE_ERRORS.includes(errorType) && onRetry

  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 size-5 shrink-0 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">{message}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-md p-1 text-destructive/70 hover:bg-destructive/20 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive/50"
            aria-label="Zamknij komunikat"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {canRetry && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            Spróbuj ponownie
          </Button>
        </div>
      )}
    </div>
  )
}
