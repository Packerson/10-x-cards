import { useEffect, useMemo, useState } from "react";

const MAX_FRONT = 200;
const MAX_BACK = 500;

export interface CreateCardDraft {
  front: string;
  back: string;
}

export interface CreateCardModalProps {
  open: boolean;
  isSubmitting?: boolean;
  serverError?: string | null;
  frontError?: string | null;
  onClose: () => void;
  onSubmit: (draft: CreateCardDraft) => Promise<void>;
}

function validateFront(value: string): string | null {
  const v = value.trim();
  if (v.length < 1) return "Przód jest wymagany.";
  if (v.length > MAX_FRONT) return `Przód może mieć maksymalnie ${MAX_FRONT} znaków.`;
  return null;
}

function validateBack(value: string): string | null {
  const v = value.trim();
  if (v.length < 1) return "Tył jest wymagany.";
  if (v.length > MAX_BACK) return `Tył może mieć maksymalnie ${MAX_BACK} znaków.`;
  return null;
}

export function CreateCardModal(props: CreateCardModalProps) {
  const { open, isSubmitting, serverError, frontError, onClose, onSubmit } = props;

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [localFrontError, setLocalFrontError] = useState<string | null>(null);
  const [localBackError, setLocalBackError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    return validateFront(front) === null && validateBack(back) === null;
  }, [front, back, isSubmitting]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-card-title"
      data-testid="create-card-modal"
    >
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="create-card-title" className="text-lg font-semibold text-foreground">
              Dodaj fiszkę
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Uzupełnij przód i tył. Zamknięcie: przycisk lub ESC.</p>
          </div>
          <button
            type="button"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onClick={onClose}
            disabled={isSubmitting}
            data-testid="create-card-close"
          >
            Zamknij
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const fe = validateFront(front);
            const be = validateBack(back);
            setLocalFrontError(fe);
            setLocalBackError(be);
            if (fe || be) return;
            await onSubmit({ front, back });
          }}
        >
          <div>
            <label className="text-sm font-medium text-foreground">
              Przód{" "}
              <span className="text-muted-foreground">
                ({front.length}/{MAX_FRONT})
              </span>
            </label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={front}
              disabled={isSubmitting}
              maxLength={MAX_FRONT + 50}
              data-testid="create-card-front-input"
              onChange={(e) => {
                setFront(e.target.value);
                setLocalFrontError(null);
              }}
            />
            {(frontError || localFrontError) && (
              <div role="alert" className="mt-1 text-sm text-destructive">
                {frontError ?? localFrontError}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">
              Tył{" "}
              <span className="text-muted-foreground">
                ({back.length}/{MAX_BACK})
              </span>
            </label>
            <textarea
              className="mt-1 min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={back}
              disabled={isSubmitting}
              maxLength={MAX_BACK + 100}
              data-testid="create-card-back-input"
              onChange={(e) => {
                setBack(e.target.value);
                setLocalBackError(null);
              }}
            />
            {localBackError && (
              <div role="alert" className="mt-1 text-sm text-destructive">
                {localBackError}
              </div>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="create-card-cancel"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={!canSubmit}
              data-testid="create-card-submit"
            >
              {isSubmitting ? "Dodawanie..." : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
