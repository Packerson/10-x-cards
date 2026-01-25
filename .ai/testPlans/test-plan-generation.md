---
name: PlanTestowGenerowania
overview: "Plan testów flow generowania fiszek: frontend (hook+UI) oraz backend (API+services) z lokalnym Supabase, OpenRouter zawsze mockowany, bez E2E."
todos:
  - id: fe-hook-tests
    content: Zaprojektuj testy hooka useGenerateFlashcards (mock API/toast).
    status: pending
  - id: fe-ui-tests
    content: Zweryfikuj i uzupełnij testy komponentów UI generowania.
    status: pending
  - id: be-api-tests
    content: Przygotuj testy POST /api/generations i POST /api/cards z lokalnym Supabase i mock OpenRouter.
    status: pending
  - id: be-test-setup
    content: Ustal wspólny setup testowy (locals, seed danych, helpers).
    status: pending
isProject: false
---

# Plan testów generowania fiszek

## Źródła prawdy (widoki + Zod)
- **Prompt**: `MIN_PROMPT_LENGTH=1000`, `MAX_PROMPT_LENGTH=10000` (`src/lib/validators/generations.ts`, używane też w `PromptForm` i hooku).
- **Edycja karty**: `front 1..200`, `back 1..500` (`CardEditForm` oraz `src/lib/validators/cards.ts`).
- **Limit bulk**: `cards` 1..100 (`createCardsSchema`).
- **Warunki renderu UI**: `ProposalSection` tylko gdy `proposals.length>0` i jest `generationId`.

## Założenia planu
- Brak testów E2E w tym zakresie (E2E będą później).
- OpenRouter zawsze mockowany na poziomie serwisu (brak realnych requestów).
- Backend testujemy jako integrację API + lokalny Supabase uruchomiony w Dockerze (realna baza).

## Zakres i podział
- **Frontend (React, Vitest + jsdom)**: testy hooka `useGenerateFlashcards` oraz integracji kluczowych komponentów UI; istniejące testy `GenerateView` traktujemy jako bazę i rozszerzamy tylko tam, gdzie brakuje pokrycia.
- **Backend (Astro API + Supabase)**: testy handlerów API `POST /api/generations` i `POST /api/cards` z lokalnym Supabase; OpenRouter zawsze mockowany.
- **Bez E2E** zgodnie z wymaganiem.

## Główne punkty flow (co weryfikujemy)
- **Generowanie**: walidacja promptu (min/max), utworzenie generacji, mapowanie błędów OpenRouter → API.
- **Akceptacja i zapis**: akcje na propozycjach, edycja, zapis wybranych i wszystkich, reakcja na błędy walidacji/DB.
- **Stan UI**: loading overlay, error box, render sekcji propozycji, blokady przy nieprawidłowym promptcie/edycji.

## Frontend – plan testów
1) **Hook `useGenerateFlashcards`** (nowy plik testów)
- Walidacja promptu: `1000..10000`, `isPromptValid` oraz reset błędu po zmianie tekstu.
- `generateProposals`:
  - sukces: `isGenerating` true→false, ustawiony `generationId`, mapowanie `card_proposals` do view model (nowe `id`, `status=pending`, kopie `originalFront/Back`);
  - błąd: mapowanie `ApiError` → `GenerateErrorType` (`network_error`, `validation_error`, `duplicate_prompt`, fallback `server_error`).
- Akcje na propozycjach:
  - `accept/reject/edit/cancel_edit` i konsekwencje `status` + reset do `original*` po `cancel_edit`.
  - `handleProposalEdit`: trim + ustawienie `status=accepted`, `source` na `ai_edited`, gdy zmiana treści.
- `handleBulkAction`: akceptacja/odrzucenie z pominięciem `editing`.
- `saveAcceptedCards`: guardy (brak `generationId`, brak zaakceptowanych), sukces (reset stanu + toast), błąd `save_error`.
- `saveAllProposals`: guardy + błąd jeśli istnieje `editing` (komunikat z hooka), sukces/błąd.
- `retryLastAction`: prawidłowy routing retry dla `generate`, `save_selected`, `save_all`.
- **Mocki**: `createGeneration`, `createCards`, `toast`, `ApiError` (zgodnie z `@.cursor/rules/vitest.mdc`).
- Plik docelowy: `src/components/generate/__tests__/useGenerateFlashcards.test.tsx`.

2) **Komponenty UI – integracja**
- `GenerateView`: renderowanie sekcji:
  - `LoadingOverlay` tylko podczas `isGenerating`;
  - `ErrorMessage` widoczne, gdy `error` i weryfikacja `onRetry/onDismiss`;
  - `ProposalSection` tylko gdy `proposals.length>0` i `generationId` ustawiony;
  - stan pusty „Brak propozycji”, gdy brak błędu i nie generuje.
- `PromptForm`:
  - disabled submit, gdy `isPromptValid=false` lub `isGenerating=true`;
  - placeholder zgodny z limitem (1000–10000) i licznik znaków oparty o `MIN/MAX`.
- `ProposalSection/BulkActions/ProposalStats`:
  - poprawne liczniki `accepted/rejected/pending`, przekazywanie `onSave`, `isSaving`.
- `CardEditForm`:
  - walidacja front/back (1..200/1..500), disable `Zapisz` gdy invalid;
  - `ESC` anuluje edycję (lokalny i globalny handler);
  - `onSave` dostaje przycięte wartości.
- Pliki referencyjne:
  - `src/components/generate/GenerateView.tsx`
  - `src/components/generate/PromptForm.tsx`
  - `src/components/generate/ProposalSection.tsx`
  - `src/components/generate/CardEditForm.tsx`
  - `src/components/generate/__tests__/GenerateView.test.tsx`

## Backend – plan testów (local Supabase + mock OpenRouter)
1) **POST `/api/generations`**
- Walidacja inputu: `prompt_text` <1000 lub >10000 → `400 validation_error`.
- Sukces: `201`, zwrot `id` i `card_proposals`, zapis w `generations` (w DB).
- Błędy OpenRouter (mock):
  - `config_error` → `500 server_error` + `openrouter_not_configured`.
  - `rate_limit` → `429` + `Retry-After`.
  - `openrouter_error` → `502 openrouter_error`.
  - `duplicate_prompt` → `409 duplicate_prompt`.
- `invalid_json` w body → `400 validation_error`.
- Pliki referencyjne:
  - `src/pages/api/generations.ts`
  - `src/lib/services/generations.service.ts`
  - `src/lib/services/openrouter.service.ts`

2) **POST `/api/cards`**
- Walidacja payloadu:
  - niepoprawne karty/empty list → `422 validation_error` (schema);
  - `cards` > 100 → `422 validation_error`.
- `generation_id_required` dla `ai_created/ai_edited` bez ID → `400`.
- Brak generacji → `404 generation_not_found`.
- `duplicate_front` → `422`.
- `invalid_json` → `400 validation_error`.
- Sukces: insert kart + **best-effort** update generacji (nie psujemy `201` przy błędzie update).
- Pliki referencyjne:
  - `src/pages/api/cards.ts`
  - `src/lib/services/cards.service.ts`

3) **Infrastruktura testów backendowych**
- Kontekst `locals`: `supabase` + `userId` (lokalna baza).
- Migrations + seed danych testowych (user, generacje, karty).
- Mock OpenRouter: `vi.mock` modułu `openrouter.service.ts` lub spy na `createStructuredCompletion`.
- Czyszczenie danych po teście (transakcje lub cleanup po tabelach).

## Kryteria wyjścia
- Pokryte krytyczne ścieżki: generowanie, akceptacja/edycja, zapis, błędy.
- Testy stabilne i deterministyczne (OpenRouter zawsze mockowany).
- Jednoznaczne źródła limitów (Zod + UI) użyte w asercjach.

## Narzędzia
- Vitest + jsdom dla frontend.
- Vitest dla backend (API + services), lokalny Supabase w testach integracyjnych.
