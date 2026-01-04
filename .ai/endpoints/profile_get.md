### API Endpoint Implementation Plan: GET /profile (Current Profile)

## 1. Przegląd punktu końcowego
- **Cel**: zwrócenie aktualnego profilu zalogowanego użytkownika (preferencje języka + metadane).
- **Zasób DB**: tabela `profiles` (1:1 z `auth.users` po `profiles.id = auth.users.id`).
- **Uwaga o routingu w Astro (do rozstrzygnięcia)**:
  - W `src/pages/api/*` endpoint będzie dostępny jako **`/api/profile`**
  - Opcje:
    - implementacja w `src/pages/api/profile.ts` i traktowanie `/api/profile` jako ścieżki „technicznej” (zalecane dla spójności struktury repo),
    - lub implementacja w `src/pages/api/profile.ts` (zgodne z dokumentacją, ale łamie ustalony podział katalogów).

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Ścieżka**:  **`/api/profile`** (wynikająca z Astro, jeśli trzymamy endpointy w `src/pages/api`)
- **Parametry URL**:
  - **Wymagane**: brak
  - **Opcjonalne**: brak
- **Query string**: brak
- **Request Body**: brak
- **Nagłówki**:
  - **Wymagane**: `Authorization: Bearer <jwt>` (docelowo; w MVP w repo jest jeszcze `DEFAULT_USER_ID`)
  - **Opcjonalne**: `Accept: application/json`

### Wykorzystywane typy
W repo istnieją już typy profilu, ale warto doprecyzować DTO dla tego endpointu.

- **Istniejące (z `src/types.ts`)**:
  - `ProfileEntity` (alias encji DB: `Tables<"profiles">`)
  - `ProfileDTO = ProfileEntity`
  - `UserLocale = Enums<"locale_enum">` (`"pl" | "en"`)
- **Do dodania (rekomendowane)**:
  - `GetProfileDTO` (odpowiedź endpointu) – minimalny kształt wg spec:
    - `id: string`
    - `locale: UserLocale`
    - `created_at: string`

## 3. Szczegóły odpowiedzi
- **200 OK**:
  - `Content-Type: application/json`
  - Body (wg spec): `{ "id": "uuid", "locale": "pl|en", "created_at": "ISO-8601" }`
- **401 Unauthorized**:
  - gdy brak/niepoprawny token (lub brak zalogowanego usera)
  - Body: `{ "error": "unauthorized" }`
- **404 Not Found** (scenariusz do rozstrzygnięcia):
  - jeśli profil nie istnieje w DB (np. brak synchronizacji `profiles` przy rejestracji)
  - Body: `{ "error": "profile_not_found" }`
- **500 Internal Server Error**:
  - błąd Supabase/Postgres lub nieoczekiwany wyjątek
  - Body: `{ "error": "server_error", "details": "..." }`


## 4. Przepływ danych
1. **API route** (`src/pages/api/profile.ts`):
   - weryfikuje auth (token) i ustala `userId`,
   - wywołuje serwis `getProfile({ supabase, userId })`,
   - zwraca odpowiedź 200.
2. **Service** (`src/lib/services/profile.service.ts` – nowy):
   - wykonuje zapytanie do `profiles` po `id = userId`,
   - zwraca `ProfileEntity` lub kontrolowany błąd domenowy.
3. **DB (Supabase/PostgREST)**:
   - `profiles.id` jest PK, więc odczyt jest stałoczasowy (indeks PK).

## 5. Względy bezpieczeństwa
- **Uwierzytelnianie**:
  - Docelowo: wymagany token JWT Supabase (`Authorization: Bearer ...`) i `supabase.auth.getUser(jwt)` do ustalenia `userId`.
  - MVP w repo używa `DEFAULT_USER_ID` – w planie wdrożenia endpointu należy:
    - ograniczyć fallback do `DEFAULT_USER_ID` **tylko** do środowiska dev (np. `import.meta.env.DEV`),
    - w produkcji zwracać 401, jeśli nie da się ustalić `userId`.
- **Autoryzacja / IDOR**:
  - endpoint nie przyjmuje `id` w URL, więc ryzyko IDOR jest minimalne,
  - mimo to zapytanie do DB zawsze musi być po `id = userId`.
- **RLS (Row Level Security)**:
  - zakładać docelowo włączone RLS i polityki ograniczające `profiles` do właściciela,
  - w dev może być wyłączone (w repo widać migracje dot. RLS) – dlatego warstwa aplikacji nadal musi filtrować po `userId`.
- **Leak danych**:
  - zwracamy tylko minimalne pola (`id`, `locale`, `created_at`)

## 6. Obsługa błędów
### Scenariusze błędów i kody
- **400 Bad Request**:
  - raczej nie występuje (brak parametrów); ewentualnie tylko gdy format nagłówka `Authorization` jest jawnie niepoprawny (np. nie zaczyna się od `Bearer `) i chcemy to rozróżniać od 401.
- **401 Unauthorized**:
  - brak tokena,
  - token niepoprawny/wygaśnięty,
  - `supabase.auth.getUser()` nie zwróci użytkownika.
- **404 Not Found**:
  - brak rekordu w `profiles` dla `userId` (jeśli nie implementujemy auto-creation).
- **500 Internal Server Error**:
  - błędy PostgREST / sieci / nieobsłużone wyjątki.

### Logowanie
- Brak dedykowanej tabeli „errors” dla profilu (w DB jest `generation_errors`, dotyczy generacji) – więc:
  - logujemy błąd na serwerze (`console.error`) z kontekstem: `userId`, `operation: "getProfile"`, `db_code/message`.
  - **Nie logować** całych tokenów JWT ani wrażliwych nagłówków.

## 7. Wydajność
- Zapytanie `select ... from profiles where id = <userId> limit 1` po PK – bardzo tanie.
- Minimalizować payload:
  - w SELECT pobierać tylko potrzebne kolumny (`id, locale, created_at`).
- Brak potrzeby paginacji/cache na MVP.

## 8. Kroki implementacji
1. **Ustalić decyzje spójności**:
   - Czy endpoint ma być pod `/api/profile` (zgodnie z Astro) czy `/profile` (zgodnie z dokumentacją)?

2. **Dodać DTO do `src/types.ts`**:
   - zdefiniować `GetProfileDTO` jako jawny kontrakt odpowiedzi (z polami zgodnymi z decyzją z pkt 1).
3. **Dodać serwis** `src/lib/services/profile.service.ts`:
   - `getProfile({ supabase, userId })`:
     - guard: jeśli `!userId` → błąd `unauthorized`,
     - wykonać `.from("profiles").select("id, locale, created_at").eq("id", userId).single()`,
     - mapować błędy DB na kontrolowane kody (`not_found`, `database_error`).
4. **Dodać API route** `src/pages/api/profile.ts`:
   - `export const prerender = false`,
   - `GET`:
     - pobrać `supabase` z `locals` (zgodnie z regułą; bez importu `supabaseClient` w samym endpointzie),
     - ustalić `userId`:
       - docelowo z `Authorization` poprzez `supabase.auth.getUser(jwt)`,
       - w dev (jeśli podjęta decyzja): fallback do `DEFAULT_USER_ID`,
     - wywołać `getProfile`,
     - mapować wynik do `GetProfileDTO`,
     - zwrócić 200 lub odpowiedni błąd.
5. **(Opcjonalnie) Uzupełnić middleware** `src/middleware/index.ts`:
   - upewnić się, że endpointy korzystają z `context.locals.supabase` (zamiast bezpośrednich importów klienta).
6. **Testy manualne (krótkie, powtarzalne)**:
   - bez tokena → 401,
   - z tokenem (jeśli dostępny w środowisku) → 200 i poprawny JSON,
   - użytkownik bez profilu → 404 (albo 200 po auto-utworzeniu, jeśli tak zdecydujemy),
   - w dev fallback (jeśli włączony) → 200 dla `DEFAULT_USER_ID`.


