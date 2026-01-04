## API Endpoint Implementation Plan: PATCH /profile

### 1. Przegląd punktu końcowego
- **Cel**: aktualizacja ustawień profilu bieżącego użytkownika; w MVP wyłącznie `locale`.
- **Zasób DB**: tabela `profiles` (`id` = `auth.users.id`, `locale` = `locale_enum`, `created_at`).
- **Kontrakt**: zgodnie ze specyfikacją `PATCH /profile` przyjmuje body `{ "locale": "pl|en" }` i zwraca `200` z zaktualizowanym profilem.
- **Uwierzytelnianie**: docelowo JWT/Supabase Auth + RLS; w MVP (jak inne endpointy) `userId` jest stubowane.

#### Założenia i pytania do doprecyzowania (żeby uniknąć sprzecznych implementacji)
- **Czy rekord w `profiles` zawsze istnieje?** Jeśli nie, to czy `PATCH /profile` ma zwrócić `404 profile_not_found`, czy ma robić `upsert` i tworzyć profil?
- **Czy `locale` ma być jedynym polem aktualizowalnym na MVP?** Typ `UpdateProfileCommand` może się rozbudować; ważne, aby walidacja i serwis były przygotowane na rozszerzenie bez łamania kontraktu.
- **Czy akceptujemy tylko `pl|en` (enum), czy planujemy przyszłe języki?** Jeśli tak, to jak będzie przebiegała migracja (nowe wartości w enumie i walidatorach)?

### 2. Szczegóły żądania
- **Metoda HTTP**: `PATCH`
- **Ścieżka**: `/api/profile` (Astro: `src/pages/api/profile.ts`)
- **Nagłówki**:
  - **Wymagane**: `Content-Type: application/json`
  - **Docelowo**: `Authorization: Bearer <jwt>` (w MVP może być pominięte)
- **Parametry URL**: brak
- **Query string**: brak
- **Request body (JSON)**:
  - **Wymagane**:
    - `locale`: `"pl"` lub `"en"`
  - **Opcjonalne**: brak (na MVP)

#### Walidacja wejścia (Zod)
- **Parsowanie JSON**: `try/catch` dla `request.json()`; błąd → `400` z `{ error: "validation_error", details: "invalid_json" }`.
- **Schemat**: `updateProfileSchema` w nowym pliku `src/lib/validators/profile.ts`:
  - `locale`: `z.enum(["pl","en"])`
  - opcjonalnie `trim()` (dla bezpieczeństwa UX), ale wynik nadal musi pasować do enuma.

#### Wykorzystywane typy (DTO / Command)
- **Command**: `UpdateProfileCommand` (`src/types.ts`) — na MVP: `{ locale: UserLocale }`.
- **DTO odpowiedzi**: `GetProfileDTO` (`src/types.ts`) — `{ id, locale, created_at }`.
- **Typ enuma**: `UserLocale` (`src/types.ts`) = `Enums<"locale_enum">`.

### 3. Szczegóły odpowiedzi
- **200 OK**: zwraca zaktualizowany profil (spójny z `GET /profile`)

Przykładowe body (DTO):
```json
{ "id": "uuid", "locale": "pl", "created_at": "2026-01-04T12:34:56.789Z" }
```

### 4. Przepływ danych
- **1) API route** (`src/pages/api/profile.ts`, handler `PATCH`)
  - waliduje JSON + `updateProfileSchema`
  - pobiera `supabase` z `context.locals.supabase` (zgodnie z regułami projektu)
  - ustala `userId` (MVP: `DEFAULT_USER_ID`, docelowo z Supabase Auth)
  - deleguje logikę do serwisu
- **2) Service** (`src/lib/services/profile.service.ts`)
  - nowa funkcja `updateProfile({ supabase, userId }, command)`
  - wykonuje `UPDATE profiles SET locale = ... WHERE id = userId`
  - zwraca zaktualizowany rekord jako `GetProfileDTO`
- **3) DB (Supabase/Postgres)**
  - weryfikuje domenę `locale` przez `locale_enum` (ochrona warstwowa)

### 5. Względy bezpieczeństwa
- **Autoryzacja / IDOR**:
  - nie przyjmujemy `userId` od klienta; serwis filtruje wyłącznie `eq("id", userId)` (jak w `getProfile`) → minimalizuje ryzyko IDOR.
  - docelowo wymagane JWT + RLS w Supabase, aby uniemożliwić odczyt/zapis cudzych danych.
- **Walidacja wejścia**:
  - tylko wartości z enuma `pl|en`; brak dowolnych stringów.
  - obsługa błędnego JSON (nie dopuszczać wyjątków do runtime).
- **Bezpieczne logowanie**:
  - logować kontekst błędu (np. `userId`, kod DB) bez wycieku wrażliwych danych; szczegóły DB w odpowiedzi tylko w ograniczonym zakresie (jak w innych endpointach: `server_error` + `details` opcjonalnie).
- **Rate limiting (docelowo)**:
  - endpoint jest tani, ale można zastosować globalny limit na użytkownika/IP w warstwie edge/proxy.

### 6. Obsługa błędów
#### Scenariusze i kody statusu (wymagane przez specyfikację)
- **400 Bad Request**
  - nieprawidłowy JSON (`invalid_json`)
  - walidacja Zod nie przeszła (np. brak `locale`, zła wartość)
- **401 Unauthorized**
  - brak użytkownika (docelowo brak/niepoprawny JWT; w MVP: brak `userId` w deps)
- **404 Not Found**
  - brak rekordu profilu dla `userId` (`profile_not_found`) — o ile nie zdecydujecie się na `upsert` (patrz pytania w sekcji 1)
- **500 Internal Server Error**
  - brak skonfigurowanego `locals.supabase`
  - błąd bazy (`database_error`)
  - nieoczekiwany wyjątek

#### Mapowanie błędów w serwisie (proponowane)
- `unauthorized` → `401`
- `not_found` → `404`
- `database_error` → `500`

#### Rejestrowanie błędów w tabeli błędów
- **Nie dotyczy**: w projekcie istnieje tabela `generation_errors` dla generacji, ale brak analogicznej tabeli dla profili.
- **Zamiast tego**: `console.error(...)` w serwisie (wzorzec jak w `getProfile`) + spójny `error.code` do mapowania w API route.

### 7. Wydajność
- **Koszt DB**: pojedynczy `UPDATE` + `SELECT` (lub `UPDATE ... returning`) po indeksowanym PK (`profiles.id`) → stały koszt.
- **Minimalizacja round-tripów**: preferować `update(...).select("id, locale, created_at").maybeSingle()` (jeden request do Supabase).
- **Odpowiedź**: zwraca tylko 3 pola, brak nadmiarowego payloadu.

### 8. Kroki implementacji
1. **Doprecyzować zachowanie dla braku profilu**: `404` vs `upsert` (sekcja 1).
2. **Dodać walidator**:
   - utworzyć `src/lib/validators/profile.ts`
   - dodać `updateProfileSchema` dla `{ locale: "pl"|"en" }`
3. **Rozszerzyć serwis** `src/lib/services/profile.service.ts`:
   - dodać `updateProfile({ supabase, userId }, command: UpdateProfileCommand)`
   - zwracać `{ data?: GetProfileDTO; error?: ... }` analogicznie do `getProfile`
   - obsłużyć: brak `userId` (unauthorized), brak rekordu (not_found), błąd DB (database_error)
4. **Dodać handler `PATCH`** w `src/pages/api/profile.ts`:
   - `try/catch` na `request.json()`
   - `updateProfileSchema.safeParse(...)` i `400` na błędach
   - pobrać `supabase` z `locals.supabase` (bez importowania `supabaseClient` w nowym kodzie; zgodnie z zasadami backend)
   - wywołać `updateProfile(...)`
   - zmapować błędy na kody: `400/401/404/500`
   - zwrócić `200` z `GetProfileDTO`
5. **Spójność kontraktu**:
   - upewnić się, że `PATCH /profile` zwraca te same pola co `GET /profile`
   - upewnić się, że `locale` jest zawsze wartością enuma
