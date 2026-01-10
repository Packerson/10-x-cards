import { useMemo } from "react"
import { ProposalStats } from "./ProposalStats"
import { ProposalList } from "./ProposalList"
import { BulkActions } from "./BulkActions"
import type { ProposalSectionProps } from "./types"

export function ProposalSection({
  proposals,
  onProposalAction,
  onProposalEdit,
  onSaveAccepted,
  onSaveAll,
  onClearAll,
  isSaving,
}: ProposalSectionProps) {
  const stats = useMemo(() => {
    const accepted = proposals.filter((p) => p.status === "accepted").length
    const rejected = proposals.filter((p) => p.status === "rejected").length
    const pending = proposals.filter((p) => p.status === "pending").length

    return {
      total: proposals.length,
      accepted,
      rejected,
      pending,
    }
  }, [proposals])

  if (proposals.length === 0) {
    return null
  }

  return (
    <section className="space-y-6" aria-labelledby="proposals-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="proposals-heading" className="text-xl font-semibold text-foreground">
          Propozycje fiszek
        </h2>
        <ProposalStats {...stats} />
      </div>

      <BulkActions
        totalCount={stats.total}
        acceptedCount={stats.accepted}
        onSaveAll={onSaveAll}
        onClearAll={onClearAll}
        onSaveAccepted={onSaveAccepted}
        isSaving={isSaving}
      />

      <ProposalList
        proposals={proposals}
        onAction={onProposalAction}
        onEdit={onProposalEdit}
      />
    </section>
  )
}
