import type { CardsListVM, CardsViewError } from "./types";
import { CardGrid } from "./CardGrid";
import { PaginationControls } from "./PaginationControls";

export interface CardsContentProps {
  list: CardsListVM | null;
  isLoading: boolean;
  error: CardsViewError | null;
  onRetry: () => void;
  pagination: null | {
    page: number;
    limit: number;
    total_pages: number;
    total_items: number;
  };
  isBusy?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  deleteState: null | {
    cardId: number;
    isSubmitting: boolean;
    error: string | null;
  };
  onDeleteRequest: (cardId: number) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => Promise<void>;
}

function ErrorBanner(props: { error: CardsViewError; onRetry: () => void }) {
  const { error, onRetry } = props;

  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4">
      <div className="text-sm font-medium text-destructive">Wystąpił błąd</div>
      <div className="mt-1 text-sm text-destructive/90">{error.message}</div>
      <button
        type="button"
        className="mt-3 h-9 rounded-md border border-input bg-background px-3 text-sm"
        onClick={onRetry}
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}

function EmptyState(props: { onRetry: () => void }) {
  const { onRetry } = props;
  return (
    <div className="rounded-md border border-dashed p-6 text-center" data-testid="cards-empty-state">
      <div className="text-sm font-medium">Brak fiszek</div>
      <div className="mt-1 text-sm text-muted-foreground">Zmień filtry lub dodaj nową fiszkę.</div>
      <button
        type="button"
        className="mt-3 h-9 rounded-md border border-input bg-background px-3 text-sm"
        onClick={onRetry}
      >
        Odśwież
      </button>
    </div>
  );
}

export function CardsContent(props: CardsContentProps) {
  const {
    list,
    isLoading,
    error,
    onRetry,
    pagination,
    isBusy,
    onPageChange,
    onLimitChange,
    deleteState,
    onDeleteRequest,
    onDeleteCancel,
    onDeleteConfirm,
  } = props;

  if (error) return <ErrorBanner error={error} onRetry={onRetry} />;

  if (isLoading) {
    return (
      <div className="rounded-md border p-6">
        <div className="text-sm text-muted-foreground">Ładowanie fiszek…</div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="rounded-md border p-6">
        <div className="text-sm text-muted-foreground">Brak danych do wyświetlenia.</div>
      </div>
    );
  }

  if (list.cards.length === 0) return <EmptyState onRetry={onRetry} />;

  return (
    <section className="rounded-md border p-4">
      Wyświetlonych fiszek: {list.cards.length} z {list.pagination.total_items}
      <CardGrid
        cards={list.cards}
        deleteState={deleteState}
        onDeleteRequest={onDeleteRequest}
        onDeleteCancel={onDeleteCancel}
        onDeleteConfirm={onDeleteConfirm}
      />
      {pagination && (
        <div className="-mx-1 -mt-1">
          <PaginationControls
            page={pagination.page}
            limit={pagination.limit}
            totalPages={pagination.total_pages}
            totalItems={pagination.total_items}
            isBusy={isBusy}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </div>
      )}
    </section>
  );
}
