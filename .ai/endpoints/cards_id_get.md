## API Endpoint Implementation Plan: GET /cards/{id}

## 1. Przegląd punktu końcowego
- **Cel**: zwrócenie pojedynczej fiszki o wskazanym `id` należącej do bieżącego użytkownika.
- **Zakres**: tylko odczyt; bez modyfikacji danych.
- **Ścieżka** /api/cards/{id}`


## 2. Szczegóły żądania
- **Metoda HTTP**: GET
- **Struktura URL**:
  - **Rekomendowane w Astro**: `/api/cards/{id}` (plik `src/pages/api/cards/[id].ts`)
- **Parametry**:
  - **Wymagane**:
    - `id` (path param): identyfikator karty; w DB `bigserial` → walidacja jako liczba całkowita dodatnia
  - **Opcjonalne**: brak
- **Request Body**: brak
- **Nagłówki**:
  - `Accept: application/json` (opcjonalnie)
  - **Auth**: docelowo token/cookies Supabase (zależnie od tego, jak ustawicie klienta po stronie serwera)

## 3. Szczegóły odpowiedzi
- **200 OK**: zwraca obiekt karty w JSON (patrz sekcja „Wykorzystywane typy” poniżej).
- **400 Bad Request**: nieprawidłowe `id` (np. brak, nie-liczba, ≤ 0).
- **401 Unauthorized**: brak autoryzacji (jeśli endpoint ma być już spięty z realnym auth).
- **404 Not Found**: karta o takim `id` nie istnieje lub nie należy do użytkownika.
- **500 Internal Server Error**: błąd Supabase/DB lub nieoczekiwany wyjątek.

## 4. Przepływ danych
### Wykorzystywane typy (DTO/Command)
- **Wejście**:
  - Path param: `id` (walidowany Zod; finalnie typ `number`)
- **Wyjście (do decyzji)**:
  - **Opcja A (publiczne DTO)**: `CardDetailDTO` z `src/types.ts`
  - **Opcja B (pełna encja)**: `CardDTO` z `src/types.ts`

### Warstwy i odpowiedzialności
1) **API route**: `src/pages/api/cards/[id].ts`
   - `export const prerender = false`
   - Parsowanie i walidacja `id` (Zod).
   - Ustalenie kontekstu użytkownika:
     - MVP: `DEFAULT_USER_ID`
     - Docelowo: user z Supabase session (wtedy brak user → 401).
   - Wywołanie serwisu `getCardById(...)`.
   - Mapowanie wyniku na 200/404 oraz błędów na 500.

2) **Service**: `src/lib/services/cards.service.ts`
   - Dodać funkcję (lub wydzielić, jeśli już istnieje analogiczna logika):
     - `getCardById({ supabase, userId }, cardId)`
   - Budowa zapytania Supabase:
     - `from("cards").select(<kolumny>).eq("user_id", userId).eq("id", cardId).maybeSingle()`
   - Zwrócenie:
     - `data` (karta) jeśli istnieje
     - `not_found` jeśli brak rekordu
     - `database_error` jeśli Supabase zwróci błąd

### Walidacja wejścia (Zod)
- **Schema** (do umieszczenia w `src/lib/validators/cards.ts` lub lokalnie w route):
  - `id`: `z.coerce.number().int().positive()`
- **Zachowanie przy błędach**:
  - gdy walidacja `id` nie przejdzie → 400 z `{ error: "validation_error", details: ... }` (spójnie z GET `/api/cards` i GET `/api/generations`)

## 5. Względy bezpieczeństwa
- **Autoryzacja (właściciel zasobu)**:
  - Serwis musi zawsze filtrować po `user_id` (`eq("user_id", userId)`) zanim zwróci rekord.
  - Dzięki temu `404` maskuje zarówno „nie istnieje”, jak i „nie należy do użytkownika”.
- **Uwierzytelnianie**:
  - **MVP**: obecne podejście w projekcie to `DEFAULT_USER_ID` (ryzyko: brak realnej izolacji danych).
  - **Docelowo**: endpoint powinien zwracać 401, gdy brak użytkownika; `userId` powinno pochodzić z sesji Supabase.
- **Minimalizacja wycieku danych**:
  - Jeśli wybierzecie **(CardDetailDTO)**, nie zwracajcie `user_id`.
- **DoS / nadużycia**:
  - Walidacja `id` jako liczby dodatniej ogranicza „śmieciowe” zapytania; endpoint jest lekki (single-row select).

## 6. Obsługa błędów
- **400**:
  - `id` nie przechodzi walidacji (np. `"abc"`, `0`, `-5`)
  - Response (propozycja spójna z resztą API): `{ "error": "validation_error", "details": <zod_format> }`
- **401**:
  - Brak zalogowania (tylko jeśli endpoint ma już opierać się na realnej sesji)
- **404**:
  - Brak rekordu dla `(user_id, id)`
- **500**:
  - Supabase zwraca błąd (np. problem z DB) lub wyjątek runtime
  - Logowanie po stronie serwera: `console.error(...)` z kontekstem (`userId`, `cardId`, `error.code/message/details`)
- **Rejestrowanie błędów w tabeli błędów**:
  - **Nie dotyczy**: `generation_errors` jest związane z procesem generacji; dla odczytu karty wystarczy log serwerowy.

## 7. Wydajność
- **Zapytanie jedno-rekordowe**: `maybeSingle()` / `limit(1)` → minimalny koszt.
- **Indeksy**:
  - DB plan przewiduje `cards_user_idx` i unikalność po `(user_id, front)`; dla `GET by id` kluczowy jest PK (`id`) oraz filtr `user_id`.
  - Najbezpieczniejszy wariant to filtr po obu: `eq("user_id", userId).eq("id", cardId)` (korzyść: pewna izolacja per user).
- **Select kolumn**:
  - wybierz tylko pola z `CardDetailDTO` (mniej danych).

## 8. Kroki implementacji
1) **Ustalić 3 decyzje** (ścieżka, auth, kształt DTO) zgodnie z sekcją „Niejasności do potwierdzenia”.
2) **Dodać walidację `id`**:
   - Najprościej: lokalny Zod schema w `src/pages/api/cards/[id].ts`
   - Alternatywnie: eksport w `src/lib/validators/cards.ts` (np. `cardIdParamSchema`) dla reużycia w PATCH/DELETE.
3) **Dodać serwis `getCardById`** w `src/lib/services/cards.service.ts`:
   - Wejście: `{ supabase, userId }`, `cardId`
   - Wyjście: `{ data?: CardDetailDTO | CardDTO; error?: { code: "not_found" | "database_error"; details?: unknown } }`
4) **Utworzyć route** `src/pages/api/cards/[id].ts`:
   - `export const prerender = false`
   - `export const GET: APIRoute = async ({ params, locals }) => { ... }`
   - Walidacja `params.id` → 400
   - Ustalenie `supabase` z `locals.supabase`
   - `userId`:
     - MVP: `DEFAULT_USER_ID`
     - Docelowo: jeśli brak user → 401
   - Wywołanie serwisu:
     - `not_found` → 404
     - `database_error` → 500
     - sukces → 200 i JSON DTO
5) **Spójność odpowiedzi**:
   - Ujednolicić nagłówki `Content-Type: application/json` (w GET `/api/cards` już jest).
   - Nie zwracać szczegółów DB w responsie 500 (tylko w logach).
6) **Krótki test manualny (lokalnie)**:
   - `GET /api/cards/1` dla istniejącego `id` (200)
   - `GET /api/cards/999999` (404)
   - `GET /api/cards/abc` (400)

