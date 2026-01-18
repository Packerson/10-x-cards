import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import type { BulkActionsProps } from "./types"

export function BulkActions({
  totalCount,
  acceptedCount,
  onSaveAll,
  onClearAll,
  onSaveAccepted,
  isSaving,
}: BulkActionsProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const hasAnyProposals = totalCount > 0
  const canSaveAccepted = acceptedCount > 0 && !isSaving

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsConfirmOpen(false)
      }
    }

    if (isConfirmOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isConfirmOpen])

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSaveAll}
          disabled={!hasAnyProposals || isSaving}
        >
          <svg className="mr-1.5 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Zapisz wszystkie
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsConfirmOpen(true)}
          disabled={!hasAnyProposals || isSaving}
        >
          <svg className="mr-1.5 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Odrzuć wszystkie
        </Button>

        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            onClick={onSaveAccepted}
            disabled={!canSaveAccepted}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? (
              <>
                <svg
                  className="mr-1.5 size-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Zapisywanie...
              </>
            ) : (
              <>
                <svg className="mr-1.5 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Zapisz zaakceptowane ({acceptedCount})
              </>
            )}
          </Button>
        </div>
      </div>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="clear-all-title"
          aria-describedby="clear-all-description"
        >
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 id="clear-all-title" className="text-lg font-semibold text-foreground">
              Odrzucić wszystkie propozycje?
            </h3>
            <p id="clear-all-description" className="mt-2 text-sm text-muted-foreground">
              Ta operacja usunie wszystkie wygenerowane fiszki i nie można jej cofnąć.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                Anuluj
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onClearAll()
                  setIsConfirmOpen(false)
                }}
              >
                Odrzuć wszystkie
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
