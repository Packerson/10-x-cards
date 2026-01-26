import type { ProposalStatsProps } from "./types";

export function ProposalStats({ total, accepted, rejected, pending }: ProposalStatsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm" aria-label="Statystyki propozycji">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{total}</span>
        <span className="text-muted-foreground">łącznie</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span className="font-medium text-emerald-600 dark:text-emerald-400">{accepted}</span>
        <span className="text-muted-foreground">zaakceptowanych</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
        <span className="font-medium text-destructive">{rejected}</span>
        <span className="text-muted-foreground">odrzuconych</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
        <span className="font-medium text-amber-600 dark:text-amber-400">{pending}</span>
        <span className="text-muted-foreground">oczekujących</span>
      </div>
    </div>
  );
}
