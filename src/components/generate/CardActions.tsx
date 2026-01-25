import { Button } from "@/components/ui/button"
import type { CardActionsProps } from "./types"

export function CardActions({ status, onAccept, onEdit, onReject }: CardActionsProps) {
  const isAccepted = status === "accepted"
  const isRejected = status === "rejected"

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isAccepted ? "default" : "outline"}
        size="sm"
        onClick={onAccept}
        disabled={isAccepted}
        className={isAccepted ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        aria-label="Akceptuj fiszkę"
        aria-pressed={isAccepted}
        data-testid="proposal-accept"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        aria-label="Edytuj fiszkę"
        data-testid="proposal-edit"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </Button>

      <Button
        type="button"
        variant={isRejected ? "destructive" : "outline"}
        size="sm"
        onClick={onReject}
        disabled={isRejected}
        aria-label="Odrzuć fiszkę"
        aria-pressed={isRejected}
        data-testid="proposal-reject"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>
    </div>
  )
}
