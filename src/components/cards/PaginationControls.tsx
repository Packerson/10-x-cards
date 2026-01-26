export interface PaginationControlsProps {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  isBusy?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function PaginationControls(props: PaginationControlsProps) {
  const { page, limit, totalPages, totalItems, isBusy, onPageChange, onLimitChange } = props;

  const canPrev = page > 1 && !isBusy;
  const canNext = page < totalPages && !isBusy;

  const from = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(totalItems, page * limit);

  return (
    <section aria-label="Paginacja" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        {totalItems === 0 ? "0 wyników" : `${from}–${to} z ${totalItems}`}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Limit</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={limit}
            disabled={isBusy}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            Poprzednia
          </button>
          <div className="min-w-[88px] text-center text-sm text-muted-foreground">
            Strona <span className="font-medium text-foreground">{page}</span> /{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </div>
          <button
            type="button"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            Następna
          </button>
        </div>
      </div>
    </section>
  );
}
