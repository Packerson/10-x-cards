import { Button } from "@/components/ui/button";
import type { BulkActionsProps } from "./types";

export function BulkActions({ acceptedCount, onBulkAction, onSave, isSaving }: BulkActionsProps) {
  const hasAccepted = acceptedCount > 0;

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="proposal-bulk-actions">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onBulkAction("accept_all")}
        data-testid="proposal-accept-all"
      >
        <svg className="mr-1.5 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Zaakceptuj wszystkie
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onBulkAction("reject_all")}
        data-testid="proposal-reject-all"
      >
        <svg className="mr-1.5 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Odrzuć wszystkie
      </Button>

      <div className="ml-auto">
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={!hasAccepted || isSaving}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="proposal-save-accepted"
        >
          {isSaving ? (
            <>
              <svg className="mr-1.5 size-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Zapisz zaakceptowane ({acceptedCount})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
