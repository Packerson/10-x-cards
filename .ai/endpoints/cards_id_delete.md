## API Endpoint Implementation Plan: DELETE /cards/{id}

## 1. Przegląd punktu końcowego
- **Cel**: trwałe usunięcie pojedynczej fiszki (`cards`) wskazanej przez `id`.
- **Efekt uboczny**: operacja usuwa rekord z tabeli `cards`; w konsekwencji uruchamia się trigger DB `trg_cards_update_counters` (AFTER INSERT/UPDATE/DELETE na `cards`), który przelicza liczniki w `generations`.
- **Ważne niuanse do potwierdzenia (sprzeczności/niejasności)**:
  - **Kody statusu walidacji**: w kodzie istnieją endpointy zwracające `422`, natomiast w wymaganiach planu proszone są m.in. `400` dla nieprawidłowych danych wejściowych. Dla tego endpointu planuje się konsekwentnie używać `400` dla walidacji.
  - **Autoryzacja w MVP**: obecnie część endpointów używa `DEFAULT_USER_ID`, a w dev-migracji RLS jest wyłączony. W produkcji RLS wymaga `auth.uid()` — trzeba doprecyzować, czy ten endpoint ma działać wyłącznie z prawdziwą sesją (zalecane), czy chwilowo jak inne endpointy MVP.

### Wykorzystywane typy (DTO / Command)
- **Walidacja**:
  - `CardIdParamInput` (Zod infer) z `src/lib/validators/cards.ts`
- **DTO odpowiedzi**:
  - **Propozycja** (opcjonalnie do dodania w `src/types.ts` dla spójności kontraktu): `DeleteCardResultDTO = { id: number }` (lub `Pick<CardEntity, "id">`).

## 2. Szczegóły żądania
- **Metoda HTTP**: `DELETE`
- **Struktura URL**: `/api/cards/{id}` (Astro: `src/pages/api/cards/[id].ts`)
- **Parametry**:
  - **Wymagane**:
    - **`id` (path)**: dodatnia liczba całkowita; walidacja przez `cardIdParamSchema` (`z.coerce.number().int().positive()`).
  - **Opcjonalne**: brak
- **Request Body**: brak
- **Nagłówki**:
  - **`Authorization: Bearer <token>`**: docelowo wymagany (401 jeśli brak/niepoprawny). W MVP może być tymczasowo pominięty.

## 3. Szczegóły odpowiedzi
- **200 OK** (udane usunięcie):
  - **Body**: rekomendowane `{"id": <number>}` (potwierdza co usunięto; ułatwia klientowi spójność).
  - **Headers**: `Content-Type: application/json`
- **400 Bad Request**:
  - `{"error":"validation_error","details":...}` gdy `id` nie przechodzi walidacji (np. `abc`, `0`, `-1`).
- **401 Unauthorized**:
  - `{"error":"unauthorized"}` gdy brak/niepoprawny token (jeśli włączona autoryzacja).
- **404 Not Found**:
  - `{"error":"not_found"}` gdy nie istnieje lub nie należy do użytkownika (celowo maskujemy przypadek „cudza karta” jako 404).
- **500 Internal Server Error**:
  - `{"error":"server_error","details":...}` dla błędów konfiguracji (`supabase_not_configured`) lub nieoczekiwanych błędów DB/runtime.

## 4. Przepływ danych
1. **Router (Astro)**: `src/pages/api/cards/[id].ts` dodaje `export const DELETE: APIRoute`.
2. **Middleware**: `src/middleware/index.ts` wstrzykuje `context.locals.supabase`.
3. **Walidacja wejścia**:
   - `cardIdParamSchema.safeParse({ id: params.id })` → błąd → 400.
4. **Uwierzytelnienie/autoryzacja**:
   - Docelowo: userId pochodzi z sesji/tokena Supabase (brak → 401).
   - W warstwie DB: RLS/polityki `cards_delete_owner` (jeśli RLS włączony).
5. **Service layer** (`src/lib/services/cards.service.ts`):
   - Nowa funkcja `deleteCard({ supabase, userId }, cardId)` wykonuje `DELETE FROM cards WHERE user_id = :userId AND id = :cardId`.
   - Implementacja powinna zwrócić `not_found`, gdy usunięto 0 rekordów.
6. **DB trigger**:
   - `trg_cards_update_counters` uruchamia `tr_cards_update_counters()` po DELETE i przelicza liczniki dla `generations` na podstawie `old.generation_id`.
7. **Response**: route mapuje wynik serwisu na statusy HTTP i zwraca JSON.

## 5. Względy bezpieczeństwa
- **Uwierzytelnienie**:
  - Docelowo wymagane (401 przy braku sesji). W planie implementacyjnym uwzględnić pozyskanie `userId` z kontekstu auth Supabase (nie z `DEFAULT_USER_ID`).
- **Autoryzacja / izolacja tenantów**:
  - W serwisie zawsze filtruj po `user_id`, aby:
    - nie dopuścić do usunięcia cudzych rekordów,
    - zwracać 404 dla „cudzych” zasobów (anti-enumeration).
- **RLS**:
  - Produkcja: RLS powinien być włączony; polityka `cards_delete_owner` wspiera wymaganie „tylko właściciel”.
  - Dev: jest migracja wyłączająca RLS; to nie powinno determinować kontraktu API.
- **Walidacja typu `id`**:
  - Zod + `z.coerce.number()` ogranicza wektor `id=...` do `int>0` i minimalizuje błędy DB (`22P02`).

## 6. Obsługa błędów
- **Scenariusze i kody**:
  - **`id` niepoprawne** → `400` (Zod error format).
  - **Brak supabase w `locals`** → `500` (`supabase_not_configured`).
  - **Brak sesji / token nieważny** → `401` (docelowo).
  - **Karta nie istnieje / nie należy do usera** → `404` (`not_found`).
  - **Błąd DB (PostgREST)** → `500` (`server_error` + zanonimizowane `details`).
- **Rejestrowanie błędów do tabeli błędów**:
  - Tabela `generation_errors` dotyczy generacji, nie kart; dla DELETE /cards/{id} **nie zapisujemy** do `generation_errors`.
  - Logowanie: `console.error()` w serwisie (jak w `createCards/updateCard`) + ewentualnie centralny logger, jeśli istnieje.

## 7. Wydajność
- **Koszt operacji**: pojedyncze `DELETE` + `UPDATE generations ... FROM (SELECT ... COUNT FILTER ...)` w triggerze.
- **Indeksy**:
  - Jest indeks `cards_user_idx (user_id)`; dla `WHERE user_id = ? AND id = ?` kluczowe jest, by `id` było PK (jest) — DB i tak szybko znajdzie rekord, ale filtr `user_id` musi być w zapytaniu dla bezpieczeństwa.
- **Minimalizacja payloadu**:
  - Preferować `select("id")` po delete (zwrócić tylko `id`), zamiast całego rekordu.
- **Unikanie dodatkowych round-tripów**:
  - Nie robić pre-check `SELECT` przed `DELETE`; zamiast tego wykonać `DELETE ... RETURNING id` (Supabase: `.delete().select("id")...maybeSingle()`), a brak wyniku traktować jako 404.

## 8. Kroki implementacji
1. **Route (Astro)**: w `src/pages/api/cards/[id].ts` dodać `export const DELETE: APIRoute`.
   - Wymusić `export const prerender = false` (już jest).
   - Walidacja `params.id` przez `cardIdParamSchema` → 400.
   - Pobrać `supabase` z `locals` (zgodnie z regułą backend) → brak → 500.
   - Ustalić `userId`:
     - docelowo: z sesji Supabase (brak → 401),
     - tymczasowo (jeśli spójność MVP wymaga): `DEFAULT_USER_ID` z komentarzem `TODO`.
2. **Service**: w `src/lib/services/cards.service.ts` dodać funkcję `deleteCard`.
   - Podpis (przykładowy): `deleteCard({ supabase, userId }, cardId: number): Promise<{ data?: { id: number }; error?: ... }>`
   - Zapytanie:
     - `supabase.from("cards").delete().eq("user_id", userId).eq("id", cardId).select("id").maybeSingle()`
   - Mapowanie błędów PostgREST do kodów serwisowych (wzorzec jak `updateCard`):
     - `database_error` dla reszty.
   - `!data` → `not_found`.
3. **Mapowanie błędów w route**:
   - `not_found` → 404
   - `database_error` → 500
4. **Typy (opcjonalnie, jeśli trzymamy kontrakt w `src/types.ts`)**:
   - dodać `DeleteCardResultDTO` i użyć w route/serwisie.
5. **Spójność kontraktu**:
   - Uzgodnić semantykę liczników generacji (`total_deleted`) i nazewnictwo (rejected vs deleted) — jeśli wymagane, zaktualizować dokumentację/kontrakt.

