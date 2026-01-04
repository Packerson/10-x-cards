# API Endpoint Implementation Plan: POST /cards

## 1. Przegląd punktu końcowego
Endpoint tworzy wiele fiszek naraz (bulk insert). Weryfikuje format danych, pilnuje powiązania z generacją przy źródle `ai_created` i zwraca liczbę wstawionych rekordów. Operacje idą przez Supabase z aktywnym RLS. Na ten moment używamy `DEFAULT_USER_ID` z `src/db/supabase.client.ts` zamiast sprawdzać zalogowanego usera.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/api/cards`
- Nagłówki: `Content-Type: application/json`; brak wymogu auth (tymczasowo wymuszony `DEFAULT_USER_ID`)
- Parametry:
  - Wymagane: w każdym elemencie tablicy `front` (<=200), `back` (<=500), `source` (`manual|ai_created|ai_edited`)
  - Opcjonalne: `generation_id` (wymagane, gdy `source = ai_created`; przy `manual` opcjonalne/ignorowane)
- Request Body: `{ "cards": CardCreatePayload[] }`
  - Pola tablicy zgodne z `CardCreatePayload` z `src/types.ts`
  - Rekomendowane ograniczenie wielkości tablicy (np. <= 100) dla wydajności

## 3. Wykorzystywane typy
- `CardCreatePayload`, `CreateCardsCommand`, `CreateCardsResultDTO` z `src/types.ts`
- Enums: `CardSource`
- Schemat walidacji (Zod) dla body i kart (nowy plik w `src/lib/validators/cards.ts`)

## 4. Szczegóły odpowiedzi
- 201: `{ "inserted": number }`
- 400: brak `generation_id` przy `source = ai_created` lub pusta tablica
- 401: nieużywane w tym etapie (brak weryfikacji sesji, używamy `DEFAULT_USER_ID`)
- 404: `generation_id` wskazuje zasób nieistniejący lub nienależący do użytkownika
- 422: walidacja pól (długości, niedozwolone source) albo naruszenie unikalności `(user_id, front)`
- 500: błąd wewnętrzny (np. błąd bazy)

## 5. Przepływ danych
1. Middleware zapewnia `locals.supabase`; user ID ustawiamy na `DEFAULT_USER_ID` (bez odczytu sesji).
2. Handler POST w `src/pages/api/cards.ts`:
   - Parsuje JSON.
   - Waliduje body schematem Zod → `CreateCardsCommand`.
   - Guard: jeśli którykolwiek element ma `source = ai_created` i brak `generation_id` → 400.
   - Zbiera unikalne `generation_id` z payloadu; jeśli istnieją, sprawdza w Supabase, czy należą do `DEFAULT_USER_ID` (SELECT ... IN ids). Brak dopasowania → 404.
   - Wywołuje serwis `cardsService.createCards(supabase, userId, cards)` (nowy plik w `src/lib/services/cards.service.ts`).
3. Serwis:
   - Buduje payload z `user_id = DEFAULT_USER_ID` + pola kart.
   - Wykonuje `insert` przez Supabase z `count: 'exact'`, `returning: 'minimal'`.
4. Handler zwraca 201 z liczbą wstawionych rekordów.

## 6. Względy bezpieczeństwa
- Weryfikacja właściciela `generation_id` (po `DEFAULT_USER_ID`) zapobiega wstrzyknięciu kart do cudzych generacji.
- RLS w tabeli `cards` nadal aktywne, ale przy braku sesji może wymagać service role lub explicite ustawionego `auth.uid()`; obecny fallback `DEFAULT_USER_ID` jest tymczasowy.
- Walidacja długości front/back ogranicza ryzyko oversize payloadów; można dodać limit liczby kart.
- Tylko dozwolone wartości `source`; inne → 422.

## 7. Obsługa błędów
- Walidacja schematu: 422 z komunikatami pól.
- Brak `generation_id` przy `ai_created`: 400.
- Generacja nie istnieje / nie należy do usera: 404.
- Naruszenie unikalności `(user_id, front)`: mapować błąd Supabase/PG `unique_violation` na 422.
- Błąd DB lub nieoczekiwany wyjątek: 500; log do console/error monitoringu. Brak potrzeby wpisu do `generation_errors` (dotyczy procesów generacji, nie tworzenia kart).

## 8. Rozważania dotyczące wydajności
- Bulk insert jedną operacją do Supabase; `returning: 'minimal'` zmniejsza payload.
- Limit liczby kart w żądaniu (np. 100) dla kontroli czasu i kosztów.
- Indeks `cards_user_idx` i unikalność `(user_id, front)` pomagają filtrowaniu i walidacji przez DB.
- Unikać per-karta zapytań: walidacja `generation_id` hurtowa (IN).

## 9. Etapy wdrożenia
1. Dodać schemat Zod w `src/lib/validators/cards.ts` dla body i elementów tablicy (front/back długości, source enum, opcjonalne generation_id).
2. Utworzyć serwis `src/lib/services/cards.service.ts` z funkcją `createCards(supabase, userId, cards)` realizującą insert + mapowanie błędów Supabase na statusy (unique → 422); `userId` ustawiany z `DEFAULT_USER_ID`.
3. Dodać trasę `src/pages/api/cards.ts`:
   - `export const prerender = false; export const POST = ...`
   - Użyć `DEFAULT_USER_ID` z `src/db/supabase.client.ts` zamiast `locals.supabase.auth.getUser()`.
   - Walidacja body, guardy dla `ai_created`.
   - Walidacja właścicielstwa `generation_id` względem `DEFAULT_USER_ID` (SELECT z filtrem user_id).
   - Wywołanie serwisu, zwrot 201 z `{ inserted }`.
   - Mapowanie i zwrócenie błędów (400/404/422/500).
4. Krótkie sprawdzenie lintera/formatowania po zmianach.

