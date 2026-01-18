## Plan implementacji widoku „Moje fiszki” (`/cards`)

## 1. Przegląd
Widok „Moje fiszki” pozwala użytkownikowi:
- przeglądać zapisane fiszki w układzie grid z paginacją,
- filtrować po `source` i `generation_id`,
- wyszukiwać po treści `front` (z debounce),
- tworzyć nową fiszkę ręcznie,
- edytować fiszkę inline,
- usuwać fiszkę z potwierdzeniem inline (timeout 5s).

Widok mapuje się na API `GET/POST /api/cards` oraz `GET/PATCH/DELETE /api/cards/{id}` i ma działać w stacku: Astro 5 + React 19 + Tailwind 4 + shadcn/ui.

**Ustalenia i ryzyka (na bazie obecnego backendu):**
- **Auth / 401**: gdy backend zacznie zwracać `401`, UI na `/cards` wykonuje **redirect do widoku logowania** (patrz sekcja “Obsługa błędów” → `401`).
- **Filtr `generation_id`**: w UI jest **dropdown**, zasilany listą generacji z `GET /api/generations` (patrz sekcja “Integracja API”).
- **Kody walidacji**: backend obecnie zwraca:
  - `GET /api/cards`: `400` dla błędnych query,
  - `POST /api/cards`: `422` dla walidacji body i `422` dla `duplicate_front`,
  - `PATCH /api/cards/{id}`: `400` walidacja body/JSON, `409` dla `duplicate_front`,
  - `DELETE /api/cards/{id}`: `400` dla błędnego `id`.
  UI powinno mapować te statusy, bez zakładania jednego „422 na wszystko”.
  - Dodatkowo: `GET /api/generations` zwraca `400` dla błędnych query, `500` dla błędów serwera.

## 2. Routing widoku
- **Ścieżka**: `/cards`
- **Strona Astro**: `src/pages/cards.astro` (analogicznie do `src/pages/generate.astro`)
  - użyć `Layout` i osadzić komponent React widoku z `client:load`.

## 3. Struktura komponentów
Proponowana struktura w `src/components/cards/*` (React) + `src/pages/cards.astro` (Astro).

**Reużycie komponentów z widoku `/generate` (rekomendowane):**
- W `src/components/generate` istnieją komponenty, które są “common” i warto je współdzielić zamiast duplikować:
  - `LoadingOverlay` (uniwersalny overlay z message),
  - `CharacterCounter` (uniwersalny licznik znaków z progami).
- Rekomendacja struktury:
  - `src/components/common/` — współdzielone komponenty React (nie shadcn),
  - `src/components/hooks/` — współdzielone hooki (zgodnie z zasadami projektu),
  - `src/components/ui/` — tylko shadcn/ui (bez customów).
- Plan refaktoru (w ramach wdrożenia widoku `/cards`):
  - przenieść `src/components/generate/LoadingOverlay.tsx` → `src/components/common/LoadingOverlay.tsx`,
  - przenieść `src/components/generate/CharacterCounter.tsx` → `src/components/common/CharacterCounter.tsx`,
  - zaktualizować importy w `/generate` i użyć tych samych komponentów w `/cards`.
  - `ErrorMessage` z `/generate` jest obecnie silnie specyficzny (`GenerateErrorType`); zamiast go przenosić 1:1, lepiej:
    - stworzyć nowy, generyczny `ErrorBanner` (dla `/cards`) i ewentualnie później zunifikować oba widoki.

Wysokopoziomowe drzewo komponentów:

- `CardsPage` (Astro: `src/pages/cards.astro`)
  - `CardsView` (React, `client:load`)
    - `CardsHeader`
      - `SearchInput` (debounce 300ms)
      - `FilterBar` (`source`, `generation_id`)
      - `CreateCardButton`
    - `CardsContent`
      - `LoadingOverlay` (gdy ładowanie listy)
      - `ErrorBanner` (błędy globalne listy)
      - `EmptyState` (gdy brak wyników)
      - `CardGrid`
        - `FlashCard` (xN)
          - `CardFront`
          - `CardBack` (truncate + “Pokaż więcej”)
          - `SourceBadge`
          - `CardMeta` (data utworzenia)
          - `CardActions`
            - `InlineEditor` (tryb edycji)
            - `InlineDeleteConfirmation` (timeout 5s)
    - `PaginationControls` (page + limit 10/25/50 + sort/order opcjonalnie)
    - `CreateCardModal` (formularz tworzenia ręcznej fiszki)

## 4. Szczegóły komponentów

### `CardsView`
- **Opis komponentu**: kontener widoku, trzyma stan query, wynik listy, oraz koordynuje create/edit/delete.
- **Główne elementy**:
  - `<main>` jako landmark,
  - sekcja nagłówka (search/filtry/CTA),
  - sekcja grid + stany (loading/error/empty),
  - paginacja,
  - modal tworzenia.
- **Obsługiwane zdarzenia**:
  - `onSearchChange(term)`: aktualizacja query + reset `page=1`,
  - `onFilterChange(...)`: aktualizacja query + reset `page=1`,
  - `onPageChange(page)`, `onLimitChange(limit)`,
  - `onCreateSubmit(front, back)`,
  - `onCardEditSubmit(cardId, patch)`,
  - `onCardDeleteConfirm(cardId)`.
- **Warunki walidacji (UI)**:
  - spójne z backendem: `front` trim, 1..200; `back` trim, 1..500,
  - dla edycji: wymagane co najmniej jedno pole (`front` lub `back`) po trim.
- **Typy**:
  - DTO: `CardsListResponseDTO`, `CardDTO`, `CardDetailDTO`, `CreateCardsResultDTO`, `DeleteCardResultDTO`,
  - ViewModel: `CardsQueryState`, `CardsListVM`, `CardVM`, `EditDraftVM`, `CreateCardDraftVM`, `InlineDeleteState`.
- **Props (interfejs)**: brak (root widoku).

### `CardsHeader`
- **Opis komponentu**: pasek narzędzi nad listą (search + filtry + CTA).
- **Główne elementy**:
  - `<section aria-label="Narzędzia listy fiszek">`,
  - input search,
  - select source,
  - dropdown `generation_id` (zasilany listą generacji),
  - przycisk „Dodaj fiszkę”.
- **Obsługiwane zdarzenia**:
  - `onSearchChange(term: string)`,
  - `onSourceChange(source?: CardSource)`,
  - `onGenerationIdChange(generationId?: number)`,
  - `onOpenCreateModal()`.
- **Walidacja (UI)**:
  - `search`: trim, min 1 (gdy niepuste), max 200; pusty string oznacza „brak filtra”,
  - `generation_id`: wybór z dropdown lub “Wszystkie” (brak filtra).
- **Typy**:
  - `CardSource` (z `src/types.ts`),
  - `CardsQueryState`.
- **Props**:

```ts
export interface CardsHeaderProps {
  query: CardsQueryState
  isBusy?: boolean
  onSearchChange: (term: string) => void
  onSourceChange: (source?: CardSource) => void
  onGenerationIdChange: (generationId?: number) => void
  onOpenCreateModal: () => void
}
```

### `SearchInput`
- **Opis komponentu**: kontrolowany input z debounce 300ms; aktualizuje query w rodzicu.
- **Główne elementy**: `<input type="search">` + opcjonalny przycisk “Wyczyść”.
- **Obsługiwane zdarzenia**:
  - `onChange` (lokalny stan natychmiast),
  - `onDebouncedChange` po 300ms,
  - `onClear`.
- **Walidacja (UI)**:
  - do API wysyłać `search` tylko gdy po `trim()` ma długość ≥ 1.
- **Typy**: `string`.
- **Props**:

```ts
export interface SearchInputProps {
  value: string
  isBusy?: boolean
  debounceMs?: number // default 300
  onChange: (value: string) => void // debounced output
}
```

### `FilterBar`
- **Opis komponentu**: zestaw filtrów: `source`, `generation_id` (+ opcjonalnie sort/order w przyszłości).
- **Główne elementy**:
  - `Select` (shadcn) dla `source`,
  - `Select` (shadcn) dla `generation_id` (dropdown),
  - stan ładowania opcji generacji (skeleton/spinner w select),
  - przycisk “Wyczyść filtry” (opcjonalnie).
- **Obsługiwane zdarzenia**:
  - `onSourceChange`,
  - `onGenerationIdChange`,
  - `onClearFilters`.
- **Walidacja (UI)**:
  - `generation_id`: tylko `int > 0` (z opcji) albo undefined (brak filtra).
- **Typy**: `CardSource`, `number | undefined`.
- **Props**:

```ts
export interface FilterBarProps {
  source?: CardSource
  generationId?: number
  isBusy?: boolean
  onSourceChange: (source?: CardSource) => void
  onGenerationIdChange: (generationId?: number) => void
  onClearFilters?: () => void
}
```

### `CardsContent`
- **Opis komponentu**: renderuje stany: loading/error/empty/sukces.
- **Główne elementy**:
  - `LoadingOverlay` (gdy `isLoading`),
  - `ErrorBanner` (gdy `error`),
  - `EmptyState` (gdy `data.length === 0`),
  - `CardGrid` (gdy są dane).
- **Obsługiwane zdarzenia**: przekazuje dalej edycję/usuwanie.
- **Walidacja**: brak (prezentacyjny).
- **Typy**: `CardsListVM`, `CardVM`.
- **Props**:

```ts
export interface CardsContentProps {
  list: CardsListVM | null
  isLoading: boolean
  error: CardsViewError | null
  onEdit: (cardId: number) => void
  onEditCancel: (cardId: number) => void
  onEditSubmit: (cardId: number, patch: UpdateCardCommand) => Promise<void>
  onDeleteRequest: (cardId: number) => void
  onDeleteCancel: (cardId: number) => void
  onDeleteConfirm: (cardId: number) => Promise<void>
}
```

### `CardGrid`
- **Opis komponentu**: responsywny grid 1–4 kolumn.
- **Główne elementy**:
  - `<section aria-label="Lista fiszek">`,
  - `<ul>` lub `<div>` grid z kartami.
- **Obsługiwane zdarzenia**: brak (delegacja do `FlashCard`).
- **Walidacja**: brak.
- **Typy**: `CardVM[]`.
- **Props**:

```ts
export interface CardGridProps {
  cards: CardVM[]
  onEdit: (cardId: number) => void
  onEditCancel: (cardId: number) => void
  onEditSubmit: (cardId: number, patch: UpdateCardCommand) => Promise<void>
  onDeleteRequest: (cardId: number) => void
  onDeleteCancel: (cardId: number) => void
  onDeleteConfirm: (cardId: number) => Promise<void>
}
```

### `FlashCard`
- **Opis komponentu**: pojedyncza fiszka z trybem podglądu i trybem edycji inline oraz akcjami.
- **Główne elementy**:
  - kontener “card” (shadcn `Card` lub własny div),
  - `front` jako nagłówek,
  - `back` jako treść z truncate i toggle,
  - badge `source`,
  - akcje: edytuj/usuń,
  - `InlineEditor` (warunkowo),
  - `InlineDeleteConfirmation` (warunkowo).
- **Obsługiwane zdarzenia**:
  - `onEdit`, `onEditCancel`, `onEditSubmit`,
  - `onDeleteRequest`, `onDeleteCancel`, `onDeleteConfirm`,
  - `onToggleBackExpanded`.
- **Walidacja (UI)**:
  - w trybie edycji: `front/back` jak w API (trim + długości), oraz co najmniej jedno pole zmienione / obecne (patrz `updateCardSchema`).
- **Typy**: `CardVM`, `EditDraftVM`, `InlineDeleteState`.
- **Props**:

```ts
export interface FlashCardProps {
  card: CardVM
  editDraft?: EditDraftVM
  deleteState?: InlineDeleteState
  onEdit: (cardId: number) => void
  onEditCancel: (cardId: number) => void
  onEditSubmit: (cardId: number, patch: UpdateCardCommand) => Promise<void>
  onDeleteRequest: (cardId: number) => void
  onDeleteCancel: (cardId: number) => void
  onDeleteConfirm: (cardId: number) => Promise<void>
}
```

### `InlineEditor`
- **Opis komponentu**: edycja `front/back` na karcie bez modala.
- **Główne elementy**:
  - `<form>` z:
    - input/textarea dla `front`,
    - textarea dla `back`,
    - przyciski: “Zapisz”, “Anuluj”.
- **Obsługiwane zdarzenia**:
  - `onChangeFront`, `onChangeBack`,
  - `onSubmit`,
  - `onCancel`.
- **Walidacja (szczegółowa, zgodnie z API)**:
  - `front`:
    - `trim()`,
    - jeśli wysyłane: min 1, max 200,
  - `back`:
    - `trim()`,
    - jeśli wysyłane: min 1, max 500,
  - **co najmniej jedno pole obecne** w patch (odpowiednik refine `at_least_one_field_required`),
  - rekomendacja UX: blokada “Zapisz”, jeśli po trim patch jest pusty.
- **Typy**: `UpdateCardCommand`, `EditDraftVM`.
- **Props**:

```ts
export interface InlineEditorProps {
  initialFront: string
  initialBack: string
  isSubmitting?: boolean
  serverError?: string | null
  onCancel: () => void
  onSubmit: (patch: UpdateCardCommand) => Promise<void>
}
```

### `InlineDeleteConfirmation`
- **Opis komponentu**: inline potwierdzenie usunięcia z timeout 5s (po czasie auto-anuluj).
- **Główne elementy**:
  - tekst ostrzegawczy,
  - przyciski: “Potwierdź”, “Anuluj”,
  - opcjonalny wizualny timer (progress).
- **Obsługiwane zdarzenia**:
  - `onConfirm`,
  - `onCancel`,
  - auto `onCancel` po 5s.
- **Walidacja**: brak.
- **Typy**: `InlineDeleteState`.
- **Props**:

```ts
export interface InlineDeleteConfirmationProps {
  timeoutMs?: number // default 5000
  isSubmitting?: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}
```

### `PaginationControls`
- **Opis komponentu**: paginacja + wybór limitu (10/25/50). Trzyma się metadanych z API.
- **Główne elementy**:
  - kontrolki page prev/next + numerowana paginacja,
  - select limit: 10/25/50,
  - informacja “X–Y z N”.
- **Obsługiwane zdarzenia**:
  - `onPageChange`,
  - `onLimitChange`.
- **Walidacja (UI)**:
  - `page >= 1`,
  - `limit` ∈ {10, 25, 50} (UI), ale backend dopuszcza 1..100.
- **Typy**: `PaginationMetadata` (z `src/types.ts`), `CardsQueryState`.
- **Props**:

```ts
export interface PaginationControlsProps {
  pagination: CardsListVM["pagination"]
  isBusy?: boolean
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}
```

### `CreateCardModal`
- **Opis komponentu**: modal tworzenia ręcznej fiszki (zamykany tylko przyciskiem).
- **Główne elementy**:
  - `Dialog` (shadcn) / własny modal,
  - `<form>` z polami “Przód” i “Tył”,
  - przyciski: “Dodaj”, “Anuluj/Zamknij”.
- **Obsługiwane zdarzenia**:
  - `onOpenChange` (ale zablokować zamykanie kliknięciem tła/ESC zgodnie z UX),
  - `onSubmit`,
  - `onClose`.
- **Walidacja (UI, zgodnie z API)**:
  - `front`: trim, 1..200,
  - `back`: trim, 1..500,
  - `source` dla ręcznej fiszki: zawsze `"manual"`,
  - wysyłamy `POST /api/cards` z `cards: [{ front, back, source: "manual" }]` (bez `generation_id`).
- **Typy**: `CreateCardsCommand`, `CreateCardDraftVM`.
- **Props**:

```ts
export interface CreateCardModalProps {
  open: boolean
  isSubmitting?: boolean
  serverError?: string | null
  onClose: () => void
  onSubmit: (draft: CreateCardDraftVM) => Promise<void>
}
```

### `EmptyState`
- **Opis komponentu**: pusty stan z CTA.
- **Główne elementy**:
  - opis + przycisk “Dodaj fiszkę”.
- **Obsługiwane zdarzenia**:
  - `onCreateClick`.
- **Walidacja**: brak.
- **Typy**: brak.
- **Props**:

```ts
export interface EmptyStateProps {
  onCreateClick: () => void
}
```

### `ErrorBanner`
- **Opis komponentu**: wyświetla błąd listy (np. 500, network).
- **Główne elementy**:
  - `<div role="alert">` z komunikatem,
  - przycisk “Spróbuj ponownie”.
- **Obsługiwane zdarzenia**:
  - `onRetry`.
- **Walidacja**: brak.
- **Typy**: `CardsViewError`.
- **Props**:

```ts
export interface ErrorBannerProps {
  error: CardsViewError
  onRetry: () => void
}
```

## 5. Typy

### Typy DTO (już istnieją, używane bez zmian)
Z `src/types.ts`:
- `CardDTO`: encja `cards` (lista z `GET /api/cards` zwraca `CardDTO[]`).
- `CardDetailDTO`: `{ id, front, back, source, created_at, updated_at }` (GET/PATCH po id).
- `CardsListQuery`: `{ page?, limit?, sort?, order?, source?, generation_id?, search? }`.
- `CardsListResponseDTO`: `{ data: CardDTO[], pagination: PaginationMetadata }`.
- `CreateCardsCommand`: `{ cards: CardCreatePayload[] }`.
- `CreateCardsResultDTO`: `{ inserted: number }`.
- `UpdateCardCommand`: `Pick<..., "front" | "back">` (częściowy patch).
- `DeleteCardResultDTO`: `{ id: number }`.
- `CardSource`: `"manual" | "ai_created" | "ai_edited"`.

### Nowe typy ViewModel (do utworzenia na froncie)

```ts
import type {
  CardDTO,
  CardsListResponseDTO,
  CardSource,
  UpdateCardCommand,
} from "@/types"
import type { ApiError } from "@/lib/api/api-error"

export type CardsQueryState = {
  page: number
  limit: number
  sort: "created_at" | "updated_at" | "front"
  order: "asc" | "desc"
  source?: CardSource
  generation_id?: number
  search: string // kontrolowane pole UI (puste = brak parametru w API)
}

export type CardsViewError =
  | { kind: "network"; message: string }
  | { kind: "unauthorized"; message: string; redirectTo: string }
  | { kind: "validation"; message: string; details?: unknown }
  | { kind: "server"; message: string; details?: unknown }
  | { kind: "unknown"; message: string; details?: unknown }

export type GenerationOptionVM = {
  id: number
  label: string
}

export type CardVM = CardDTO & {
  // UI-only
  backPreview: string
  isBackTruncated: boolean
}

export type CardsListVM = {
  cards: CardVM[]
  pagination: CardsListResponseDTO["pagination"]
}

export type EditDraftVM = {
  cardId: number
  front: string
  back: string
  isSubmitting: boolean
  error: string | null
}

export type InlineDeleteState = {
  cardId: number
  expiresAtMs: number
  isSubmitting: boolean
  error: string | null
}

export type CreateCardDraftVM = {
  front: string
  back: string
}

// Ujednolicone mapowanie ApiError -> CardsViewError (na potrzeby UI).
export type MapApiErrorFn = (err: unknown) => CardsViewError
```

**Uwagi do VM:**
- `backPreview` i `isBackTruncated` liczyć w UI (np. `back.slice(0, 100)`); logika powinna być deterministyczna i testowalna (funkcja util).
- `CardsQueryState.search` trzyma surowy input, ale do API wysyłać tylko `trim()` i tylko gdy długość ≥ 1.
- Dla `EditDraftVM`: UI powinno wysłać patch tylko dla pól, które mają być zmienione (po trim). To zmniejsza ryzyko “at_least_one_field_required”.

## 6. Zarządzanie stanem
Rekomendacja: jeden główny custom hook (logika widoku) + pomocnicze hooki dla debounce i timeout.

### `useCardsView` (custom hook)
Cel: trzyma stan query, listy, loading/error, i udostępnia akcje.
- **Stan**:
  - `query: CardsQueryState`,
  - `list: CardsListVM | null`,
  - `isLoading: boolean`,
  - `error: CardsViewError | null`,
  - `generationOptions: GenerationOptionVM[]` (opcje do dropdown `generation_id`),
  - `isLoadingGenerations: boolean`,
  - `generationsError: CardsViewError | null` (opcjonalnie; można zwinąć do toastów),
  - `createModalOpen: boolean`,
  - `editDrafts: Map<number, EditDraftVM>` (lub `Record<number, EditDraftVM>`),
  - `deleteState: InlineDeleteState | null`.
- **Efekty**:
  - fetch listy po zmianie `query` (z debounce dla `search` lub osobno z `SearchInput`),
  - `AbortController` dla anulowania poprzednich requestów na listę.
- **Efekty (dropdown generacji)**:
  - przy mount: fetch listy generacji do dropdown (`GET /api/generations`, np. `limit=100`, `order=desc`),
  - mapowanie na `GenerationOptionVM` (np. label z `created_at` + skrócony `prompt_text`).
- **Synchronizacja z URL** (wymóg UX: “stan wyszukiwania zachowany przy zmianie strony”):
  - zapisywać `page/limit/source/generation_id/search/sort/order` do `window.history.replaceState` jako query string,
  - przy mount: zainicjalizować `query` z URL (z fallback na defaulty).
- **Obsługa auth**:
  - jeśli listowanie kart (`GET /api/cards`) zwróci `401`, hook powinien wykonać redirect do login (patrz “Obsługa błędów”).

### `useDebouncedValue` (pomocniczy hook)
Do `SearchInput`: `value -> debouncedValue` po 300ms.

### `useTimeout` / `useAutoCancelDelete`
Do `InlineDeleteConfirmation`: odpala timer 5s i auto-anuluje.

### `useGenerationsOptions` (pomocniczy hook, opcjonalny)
Jeśli nie chcemy rozpychać `useCardsView`, można wydzielić logikę dropdownu do `src/components/hooks/useGenerationsOptions.ts`:
- fetch `GET /api/generations` (pierwsza strona, `limit=100`),
- mapowanie na `GenerationOptionVM[]`,
- zwrot `{ options, isLoading, error, refetch }`.

## 7. Integracja API
Wykorzystać istniejący wzorzec w `src/lib/api/cards.ts` oraz `ApiError` (`src/lib/api/api-error.ts`).

### Wymagane wywołania
0) **Źródło danych do dropdown `generation_id`**: `GET /api/generations`
- **Cel**: wypełnienie dropdownu listą generacji (np. ostatnie 100).
- **Request (query)**: `GenerationsListQuery` (z `src/types.ts`), np. `page=1&limit=100&sort=created_at&order=desc`
- **Response 200**: `GenerationsListResponseDTO`
- **Błędy**:
  - `400 { error:"validation_error", details }`,
  - `500 { error:"server_error", details }`,
  - (docelowo) `401 { error:"unauthorized" }`.

1) **Listowanie**: `GET /api/cards`
- **Request (query)**: `CardsListQuery`
  - mapowanie z `CardsQueryState`:
    - `page`, `limit`, `sort`, `order` zawsze,
    - `source`, `generation_id` tylko gdy ustawione,
    - `search` tylko gdy `trim().length >= 1`.
- **Response 200**: `CardsListResponseDTO`
- **Błędy**:
  - `400 { error:"validation_error", details }` – błędne query,
  - `500 { error:"server_error", details }`,
  - (docelowo) `401 { error:"unauthorized" }` – jeśli auth.

2) **Tworzenie ręcznej fiszki**: `POST /api/cards`
- **Request body**: `CreateCardsCommand`
  - wysyłamy dokładnie 1 element:
    - `{ front, back, source: "manual" }`
- **Response 201**: `CreateCardsResultDTO`
- **Błędy**:
  - `400 { error:"generation_id_required" }` – nie powinno wystąpić dla `"manual"` (ale UI powinno obsłużyć),
  - `404 { error:"generation_not_found" }` – nie powinno wystąpić dla `"manual"`,
  - `422 { error:"validation_error", details }` – walidacja body,
  - `422 { error:"duplicate_front" }` – konflikt unikalności `front` per user,
  - `500 { error:"server_error", details }`.

3) **Pobranie szczegółu (opcjonalne w tym widoku)**: `GET /api/cards/{id}`
- W tym widoku można pominąć, bo lista ma `CardDTO` z pełnymi polami (wg `CardDTO = CardEntity`), ale:
  - jeśli backend/kontrakt się zmieni, można doładowywać szczegół przy edycji.

4) **Edycja**: `PATCH /api/cards/{id}`
- **Request body**: `UpdateCardCommand`
  - wysyłać tylko pola zmieniane, po trim.
- **Response 200**: `CardDetailDTO`
- **Błędy**:
  - `400 { error:"validation_error", details }` – invalid JSON / body / invalid_input,
  - `404 { error:"not_found" }`,
  - `409 { error:"duplicate_front" }` – duplikat `front`,
  - `500 { error:"server_error", details }`.

5) **Usuwanie**: `DELETE /api/cards/{id}`
- **Response 200**: `DeleteCardResultDTO` (`{ id }`)
- **Błędy**:
  - `400 { error:"validation_error", details }` – złe id,
  - `404 { error:"not_found" }`,
  - `500 { error:"server_error", details }`.

### Zalecane zmiany w kliencie API (frontend)
Rozszerzyć `src/lib/api/cards.ts` o funkcje (wzorzec jak `createCards`):
- `listCards(query: CardsListQuery): Promise<CardsListResponseDTO>`
- `updateCard(id: number, patch: UpdateCardCommand): Promise<CardDetailDTO>`
- `deleteCard(id: number): Promise<DeleteCardResultDTO>`
Opcjonalnie:
- `getCardById(id: number): Promise<CardDetailDTO>`

Rozszerzyć `src/lib/api/generations.ts` o funkcję (analogicznie do `createGeneration`):
- `listGenerations(query: GenerationsListQuery): Promise<GenerationsListResponseDTO>`

Każda funkcja:
- łapie błędy sieciowe i rzuca `ApiError(0, "network_error", ...)`,
- parsuje body błędu `{ error, details }` i mapuje przez `ApiError.fromResponse`.

## 8. Interakcje użytkownika
1) **Wejście na `/cards`**
- UI odczytuje query z URL (jeśli istnieje) i odpala `GET /api/cards`.
- Pokazuje skeleton/loading overlay.
- Jeśli API zwróci `401`, UI wykonuje redirect do login.

2) **Wyszukiwanie po `front`**
- Użytkownik wpisuje w `SearchInput`.
- Po 300ms bez zmian:
  - update `query.search`,
  - reset `query.page = 1`,
  - fetch listy.
- Wyniki aktualizują grid; brak wyników -> `EmptyState` z CTA.

3) **Filtr source**
- Zmiana select `source`:
  - update `query.source`,
  - reset `page=1`,
  - fetch listy.

4) **Filtr generation_id**
- UI ładuje opcje dropdownu z `GET /api/generations` (np. ostatnie 100).
- Użytkownik wybiera `generation_id` z dropdown (albo “Wszystkie”):
  - update `query.generation_id` (lub `undefined`),
  - reset `page=1`,
  - fetch listy.

5) **Paginacja**
- Klik “następna/poprzednia/konkretna strona”:
  - update `query.page`,
  - fetch listy,
  - zachować `search`/filtry (wymóg UX).

6) **Zmiana limitu (10/25/50)**
- update `query.limit`,
- reset `page=1`,
- fetch listy.

7) **Dodanie nowej fiszki**
- Klik “Dodaj fiszkę” -> otwarcie `CreateCardModal`.
- Submit:
  - walidacja lokalna,
  - `POST /api/cards` z `source:"manual"`,
  - sukces: toast + zamknięcie modala + odświeżenie listy (albo optymistyczne dopisanie na górze jeśli sort `created_at desc`),
  - błąd `duplicate_front`: błąd przy polu `front`,
  - inne: toast + wiadomość w modalu.

8) **Edycja inline**
- Klik “Edytuj” na karcie -> `InlineEditor` w obrębie tej karty.
- Submit:
  - walidacja lokalna,
  - `PATCH /api/cards/{id}`,
  - sukces: toast + aktualizacja karty w liście (w tym `source` może zmienić się na `ai_edited` jeśli wcześniej `ai_created`),
  - `409 duplicate_front`: komunikat “Masz już fiszkę o takim przodzie” (w edytorze),
  - `404`: toast “Fiszka nie istnieje” + odśwież listę.

9) **Usuwanie z potwierdzeniem**
- Klik “Usuń” -> pokaz `InlineDeleteConfirmation` i start timeout 5s.
- Klik “Potwierdź”:
  - `DELETE /api/cards/{id}`,
  - sukces: toast + usunięcie z listy (optymistycznie po sukcesie; ewentualnie przed sukcesem z rollbackiem),
  - `404`: toast i odśwież listę,
  - `500/network`: pokaż błąd w inline-confirmation (umożliwić retry).
- Auto-anulowanie po 5s: wraca do stanu normalnego.

## 9. Warunki i walidacja
Walidacja po stronie UI powinna odzwierciedlać Zod backendu (`src/lib/validators/cards.ts`) i zachowania endpointów.

### Warunki dla query listy (`GET /api/cards`)
- `page`: int >= 1 (default 1).
- `limit`: int 1..100 (UI: preferowane 10/25/50).
- `sort`: `"created_at" | "updated_at" | "front"`.
- `order`: `"asc" | "desc"`.
- `source`: `"manual" | "ai_created" | "ai_edited"`.
- `generation_id`: int > 0.
- `search`: string trim min 1 max 200 (pusty => nie wysyłać parametru).

### Warunki dla tworzenia (`POST /api/cards`)
- `cards` array: 1..100 (UI użyje 1).
- `front`: trim, 1..200.
- `back`: trim, 1..500.
- `source`: `"manual"` dla ręcznego tworzenia.
- Unikalność: `front` unikalny per user:
  - backend: `422 { error:"duplicate_front" }`,
  - UI: pokazać komunikat przy `front`.

### Warunki dla edycji (`PATCH /api/cards/{id}`)
- `id`: int > 0.
- JSON poprawny (w innym wypadku backend: `400 validation_error invalid_json`).
- Body:
  - `front?`: trim, 1..200,
  - `back?`: trim, 1..500,
  - **co najmniej jedno pole obecne** (refine `at_least_one_field_required`).
- Unikalność `front`:
  - backend: `409 { error:"duplicate_front" }`.

### Warunki dla usuwania (`DELETE /api/cards/{id}`)
- `id`: int > 0 (inaczej `400 validation_error`).

## 10. Obsługa błędów
Źródła błędów: `ApiError` z `src/lib/api/api-error.ts` + walidacje lokalne.

### Mapowanie błędów API -> UX
- **Network (`ApiError.status === 0` / `errorCode === "network_error"`)**:
  - globalnie: `ErrorBanner` z “Brak połączenia”, retry.
  - w modalu/edytorze: komunikat inline + retry.
- **Validation (`errorCode === "validation_error"`)**:
  - dla form: mapować na pola (jeśli `details` jest formatem zod) lub pokazać ogólny komunikat,
  - dla listy (400): traktować jako “błędny filtr” i zresetować query do bezpiecznych wartości (opcjonalnie) + toast.
- **Duplicate**:
  - `POST 422 duplicate_front`: błąd pola `front` w `CreateCardModal`,
  - `PATCH 409 duplicate_front`: błąd pola `front` w `InlineEditor`.
- **Not found (`404 not_found`)**:
  - toast “Fiszka nie istnieje lub została usunięta” + odśwież listę.
- **Server (`500 server_error`)**:
  - globalnie: `ErrorBanner` + retry,
  - lokalnie (create/edit/delete): toast + zachować UI umożliwiające ponowienie.
- **Unauthorized (`401`)** (docelowo / po wdrożeniu auth):
  - **redirect do login** (jedno zachowanie, bez alternatyw).
  - implementacyjnie: centralnie w mapowaniu `ApiError -> CardsViewError`, a potem w `useCardsView` wykonać nawigację do `redirectTo`.

### Toasty
Użyć `sonner` (już podłączone w `Layout.astro` przez `Toaster`):
- sukces create/edit/delete,
- błąd network/server/not_found.

## 11. Kroki implementacji
1) **Ustalić stałe/konfigurację pod redirect**:
   - ścieżka logowania (np. `LOGIN_PATH`) i sposób nawigacji (pełny redirect vs client-side).
2) **Routing**:
   - dodać `src/pages/cards.astro` (analogicznie do `generate.astro`) i osadzić `CardsView client:load`.
3) **Rozbudować klienta API**:
   - dopisać w `src/lib/api/cards.ts`: `listCards`, `updateCard`, `deleteCard` (i opcjonalnie `getCardById`) zgodnie z istniejącym `createCards` + `ApiError`.
   - dopisać w `src/lib/api/generations.ts`: `listGenerations` (żeby zasilić dropdown `generation_id`).
4) **Zaprojektować i dodać typy ViewModel**:
   - utworzyć plik np. `src/components/cards/types.ts` z `CardsQueryState`, `CardVM`, `CardsListVM`, stanami edycji/usuwania.
5) **Wydzielić/urealnić współdzielenie komponentów z `/generate`**:
   - przenieść `LoadingOverlay` i `CharacterCounter` do `src/components/common/` i zaktualizować importy w `/generate`,
   - użyć tych komponentów w `/cards` (bez duplikowania kodu).
6) **Zaimplementować hook `useCardsView`**:
   - inicjalizacja query z URL,
   - fetch listy z `AbortController`,
   - fetch opcji `generation_id` z `GET /api/generations`,
   - akcje create/edit/delete z obsługą statusów (422/409/404/500/network).
7) **Zbudować komponenty UI**:
   - `CardsHeader` (SearchInput + FilterBar + CTA),
   - `CardsContent` (loading/error/empty),
   - `CardGrid` + `FlashCard`,
   - `InlineEditor` (walidacje, disabled “Zapisz” gdy patch pusty),
   - `InlineDeleteConfirmation` (timeout 5s),
   - `PaginationControls` (limit 10/25/50).
8) **Spójne walidacje w UI**:
   - wspólne utilsy: `trimAndValidateFront`, `trimAndValidateBack`, `buildUpdatePatch`,
   - spójne komunikaty błędów (dla `duplicate_front` i walidacji).
9) **UX i dostępność**:
   - `role="alert"` dla błędów,
   - focus management w modalu i w trybie inline edit,
   - przyciski z `aria-label` w akcjach kart,
   - “Pokaż więcej” dla `back` z `aria-expanded`.
10) **Test manualny (krótki, ale obowiązkowy)**:
   - listowanie: paginacja + filtry + search (debounce),
   - tworzenie: poprawne / `duplicate_front`,
   - edycja: poprawne / `duplicate_front` / anulowanie,
   - usuwanie: potwierdź/anuluj/timeout,
   - stany błędów: zasymulować brak sieci (devtools) i sprawdzić retry/toasty.

