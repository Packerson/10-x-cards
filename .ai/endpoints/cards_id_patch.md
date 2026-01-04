## API Endpoint Implementation Plan: PATCH /cards/{id}

## 1. Przegląd punktu końcowego
Endpoint służy do **częściowej aktualizacji** istniejącej fiszki (`card`) użytkownika: pól `front` oraz/lub `back`.

Kluczowe reguły biznesowe (wymuszone po stronie serwera):
- **Zmiana `source` przy edycji treści**: jeśli karta ma `source = "ai_created"` i aktualizujesz `front` lub `back`, serwer ustawia `source = "ai_edited"`.

### Niespójności / decyzje do potwierdzenia (zanim zespół zakoduje)
- **Kody statusu vs obecny API plan**: w `.ai/api-plan.md` pojawiają się kody `422/409/403`, a w bieżącym zadaniu lista dopuszczalnych kodów nie zawiera `409/422/403`. Trzeba potwierdzić:
  - czy **duplikat `front`** ma zwracać `409` (konflikt unikalności `(user_id, front)` w DB), czy jednak `400`/`422`.
- **Response payload**: Plan zakłada zwrócenie zaktualizowanego `CardDetailDTO` (200).


## 2. Szczegóły żądania
- Metoda HTTP: `PATCH`
- Struktura URL: `/api/cards/{id}`
- Parametry:
  - Wymagane:
    - `id` (path): liczba całkowita dodatnia (bigint w DB, w API jako `number`)
  - Opcjonalne: brak (query nieużywany)
- Request Body (JSON):
  - Co najmniej jedno z pól musi być obecne:
    - `front?: string` (trim; 1..200 znaków)
    - `back?: string` (trim; 1..500 znaków)

### Walidacja (Zod)
- Walidacja `id`:
  - użyć istniejącego `cardIdParamSchema` (`z.coerce.number().int().positive()`).
- Walidacja body:
  - dodać `updateCardSchema` w `src/lib/validators/cards.ts`:
    - `front` i `back` jako `.string().trim().min(1).max(...)` i `.optional()`
    - refine: **wymagaj przynajmniej jednego pola** (`front || back`)
- Parsowanie JSON:
  - jeśli body nie jest poprawnym JSON → `400` (`validation_error`, `invalid_json`)

## 3. Wykorzystywane typy
### DTO/Command
- **`UpdateCardCommand`** (już istnieje w `src/types.ts`): `Pick<TablesUpdate<"cards">, "front" | "back">`
  - Uwaga: typ jest “partial” (pola opcjonalne). Logika endpointu musi dodatkowo wymusić “co najmniej jedno pole”.
- **`CardDetailDTO`** (już istnieje w `src/types.ts`): planowany response dla PATCH (spójny z GET /cards/{id}).

### Typy pomocnicze (serwis)
W `src/lib/services/cards.service.ts` warto dodać:
- `UpdateCardDeps` = `{ supabase: SupabaseClient; userId: string }`
- `UpdateCardError`:
  - `not_found`
  - `unique_violation` (duplikat `front` w obrębie `user_id`)
  - `invalid_input` (np. CHECK/NOT NULL)
  - `database_error` (pozostałe)

## 4. Szczegóły odpowiedzi
### 200 OK (sukces)
- Zwrócić JSON z obiektem `CardDetailDTO` po aktualizacji:
  - `id`, `front`, `back`, `source`, `created_at`, `updated_at`

### Błędy (kody wg wymagań zadania)
- `400`:
  - niepoprawne `id` (path)
  - niepoprawny JSON w body
  - błąd walidacji body (typy/zakresy/puste body)
- `409`:
  - duplikat `front` (konflikt unikalności `(user_id, front)` w DB)
- `401`:
  - brak uwierzytelnienia / brak użytkownika (docelowo)
- `404`:
  - karta nie istnieje **lub** nie należy do użytkownika (nie ujawniamy istnienia zasobu)
- `500`:
  - błąd infrastruktury/DB lub brak `locals.supabase`

## 5. Przepływ danych
### Warstwa API (`src/pages/api/cards/[id].ts`)
1. Waliduj `params.id` przez `cardIdParamSchema`.
2. Pobierz `supabase` z `context.locals.supabase` (bez importu klienta bezpośrednio).
3. Ustal `userId`:
   - **MVP (obecny kod)**: `DEFAULT_USER_ID` (tymczasowe).
   - **Docelowo**: userId z sesji Supabase/Auth; jeśli brak → `401`.
4. Parsuj `request.json()`; w razie błędu → `400`.
5. Waliduj body przez `updateCardSchema`; w razie błędu → `400`.
6. Pobierz aktualny stan karty (min. `id`, `source`) dla danego `userId`:
   - jeśli brak → `404`.
7. Jeśli `current.source === "ai_created"` oraz payload zawiera `front` lub `back` → ustaw w patch `source="ai_edited"`.
8. Wywołaj serwis `updateCard(...)`:
   - jeśli serwis zwróci `not_found` → `404`
   - jeśli `unique_violation` → `409`
   - inne błędy → `500`
9. Zwróć `200` z JSON zaktualizowanej karty.

### Warstwa serwisów (`src/lib/services/cards.service.ts`)
Implementacja w serwisie:
- `getCardForUpdate({ supabase, userId }, cardId)`:
  - select: `id, source` z `.eq("user_id", userId).eq("id", cardId).maybeSingle()`
  - `!data` → `not_found`
- `updateCard({ supabase, userId }, cardId, patch: UpdateCardCommand)`:
  - `.from("cards").update(patch).eq("user_id", userId).eq("id", cardId).select("id, front, back, source, created_at, updated_at").maybeSingle()`
  - jeśli `data` puste i brak `error` → traktuj jako `not_found` (np. filtr/RLS)
  - mapuj błędy `PostgrestError.code` analogicznie do `createCards`:
    - `23505` → `unique_violation`
    - `23514`/`23502`/`22P02` → `invalid_input`
    - reszta → `database_error`
  - loguj `console.error` z kontekstem (`userId`, `cardId`, db_code, message, mapped_code)

## 6. Względy bezpieczeństwa
- **Autoryzacja**:
  - Docelowo `userId` musi pochodzić z sesji (Supabase Auth). Brak sesji → `401`.
  - W serwisie zawsze filtruj po `user_id` (w kodzie) i polegaj na RLS w produkcji.
- **Nieujawnianie istnienia zasobu**:
  - Dla prób modyfikacji cudzej karty zwracaj `404` (maskowanie).
- **Walidacja wejścia**:
  - Zod: typy, zakresy, “co najmniej jedno pole”.
  - `trim()` na `front/back` ogranicza przypadkowe duplikaty z białymi znakami.


## 7. Obsługa błędów
### Scenariusze błędów i mapowanie kodów
- `400`:
  - `validation_error`:
    - `id` nie jest dodatnią liczbą
    - body nie jest JSON
    - body nie spełnia schematu (`front/back`) lub brak pól
- `409`:
  - `duplicate_front`:
    - konflikt unikalności `(user_id, front)` (DB `23505`)
- `401`:
  - `unauthorized` (docelowo: brak usera/sesji)
- `404`:
  - `not_found` (karta nie istnieje lub nie należy do użytkownika)
- `500`:
  - `server_error`:
    - brak `locals.supabase`
    - nieoczekiwany błąd serwisu/DB

### Logowanie
- Logować wyłącznie po stronie serwera (`console.error`) z minimalnym PII:
  - `userId` (UUID), `cardId`, `db_code`, `message`, `mapped_code`
- Brak dedykowanej tabeli “card_errors”; tabela `generation_errors` dotyczy wyłącznie generacji — nie używać jej dla PATCH cards.

## 8. Wydajność
- Operacje są punktowe (po `id`), O(1) + pojedyncza aktualizacja:
  - 1 query na odczyt meta (`source`)
  - 1 query na update + select danych do response
- Indeks `cards_user_idx` oraz PK `id` wspierają szybkie filtrowanie; dodatkowo i tak filtrujemy po `user_id`.
- Unikalny indeks `(user_id, front)` zabezpiecza przed duplikatami bez dodatkowych zapytań.

## 9. Kroki implementacji
1. **Walidatory**: dodać `updateCardSchema` w `src/lib/validators/cards.ts` + typ wejścia `UpdateCardInput`.
2. **Serwis**: rozszerzyć `src/lib/services/cards.service.ts`:
   - dodać `getCardForUpdate(...)` (meta: `source`)
   - dodać `updateCard(...)` (update + select) z mapowaniem błędów Postgrest.
3. **API route**: w `src/pages/api/cards/[id].ts` dodać handler `PATCH`:
   - walidacja path/body
   - pobranie `supabase` z `locals`
   - pobranie `userId` (MVP: `DEFAULT_USER_ID`; docelowo: z auth)
   - jeśli edycja `front/back` dla `ai_created` → ustawienie `source="ai_edited"`
   - wywołanie serwisu i mapowanie błędów na kody HTTP (wg ustaleń)
4. **Spójność typów**: upewnić się, że response jest zgodny z `CardDetailDTO`.
5. **Checklist bezpieczeństwa** (manualne):
   - filtr po `user_id` w select/update
   - 404 dla braku zasobu / cudzej karty
   - brak wycieku szczegółów DB w odpowiedziach
