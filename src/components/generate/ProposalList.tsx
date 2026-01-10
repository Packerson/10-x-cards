import { ProposalCard } from "./ProposalCard"
import type { ProposalListProps } from "./types"

export function ProposalList({ proposals, onAction, onEdit }: ProposalListProps) {
  if (proposals.length === 0) {
    return null
  }

  return (
    <div
      className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="list"
      aria-label="Lista propozycji fiszek"
    >
      {proposals.map((proposal) => (
        <div key={proposal.id} role="listitem" className="flex">
          <ProposalCard
            proposal={proposal}
            onAction={(action) => onAction(proposal.id, action)}
            onEdit={(front, back) => onEdit(proposal.id, front, back)}
          />
        </div>
      ))}
    </div>
  )
}
