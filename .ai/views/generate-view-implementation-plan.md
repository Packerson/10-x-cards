# Plan implementacji widoku Generowanie fiszek

## 1. Przegląd

Widok `/generate` umożliwia zalogowanemu użytkownikowi wygenerowanie propozycji fiszek na podstawie wklejonego tekstu (1000-10000 znaków). Po wysłaniu promptu do API, użytkownik otrzymuje listę propozycji fiszek, które może zaakceptować, edytować inline lub odrzucić. Zaakceptowane fiszki zapisywane są hurtowo do bazy danych. Widok jest domyślnym ekranem po zalogowaniu.

## 2. Routing widoku

| Atrybut | Wartość |
|---------|---------|
| Ścieżka | `/generate` |
| Plik strony | `src/pages/generate.astro` |
| Dostęp | Tylko zalogowani użytkownicy |
| Redirect | Niezalogowani → `/login` |

## 3. Struktura komponentów

```
GeneratePage (Astro)
└── GenerateView (React, client:load)
    ├── PromptForm
    │   ├── Textarea
    │   ├── CharacterCounter
    │   └── Button (Generuj)
    ├── LoadingOverlay (conditional)
    ├── ErrorMessage (conditional)
    └── ProposalSection (conditional - gdy są propozycje)
        ├── ProposalStats
        ├── ProposalList
        │   └── ProposalCard[] (mapped)
        │       ├── CardContent (wyświetlenie front/back)
        │       ├── CardEditForm (conditional - inline editing)
        │       └── CardActions (Akceptuj/Edytuj/Odrzuć)
        └── BulkActions
            ├── Button (Zaakceptuj wszystkie)
            ├── Button (Odrzuć wszystkie)
            └── Button (Zapisz zaakceptowane)
```

## 4. Szczegóły komponentów

### 4.1 GenerateView

- **Opis:** Główny kontener widoku generowania, zarządza stanem całego procesu generowania i zapisywania fiszek. Komponent React z `client:load`.
- **Główne elementy:** `<div>` z warunkowym renderowaniem sekcji formularza, loadera, błędów i propozycji.
- **Obsługiwane interakcje:**
  - Inicjalizacja stanu przy montowaniu
  - Obsługa sukcesu/błędu generowania
  - Obsługa sukcesu/błędu zapisywania
- **Typy:** `GenerateViewState`, `GenerationCreatedDTO`, `ProposalViewModel[]`
- **Propsy:** Brak (komponent root-level dla widoku)

### 4.2 PromptForm

- **Opis:** Formularz z polem tekstowym na prompt i przyciskiem "Generuj". Zawiera licznik znaków z wizualnym feedbackiem.
- **Główne elementy:**
  - `<form>` z `onSubmit`
  - `<textarea>` z `onChange`, `value`, `placeholder`
  - `CharacterCounter` - komponent licznika
  - `Button` (z Shadcn/ui) - przycisk submit
- **Obsługiwane interakcje:**
  - `onChange` na textarea → aktualizacja `promptText`
  - `onSubmit` formularza → wywołanie `onGenerate`
- **Obsługiwana walidacja:**
  - Długość tekstu: minimum 1000, maksimum 10000 znaków
  - Przycisk "Generuj" `disabled` gdy tekst poza zakresem lub trwa ładowanie
- **Typy:** `PromptFormProps`
- **Propsy:**
  ```typescript
  interface PromptFormProps {
    promptText: string
    onPromptChange: (text: string) => void
    onSubmit: () => void
    isLoading: boolean
    isDisabled: boolean
  }
  ```

### 4.3 CharacterCounter

- **Opis:** Wyświetla aktualną liczbę znaków względem wymaganego zakresu. Zmienia kolor w zależności od stanu (czerwony poza zakresem, zielony w zakresie).
- **Główne elementy:**
  - `<span>` z dynamiczną klasą kolorystyczną
  - Tekst: `{current}/{max}` lub `{current} (min: {min})`
- **Obsługiwane interakcje:** Brak (komponent prezentacyjny)
- **Obsługiwana walidacja:** Wizualizacja stanu walidacji (kolor)
- **Typy:** `CharacterCounterProps`
- **Propsy:**
  ```typescript
  interface CharacterCounterProps {
    current: number
    min: number
    max: number
  }
  ```

### 4.4 LoadingOverlay

- **Opis:** Overlay z animacją ładowania, blokujący interakcję podczas wywołania API generowania.
- **Główne elementy:**
  - `<div>` z pozycjonowaniem absolutnym/fixed, tłem semi-transparent
  - Spinner/animacja ładowania
  - Opcjonalny tekst "Generowanie fiszek..."
- **Obsługiwane interakcje:** Blokowanie kliknięć (pointer-events: none na children)
- **Typy:** `LoadingOverlayProps`
- **Propsy:**
  ```typescript
  interface LoadingOverlayProps {
    message?: string
  }
  ```

### 4.5 ErrorMessage

- **Opis:** Wyświetla komunikat błędu z przyciskiem "Spróbuj ponownie". Obsługuje różne typy błędów z dedykowanymi komunikatami.
- **Główne elementy:**
  - `<div>` z klasą alertową (czerwone tło/ramka)
  - Ikona błędu
  - Tekst komunikatu
  - `Button` "Spróbuj ponownie"
- **Obsługiwane interakcje:**
  - `onClick` na przycisku retry → wywołanie `onRetry`
  - `onClick` na przycisku zamknięcia → wywołanie `onDismiss`
- **Typy:** `ErrorMessageProps`, `GenerateErrorType`
- **Propsy:**
  ```typescript
  interface ErrorMessageProps {
    errorType: GenerateErrorType
    errorMessage?: string
    onRetry?: () => void
    onDismiss?: () => void
  }
  ```

### 4.6 ProposalSection

- **Opis:** Kontener dla listy propozycji, statystyk i akcji zbiorczych. Renderowany tylko gdy są propozycje.
- **Główne elementy:**
  - `ProposalStats` - statystyki zaakceptowanych/odrzuconych
  - `ProposalList` - lista propozycji
  - `BulkActions` - przyciski akcji zbiorczych
- **Obsługiwane interakcje:** Delegowane do komponentów dzieci
- **Typy:** `ProposalSectionProps`
- **Propsy:**
  ```typescript
  interface ProposalSectionProps {
    proposals: ProposalViewModel[]
    generationId: number
    onProposalAction: (id: string, action: ProposalAction) => void
    onProposalEdit: (id: string, front: string, back: string) => void
    onBulkAction: (action: BulkActionType) => void
    onSave: () => void
    isSaving: boolean
  }
  ```

### 4.7 ProposalStats

- **Opis:** Wyświetla statystyki: ile propozycji zaakceptowano, ile odrzucono, ile oczekuje.
- **Główne elementy:**
  - `<div>` flex z trzema sekcjami
  - Ikony + liczby dla każdego stanu
- **Obsługiwane interakcje:** Brak (komponent prezentacyjny)
- **Typy:** `ProposalStatsProps`
- **Propsy:**
  ```typescript
  interface ProposalStatsProps {
    total: number
    accepted: number
    rejected: number
    pending: number
  }
  ```

### 4.8 ProposalList

- **Opis:** Lista propozycji fiszek w formie responsywnego gridu.
- **Główne elementy:**
  - `<div>` z grid layout (1-4 kolumny responsywnie)
  - Mapowanie `ProposalCard` dla każdej propozycji
- **Obsługiwane interakcje:** Delegowane do `ProposalCard`
- **Typy:** `ProposalListProps`
- **Propsy:**
  ```typescript
  interface ProposalListProps {
    proposals: ProposalViewModel[]
    onAction: (id: string, action: ProposalAction) => void
    onEdit: (id: string, front: string, back: string) => void
  }
  ```

### 4.9 ProposalCard

- **Opis:** Pojedyncza propozycja fiszki z wyświetleniem front/back oraz przyciskami akcji. Obsługuje tryb edycji inline.
- **Główne elementy:**
  - `<article>` z klasą karty
  - W trybie normalnym:
    - `CardContent` - wyświetlenie front/back
    - `CardActions` - przyciski Akceptuj/Edytuj/Odrzuć
  - W trybie edycji:
    - `CardEditForm` - formularz edycji
- **Obsługiwane interakcje:**
  - `onClick` Akceptuj → `onAction(id, 'accept')`
  - `onClick` Edytuj → przejście do trybu edycji
  - `onClick` Odrzuć → `onAction(id, 'reject')`
  - `onKeyDown` Enter (gdy focus na karcie, nie w edycji) → akceptuj
  - `onKeyDown` Escape → anuluj edycję
- **Obsługiwana walidacja:**
  - W trybie edycji: front ≤200 znaków, back ≤500 znaków
- **Typy:** `ProposalCardProps`, `ProposalViewModel`, `ProposalAction`
- **Propsy:**
  ```typescript
  interface ProposalCardProps {
    proposal: ProposalViewModel
    onAction: (action: ProposalAction) => void
    onEdit: (front: string, back: string) => void
  }
  ```

### 4.10 CardContent

- **Opis:** Wyświetlenie treści fiszki (przód i tył) w trybie tylko do odczytu.
- **Główne elementy:**
  - `<div>` z dwoma sekcjami
  - Label "Przód" + tekst front
  - Label "Tył" + tekst back
- **Obsługiwane interakcje:** Brak
- **Typy:** `CardContentProps`
- **Propsy:**
  ```typescript
  interface CardContentProps {
    front: string
    back: string
  }
  ```

### 4.11 CardEditForm

- **Opis:** Formularz inline do edycji propozycji fiszki z walidacją długości pól.
- **Główne elementy:**
  - `<form>` z `onSubmit`
  - `<input>` dla front z `CharacterCounter` (max 200)
  - `<textarea>` dla back z `CharacterCounter` (max 500)
  - `Button` "Zapisz" (submit)
  - `Button` "Anuluj"
- **Obsługiwane interakcje:**
  - `onChange` na polach → aktualizacja lokalnego stanu
  - `onSubmit` → wywołanie `onSave(front, back)`
  - `onClick` Anuluj → wywołanie `onCancel`
  - `onKeyDown` Escape → anuluj edycję
- **Obsługiwana walidacja:**
  - front: wymagane, max 200 znaków
  - back: wymagane, max 500 znaków
  - Przycisk "Zapisz" disabled gdy walidacja nie przechodzi
- **Typy:** `CardEditFormProps`
- **Propsy:**
  ```typescript
  interface CardEditFormProps {
    initialFront: string
    initialBack: string
    onSave: (front: string, back: string) => void
    onCancel: () => void
  }
  ```

### 4.12 CardActions

- **Opis:** Grupa przycisków akcji dla pojedynczej propozycji.
- **Główne elementy:**
  - `<div>` flex z trzema przyciskami
  - `Button` Akceptuj (ikona ✓, wariant success)
  - `Button` Edytuj (ikona ✏️, wariant outline)
  - `Button` Odrzuć (ikona ✗, wariant destructive)
- **Obsługiwane interakcje:**
  - `onClick` na każdym przycisku → wywołanie odpowiedniego handlera
- **Typy:** `CardActionsProps`
- **Propsy:**
  ```typescript
  interface CardActionsProps {
    status: ProposalStatus
    onAccept: () => void
    onEdit: () => void
    onReject: () => void
  }
  ```

### 4.13 BulkActions

- **Opis:** Sekcja z przyciskami akcji zbiorczych i zapisem zaakceptowanych fiszek.
- **Główne elementy:**
  - `<div>` flex z trzema przyciskami
  - `Button` "Zaakceptuj wszystkie"
  - `Button` "Odrzuć wszystkie"
  - `Button` "Zapisz zaakceptowane" (primary, disabled gdy brak zaakceptowanych)
- **Obsługiwane interakcje:**
  - `onClick` Zaakceptuj wszystkie → `onBulkAction('accept_all')`
  - `onClick` Odrzuć wszystkie → `onBulkAction('reject_all')`
  - `onClick` Zapisz → `onSave()`
- **Obsługiwana walidacja:**
  - "Zapisz zaakceptowane" disabled gdy `acceptedCount === 0` lub `isSaving`
- **Typy:** `BulkActionsProps`
- **Propsy:**
  ```typescript
  interface BulkActionsProps {
    acceptedCount: number
    pendingCount: number
    onBulkAction: (action: BulkActionType) => void
    onSave: () => void
    isSaving: boolean
  }
  ```

## 5. Typy

### 5.1 Typy z API (istniejące w `src/types.ts`)

```typescript
// Komenda tworzenia generacji
type CreateGenerationCommand = Pick<TablesInsert<"generations">, "prompt_text">

// Propozycja fiszki zwracana przez API
type CardProposalDTO = Pick<CardEntity, "front" | "back" | "source">

// Odpowiedź z POST /generations
type GenerationCreatedDTO = Pick<
  GenerationEntity,
  "id" | "prompt_text" | "total_generated" | "status"
> & {
  card_proposals: CardProposalDTO[]
}

// Payload pojedynczej karty do zapisu
type CardCreatePayload = Pick<
  TablesInsert<"cards">,
  "front" | "back" | "source" | "generation_id"
>

// Komenda tworzenia wielu kart
interface CreateCardsCommand {
  cards: CardCreatePayload[]
}

// Odpowiedź z POST /cards
interface CreateCardsResultDTO {
  inserted: number
}
```

### 5.2 Typy ViewModel (nowe dla widoku)

```typescript
// Status propozycji w UI
type ProposalStatus = "pending" | "accepted" | "rejected" | "editing"

// Akcja na pojedynczej propozycji
type ProposalAction = "accept" | "edit" | "reject" | "cancel_edit"

// Akcja zbiorcza
type BulkActionType = "accept_all" | "reject_all"

// Model propozycji z lokalnym stanem UI
interface ProposalViewModel {
  id: string                    // Lokalny UUID dla React keys
  front: string                 // Aktualna wartość (może być edytowana)
  back: string                  // Aktualna wartość (może być edytowana)
  originalFront: string         // Oryginalna wartość z API (do resetu)
  originalBack: string          // Oryginalna wartość z API (do resetu)
  source: CardSource            // "ai_created" | "ai_edited"
  status: ProposalStatus        // Stan w UI
}

// Typy błędów generowania
type GenerateErrorType = 
  | "validation_error"
  | "duplicate_prompt"
  | "server_error"
  | "network_error"
  | "save_error"

// Stan głównego widoku
interface GenerateViewState {
  promptText: string
  isGenerating: boolean
  isSaving: boolean
  error: { type: GenerateErrorType; message?: string } | null
  generationId: number | null
  proposals: ProposalViewModel[]
}
```

### 5.3 Typy propsów komponentów

```typescript
interface PromptFormProps {
  promptText: string
  onPromptChange: (text: string) => void
  onSubmit: () => void
  isLoading: boolean
  isDisabled: boolean
}

interface CharacterCounterProps {
  current: number
  min: number
  max: number
}

interface LoadingOverlayProps {
  message?: string
}

interface ErrorMessageProps {
  errorType: GenerateErrorType
  errorMessage?: string
  onRetry?: () => void
  onDismiss?: () => void
}

interface ProposalSectionProps {
  proposals: ProposalViewModel[]
  generationId: number
  onProposalAction: (id: string, action: ProposalAction) => void
  onProposalEdit: (id: string, front: string, back: string) => void
  onBulkAction: (action: BulkActionType) => void
  onSave: () => void
  isSaving: boolean
}

interface ProposalStatsProps {
  total: number
  accepted: number
  rejected: number
  pending: number
}

interface ProposalListProps {
  proposals: ProposalViewModel[]
  onAction: (id: string, action: ProposalAction) => void
  onEdit: (id: string, front: string, back: string) => void
}

interface ProposalCardProps {
  proposal: ProposalViewModel
  onAction: (action: ProposalAction) => void
  onEdit: (front: string, back: string) => void
}

interface CardContentProps {
  front: string
  back: string
}

interface CardEditFormProps {
  initialFront: string
  initialBack: string
  onSave: (front: string, back: string) => void
  onCancel: () => void
}

interface CardActionsProps {
  status: ProposalStatus
  onAccept: () => void
  onEdit: () => void
  onReject: () => void
}

interface BulkActionsProps {
  acceptedCount: number
  pendingCount: number
  onBulkAction: (action: BulkActionType) => void
  onSave: () => void
  isSaving: boolean
}
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useGenerateFlashcards`

Hook zarządza całym stanem widoku generowania fiszek:

```typescript
interface UseGenerateFlashcardsReturn {
  // Stan
  state: GenerateViewState
  
  // Computed values
  isPromptValid: boolean
  acceptedCount: number
  rejectedCount: number
  pendingCount: number
  
  // Akcje formularza
  setPromptText: (text: string) => void
  generateProposals: () => Promise<void>
  
  // Akcje propozycji
  handleProposalAction: (id: string, action: ProposalAction) => void
  handleProposalEdit: (id: string, front: string, back: string) => void
  handleBulkAction: (action: BulkActionType) => void
  
  // Zapis
  saveAcceptedCards: () => Promise<void>
  
  // Błędy
  dismissError: () => void
  retryLastAction: () => void
}
```

### 6.2 Struktura stanu

```typescript
const initialState: GenerateViewState = {
  promptText: "",
  isGenerating: false,
  isSaving: false,
  error: null,
  generationId: null,
  proposals: [],
}
```

### 6.3 Logika przejść stanu

1. **Generowanie:**
   - `setPromptText` → aktualizuje `promptText`
   - `generateProposals` → ustawia `isGenerating: true`, po odpowiedzi API:
     - Sukces: `isGenerating: false`, `generationId: id`, `proposals: mapped`
     - Błąd: `isGenerating: false`, `error: { type, message }`

2. **Akcje na propozycjach:**
   - `handleProposalAction('accept')` → status propozycji na `accepted`
   - `handleProposalAction('reject')` → status propozycji na `rejected`
   - `handleProposalAction('edit')` → status propozycji na `editing`
   - `handleProposalAction('cancel_edit')` → przywraca oryginalne wartości, status na poprzedni

3. **Edycja:**
   - `handleProposalEdit(id, front, back)` → aktualizuje `front`, `back`, ustawia `source: ai_edited`, status na `accepted`

4. **Akcje zbiorcze:**
   - `handleBulkAction('accept_all')` → wszystkie `pending` → `accepted`
   - `handleBulkAction('reject_all')` → wszystkie `pending` → `rejected`

5. **Zapis:**
   - `saveAcceptedCards` → ustawia `isSaving: true`, po odpowiedzi API:
     - Sukces: `isSaving: false`, czyszczenie propozycji, toast sukcesu
     - Błąd: `isSaving: false`, `error: { type: 'save_error', message }`

## 7. Integracja API

### 7.1 POST /api/generations

**Cel:** Utworzenie nowej generacji i pobranie propozycji fiszek.

**Request:**
```typescript
// Typ: CreateGenerationCommand
{
  "prompt_text": "string (1000-10000 znaków)"
}
```

**Response (201):**
```typescript
// Typ: GenerationCreatedDTO
{
  "id": 123,
  "prompt_text": "...",
  "status": "processing",
  "total_generated": 3,
  "card_proposals": [
    { "front": "...", "back": "...", "source": "ai_created" }
  ]
}
```

**Obsługa błędów:**
| Status | Typ błędu | Akcja w UI |
|--------|-----------|------------|
| 400 | `validation_error` | Wyświetl komunikat walidacji |
| 409 | `duplicate_prompt` | Wyświetl "Ten prompt był już użyty" |
| 500 | `server_error` | Wyświetl "Błąd serwera" z retry |

### 7.2 POST /api/cards

**Cel:** Bulk zapis zaakceptowanych fiszek.

**Request:**
```typescript
// Typ: CreateCardsCommand
{
  "cards": [
    {
      "front": "string ≤200",
      "back": "string ≤500",
      "source": "ai_created" | "ai_edited",
      "generation_id": 123
    }
  ]
}
```

**Response (201):**
```typescript
// Typ: CreateCardsResultDTO
{
  "inserted": 3
}
```

**Obsługa błędów:**
| Status | Typ błędu | Akcja w UI |
|--------|-----------|------------|
| 400 | `generation_id_required` | Błąd wewnętrzny (nie powinno wystąpić) |
| 404 | `generation_not_found` | Wyświetl "Generacja nie istnieje" |
| 422 | `duplicate_front` | Wyświetl "Fiszka o takim przodzie już istnieje" |
| 500 | `server_error` | Wyświetl "Błąd zapisu" z retry |

### 7.3 Funkcje fetch

```typescript
// src/lib/api/generations.ts
export async function createGeneration(
  command: CreateGenerationCommand
): Promise<GenerationCreatedDTO> {
  const response = await fetch("/api/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(response.status, error)
  }
  
  return response.json()
}

// src/lib/api/cards.ts
export async function createCards(
  command: CreateCardsCommand
): Promise<CreateCardsResultDTO> {
  const response = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(response.status, error)
  }
  
  return response.json()
}
```

## 8. Interakcje użytkownika

### 8.1 Generowanie fiszek

| Akcja użytkownika | Oczekiwany rezultat |
|-------------------|---------------------|
| Wpisanie tekstu w textarea | Aktualizacja licznika znaków, zmiana koloru |
| Tekst < 1000 znaków | Przycisk "Generuj" disabled, licznik czerwony |
| Tekst w zakresie 1000-10000 | Przycisk "Generuj" enabled, licznik zielony |
| Tekst > 10000 znaków | Przycisk "Generuj" disabled, licznik czerwony |
| Kliknięcie "Generuj" | Wyświetlenie LoadingOverlay, wywołanie API |
| Sukces generowania | Ukrycie loadera, wyświetlenie listy propozycji |
| Błąd generowania | Ukrycie loadera, wyświetlenie ErrorMessage |

### 8.2 Obsługa propozycji

| Akcja użytkownika | Oczekiwany rezultat |
|-------------------|---------------------|
| Kliknięcie ✓ (Akceptuj) | Karta oznaczona jako zaakceptowana (zielona ramka) |
| Kliknięcie ✏️ (Edytuj) | Karta przechodzi w tryb edycji inline |
| Kliknięcie ✗ (Odrzuć) | Karta oznaczona jako odrzucona (przekreślona/wyszarzona) |
| Enter na karcie (nie w edycji) | Akceptacja karty |
| Escape podczas edycji | Anulowanie edycji, powrót do oryginalnych wartości |
| Zapis edycji | Karta zaakceptowana z nową treścią, source = "ai_edited" |

### 8.3 Akcje zbiorcze

| Akcja użytkownika | Oczekiwany rezultat |
|-------------------|---------------------|
| "Zaakceptuj wszystkie" | Wszystkie pending → accepted |
| "Odrzuć wszystkie" | Wszystkie pending → rejected |
| "Zapisz zaakceptowane" (brak accepted) | Przycisk disabled |
| "Zapisz zaakceptowane" (są accepted) | Wywołanie POST /cards, po sukcesie toast |

### 8.4 Obsługa błędów

| Akcja użytkownika | Oczekiwany rezultat |
|-------------------|---------------------|
| "Spróbuj ponownie" przy błędzie generowania | Ponowne wywołanie POST /generations |
| "Spróbuj ponownie" przy błędzie zapisu | Ponowne wywołanie POST /cards |
| Zamknięcie komunikatu błędu | Ukrycie ErrorMessage |

## 9. Warunki i walidacja

### 9.1 Walidacja formularza promptu

| Warunek | Komponent | Efekt w UI |
|---------|-----------|------------|
| `promptText.length < 1000` | PromptForm, CharacterCounter | Przycisk disabled, licznik czerwony |
| `promptText.length > 10000` | PromptForm, CharacterCounter | Przycisk disabled, licznik czerwony |
| `1000 ≤ promptText.length ≤ 10000` | PromptForm, CharacterCounter | Przycisk enabled, licznik zielony |
| `isGenerating === true` | PromptForm | Przycisk disabled, textarea readonly |

### 9.2 Walidacja edycji propozycji

| Warunek | Komponent | Efekt w UI |
|---------|-----------|------------|
| `front.length === 0` | CardEditForm | Przycisk "Zapisz" disabled |
| `front.length > 200` | CardEditForm | Przycisk "Zapisz" disabled, licznik czerwony |
| `back.length === 0` | CardEditForm | Przycisk "Zapisz" disabled |
| `back.length > 500` | CardEditForm | Przycisk "Zapisz" disabled, licznik czerwony |

### 9.3 Walidacja akcji zbiorczych

| Warunek | Komponent | Efekt w UI |
|---------|-----------|------------|
| `acceptedCount === 0` | BulkActions | Przycisk "Zapisz" disabled |
| `isSaving === true` | BulkActions | Przycisk "Zapisz" disabled z loaderem |
| `pendingCount === 0` | BulkActions | "Zaakceptuj wszystkie" i "Odrzuć wszystkie" disabled |

## 10. Obsługa błędów

### 10.1 Błędy sieciowe

| Scenariusz | Obsługa |
|------------|---------|
| Brak połączenia | Wyświetl "Brak połączenia z siecią" z opcją retry |
| Timeout | Wyświetl "Przekroczono limit czasu" z opcją retry |
| Nieoczekiwany błąd fetch | Wyświetl ogólny komunikat z opcją retry |

### 10.2 Błędy API - POST /generations

| Status | Komunikat użytkownika |
|--------|----------------------|
| 400 (validation_error) | "Tekst musi mieć od 1000 do 10000 znaków" |
| 409 (duplicate_prompt) | "Ten prompt był już użyty. Zmień treść i spróbuj ponownie." |
| 500 (server_error) | "Wystąpił błąd serwera. Spróbuj ponownie później." |

### 10.3 Błędy API - POST /cards

| Status | Komunikat użytkownika |
|--------|----------------------|
| 400 (generation_id_required) | "Błąd wewnętrzny. Odśwież stronę i spróbuj ponownie." |
| 404 (generation_not_found) | "Sesja generowania wygasła. Wygeneruj fiszki ponownie." |
| 422 (duplicate_front) | "Fiszka o takim przodzie już istnieje w Twoich fiszkach." |
| 500 (server_error) | "Nie udało się zapisać fiszek. Spróbuj ponownie." |

### 10.4 Strategia retry

- Dla błędów 500 i sieciowych: przycisk "Spróbuj ponownie" wywołuje ostatnią akcję
- Dla błędów 409/422: użytkownik musi zmienić dane
- Dla błędów 400/404: wyświetl instrukcję, nie oferuj automatycznego retry

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utworzenie strony Astro: `src/pages/generate.astro`
2. Utworzenie katalogu komponentów: `src/components/generate/`
3. Utworzenie pliku typów: `src/components/generate/types.ts`
4. Utworzenie pliku hooka: `src/components/generate/useGenerateFlashcards.ts`

### Krok 2: Implementacja typów

1. Dodanie typów ViewModel do `src/components/generate/types.ts`
2. Eksport typów propsów komponentów

### Krok 3: Implementacja funkcji API

1. Utworzenie `src/lib/api/generations.ts` z funkcją `createGeneration`
2. Utworzenie `src/lib/api/cards.ts` z funkcją `createCards`
3. Implementacja klasy `ApiError` dla obsługi błędów

### Krok 4: Implementacja custom hooka

1. Implementacja `useGenerateFlashcards` z pełną logiką stanu
2. Implementacja transformacji `CardProposalDTO` → `ProposalViewModel`
3. Implementacja transformacji `ProposalViewModel` → `CardCreatePayload`

### Krok 5: Implementacja komponentów atomowych

1. `CharacterCounter` - licznik z kolorowym feedbackiem
2. `LoadingOverlay` - overlay z animacją
3. `ErrorMessage` - komunikat błędu z retry

### Krok 6: Implementacja komponentów formularza

1. `PromptForm` - textarea + przycisk + licznik
2. Integracja z hookiem `useGenerateFlashcards`

### Krok 7: Implementacja komponentów propozycji

1. `CardContent` - wyświetlenie front/back
2. `CardEditForm` - formularz edycji inline
3. `CardActions` - przyciski akcji
4. `ProposalCard` - kompozycja powyższych
5. `ProposalList` - lista kart
6. `ProposalStats` - statystyki
7. `BulkActions` - akcje zbiorcze
8. `ProposalSection` - kontener sekcji

### Krok 8: Implementacja głównego widoku

1. `GenerateView` - kompozycja wszystkich sekcji
2. Integracja z hookiem
3. Warunkowe renderowanie sekcji

### Krok 9: Implementacja strony Astro

1. Utworzenie layoutu strony
2. Import i renderowanie `GenerateView` z `client:load`
3. Konfiguracja meta tagów

### Krok 10: Stylowanie i responsywność

1. Stylowanie komponentów z Tailwind
2. Responsywny grid dla listy propozycji
3. Animacje przejść między stanami
4. Focus states dla dostępności

### Krok 11: Dostępność (a11y)

1. Dodanie `aria-label` do przycisków akcji
2. Implementacja focus trap dla edycji inline
3. Obsługa keyboard shortcuts (Enter, Escape)
4. Announcements dla screen readers (aria-live)

### Krok 12: Testy manualne

1. Test flow generowania
2. Test akcji na propozycjach
3. Test edycji inline
4. Test zapisywania
5. Test obsługi błędów
6. Test responsywności
7. Test dostępności (keyboard navigation)
