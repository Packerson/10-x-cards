### API Endpoint Implementation Plan: GET /generations/{id}/errors

## 1. Przegląd punktu końcowego
- **Cel**: zwrócenie paginowanej listy błędów (`generation_errors`) powiązanych z konkretną generacją (`generations.id`) należącą do aktualnego użytkownika.
- **Zakres**: tylko odczyt; opcjonalny filtr po `error_code`; sortowanie wyłącznie po `created_at`.
- **Uwaga o niespójnościach do doprecyzowania**:

## 2. Szczegóły żądania
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/generations/{id}/errors`
  - Astro route: `src/pages/api/generations/[id]/errors.ts`
- **Parametry**:
  - **Wymagane (path)**:
    - `id`: dodatnia liczba całkowita (PK `generations.id`, `bigserial`)
  - **Opcjonalne (query)**:
    - `error_code`: string; filtruje po `generation_errors.error_code`
    - `page`: number, default `1`, min `1`
    - `limit`: number, default `10`, min `1`, max `100` (spójnie z innymi listami)
    - `sort`: tylko `created_at`, default `created_at`
    - `order`: `asc | desc`, default `desc`
- **Request Body**: brak
- **Nagłówki**:
  - **Auth (docelowo)**: `Authorization: Bearer <jwt>` (Supabase). Brak → **401**.
  - **MVP (obecny stan repo)**: istnieje `DEFAULT_USER_ID` — jeśli pozostaje, to jawnie jako stub, z planem przejścia na właściwe auth.

## 3. Szczegóły odpowiedzi
- **200 OK**: JSON zgodny ze specyfikacją listy + paginacja
  - `data`: tablica obiektów błędu generacji (tabela `generation_errors`)
  - `pagination`: `{ page, limit, total_pages, total_items, sort, order }`
- **400 Bad Request**:
  - nieprawidłowe `id` albo query (`page/limit/sort/order/error_code`)
  - body: `{ "error": "validation_error", "details": <zod-format> }`
- **401 Unauthorized**:
  - brak/nieprawidłowa sesja (docelowo)
  - body: `{ "error": "unauthorized" }`
- **404 Not Found**:
  - generacja nie istnieje **lub** nie należy do użytkownika (maskowanie dostępu)
  - body: `{ "error": "not_found" }`
- **500 Internal Server Error**:
  - błąd środowiska (`locals.supabase` brak), błąd DB, nieoczekiwany wyjątek
  - body: `{ "error": "server_error", "details": "<safe_message>" }`

## 4. Przepływ danych
1. **Middleware Astro** wstrzykuje SupabaseClient do `context.locals.supabase`.
2. Handler `GET /api/generations/{id}/errors`:
   - Waliduje `params.id` (Zod).
   - Waliduje query (Zod) i ustala wartości domyślne (`page/limit/sort/order`).
   - Ustala `userId`:
     - Docelowo: `await supabase.auth.getUser()` → brak user → 401.
     - MVP: fallback do `DEFAULT_USER_ID` tylko jeśli zespół świadomie utrzymuje stub auth.
   - Wywołuje service: `listGenerationErrors({ supabase, userId }, generationId, query)`.
3. Service (rekomendowany, bez nadmiernego kombinowania):
   - **Krok A (autoryzacja/maskowanie)**: sprawdza, czy istnieje generacja o `id=generationId` i `user_id=userId`.
     - Jeśli brak → `not_found` (404), niezależnie od tego, czy generacja nie istnieje, czy jest cudza.
   - **Krok B (pobranie błędów)**: zapytanie do `generation_errors`:
     - `.eq("generation_id", generationId)`
     - opcjonalnie `.eq("error_code", error_code)` jeśli podane
     - `.order("created_at", { ascending: order === "asc" })`
     - `.range(offset, to)`
     - `count: "exact"` dla `total_items`
   - Buduje `total_pages = ceil(total_items / limit)` (0 gdy `total_items === 0`).
4. Endpoint zwraca `200` z `GenerationErrorsListResponseDTO`.

## 5. Względy bezpieczeństwa
- **Uwierzytelnianie**:
  - Docelowo wymagane (Supabase Auth); brak usera → **401**.
  - MVP z `DEFAULT_USER_ID` nie jest bezpieczny — w planie wdrożenia zaznaczyć jako tymczasowy.
- **Autoryzacja**:
  - `generation_errors` nie ma `user_id`, więc kontrola dostępu musi iść przez `generations.user_id`.
  - Zwracać **404** również dla prób dostępu do cudzej generacji (bez wycieku informacji).
- **Walidacja inputu**:
  - `sort` musi być enumeracją (tylko `created_at`) — blokuje wstrzyknięcia przez sortowanie.
  - `order` enumeracja `asc|desc`.
  - `page/limit` z sensownymi limitami (min/max) — ogranicza DoS przez wielkie zakresy.
  - `error_code`:
    - **Do doprecyzowania**: czy dopuszczamy dowolny string, czy tylko znany zestaw kodów?
    - Rekomendacja MVP: string `trim`, min 1, rozsądny max długości (np. 100) dla ochrony przed nadużyciem.
- **Ryzyka**:
  - enumeracja ID generacji: mitigacja przez filtr po `user_id` + 404.
  - ujawnianie szczegółów błędów DB: odpowiedź klienta ma być „safe”, pełne detale tylko w logach serwera.

## 6. Obsługa błędów
- **400**:
  - `id` nie jest dodatnią liczbą całkowitą
  - `page/limit/sort/order` poza zakresem
  - `error_code` pusty string (po trim) lub przekracza limit (jeśli wprowadzimy max)
- **401** (docelowo):
  - `supabase.auth.getUser()` zwraca brak usera
- **404**:
  - generacja nie istnieje lub nie należy do usera (sprawdzenie w `generations` po `user_id` i `id`)
- **500**:
  - brak `locals.supabase` (błąd konfiguracji middleware)
  - błąd PostgREST/Supabase w zapytaniu
  - nieoczekiwany wyjątek (try/catch w service)
- **Rejestrowanie w `generation_errors`**:
  - **Nie dotyczy** dla tego endpointu (to odczyt). Ta tabela służy do błędów procesu generowania/procesowania, nie do błędów odczytu API.
  - Błędy odczytu logować do `console.error` (lub docelowego systemu logów), z kontekstem: `userId`, `generationId`, parametry query, `error.code/message`.

## 7. Wydajność
- **Liczba zapytań**:
  - Proponowane podejście to 2 krótkie zapytania (check generacji + listowanie błędów). Jest czytelne i minimalizuje ryzyko błędów joinów w Supabase.
  - Alternatywa (opcjonalna): pojedyncze zapytanie z joinem `generations!inner(...)` — potencjalnie szybsze, ale bardziej kruche w implementacji/typach.
- **Paginacja**:
  - `count: "exact"` ma koszt — w MVP akceptowalne; przy dużych zbiorach rozważyć `estimated` lub inny mechanizm (poza MVP).
- **Indeksy**:
  - PK na `generation_errors.id` istnieje.
  - **Rekomendacja** (jeśli zacznie boleć): indeks na `generation_errors (generation_id, created_at)` dla typowego sortowania/paginacji.

## 8. Kroki implementacji
1. **Doprecyzować kontrakt**:
   - Czy `error_code` ma być wolnym tekstem czy enumeracją znanych kodów? (wpływa na walidację Zod i filtr).
   - Czy nazwa pliku planu ma zostać ujednolicona do standardu repo (po wdrożeniu endpointu)?
2. **Validator Zod (query)**
   - Dodać do `src/lib/validators/generations.ts` schemat:
     - `generationErrorsListQuerySchema` dla `page/limit/sort/order/error_code` (sort tylko `created_at`).
3. **Service**
   - Rozszerzyć `src/lib/services/generations.service.ts` o funkcję:
     - `listGenerationErrors({ supabase, userId }, generationId, query): Promise<{ data?: GenerationErrorsListResponseDTO; error?: ... }>`
   - Implementacja:
     - Guard clauses: walidacja preconditions (np. `generationId` liczba dodatnia — opcjonalnie, ale zwykle jest już po Zodzie).
     - Check generacji po `user_id` + `id` → `not_found`.
     - Query `generation_errors` z paginacją i opcjonalnym filtrem `error_code`.
     - Mapowanie do `GenerationErrorsListResponseDTO`.
     - Logowanie błędów DB `console.error(...)` z kontekstem.
4. **Route Astro**
   - Utworzyć `src/pages/api/generations/[id]/errors.ts`
   - `export const prerender = false`
   - `GET: APIRoute`:
     - walidacja `generationIdParamSchema` → 400
     - walidacja query (`generationErrorsListQuerySchema`) → 400
     - pobranie `supabase` z `locals.supabase` (zgodnie z regułą backend: nie importować globalnego klienta w route) → brak → 500
     - ustalenie `userId` (docelowo z auth, MVP ewentualnie `DEFAULT_USER_ID`)
     - wywołanie service → mapowanie błędów na 404/500 → sukces 200
5. **Testy ręczne (krótko, krok po kroku)**
   - `GET /api/generations/{id}/errors` bez query → 200 + pusta lista lub lista.
   - `GET` z `page=0` / `limit=999` / `sort=updated_at` → 400.
   - `GET` z nieistniejącym `{id}` → 404.
   - (Docelowo) bez sesji → 401.

