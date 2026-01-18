import type { CardSource } from "@/types"
import type { GenerationOptionVM } from "./types"
import { Button } from "@/components/ui/button"

export interface CardsHeaderProps {
  search: string
  isBusy?: boolean
  source?: CardSource
  generationId?: number
  generationOptions: GenerationOptionVM[]
  isLoadingGenerations?: boolean
  generationsError?: string | null
  onSearchChange: (term: string) => void
  onSourceChange: (source?: CardSource) => void
  onGenerationIdChange: (generationId?: number) => void
  onOpenCreateModal: () => void
}

export function CardsHeader(props: CardsHeaderProps) {
  const {
    search,
    isBusy,
    source,
    generationId,
    generationOptions,
    isLoadingGenerations,
    generationsError,
    onSearchChange,
    onSourceChange,
    onGenerationIdChange,
    onOpenCreateModal,
  } = props

  return (
    <section aria-label="Narzędzia listy fiszek" className="mb-6 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Moje fiszki</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wyszukuj i filtruj zapisane fiszki.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <label className="w-full min-w-0 sm:col-span-2 lg:col-span-5">
          <span className="sr-only">Szukaj po przodzie</span>
          <input
            type="search"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Szukaj po przodzie…"
            value={search}
            disabled={isBusy}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        <label className="min-w-0 sm:col-span-1 lg:col-span-2">
          <span className="text-sm text-muted-foreground">Źródło</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={source ?? ""}
            disabled={isBusy}
            onChange={(e) => onSourceChange((e.target.value || undefined) as CardSource | undefined)}
          >
            <option value="">Wszystkie</option>
            <option value="manual">manual</option>
            <option value="ai_created">ai_created</option>
            <option value="ai_edited">ai_edited</option>
          </select>
        </label>

        <label className="min-w-0 sm:col-span-1 lg:col-span-3">
          <span className="text-sm text-muted-foreground">Generacja</span>
          <select
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={generationId ?? ""}
            disabled={isBusy || isLoadingGenerations}
            onChange={(e) => {
              const raw = e.target.value
              onGenerationIdChange(raw ? Number(raw) : undefined)
            }}
          >
            <option value="">Wszystkie</option>
            {generationOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2 lg:col-span-2 lg:flex lg:justify-end">
          <Button
            type="button"
            size="lg"
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={isBusy}
            onClick={onOpenCreateModal}
          >
            Dodaj fiszkę
          </Button>
        </div>
      </div>

      {generationsError && (
        <div role="alert" className="text-sm text-destructive">
          {generationsError}
        </div>
      )}
    </section>
  )
}

