import { useCallback, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"
import { CardContent } from "./CardContent"
import { CardEditForm } from "./CardEditForm"
import { CardActions } from "./CardActions"
import type { ProposalCardProps } from "./types"

export function ProposalCard({ proposal, onAction, onEdit }: ProposalCardProps) {
  const { id, front, back, status } = proposal
  const isEditing = status === "editing"
  const isAccepted = status === "accepted"
  const isRejected = status === "rejected"

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (isEditing) return

      if (e.key === "Enter" && !isAccepted) {
        e.preventDefault()
        onAction("accept")
      }
    },
    [isEditing, isAccepted, onAction]
  )

  const handleSaveEdit = useCallback(
    (newFront: string, newBack: string) => {
      onEdit(newFront, newBack)
    },
    [onEdit]
  )

  const handleCancelEdit = useCallback(() => {
    onAction("cancel_edit")
  }, [onAction])

  return (
    <article
      className={cn(
        "flex min-w-0 flex-1 flex-col rounded-lg border bg-card p-4 shadow-sm transition-all",
        isAccepted && "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20",
        isRejected && "border-muted opacity-60",
        !isEditing && "focus-within:ring-2 focus-within:ring-ring/20"
      )}
      tabIndex={isEditing ? -1 : 0}
      onKeyDown={handleKeyDown}
      aria-label={`Fiszka: ${front.substring(0, 50)}${front.length > 50 ? "..." : ""}`}
      data-proposal-id={id}
    >
      {isEditing ? (
        <CardEditForm
          initialFront={front}
          initialBack={back}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      ) : (
        <>
          <div className="flex-1">
            <CardContent front={front} back={back} />
          </div>
          <div className="mt-4 flex justify-end">
            <CardActions
              status={status}
              onAccept={() => onAction("accept")}
              onEdit={() => onAction("edit")}
              onReject={() => onAction("reject")}
            />
          </div>
        </>
      )}
    </article>
  )
}
