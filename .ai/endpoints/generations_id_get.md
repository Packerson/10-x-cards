### API Endpoint Implementation Plan: GET /generations/{id}

### 1. Przegląd punktu końcowego
- **Cel**: zwrócenie szczegółów pojedynczej generacji należącej do aktualnego użytkownika, wraz z licznikami zagregowanymi: `total_generated`, `total_accepted`, `total_rejected`.
- **Charakterystyka**: endpoint tylko do odczytu; musi maskować dostęp do cudzych danych (zwracać 404 zarówno dla „nie istnieje”, jak i „nie należy do użytkownika”).

### 2. Szczegóły żądania
- **Metoda HTTP**: GET
- **Struktura URL**: `/api/generations/{id}` (Astro: `src/pages/api/generations/[id].ts`)
- **Parametry**:
  - **Wymagane (path)**:
    - `id`: liczba całkowita dodatnia (PK `generations.id`, `bigserial`)
  - **Opcjonalne**: brak
- **Request Body**: brak
- **Nagłówki**:
  - **Auth (docelowo)**: `Authorization: Bearer <jwt>` (Supabase). Brak → 401.
  - **MVP**: w kodzie istnieje `DEFAULT_USER_ID`, ale endpoint powinien być gotowy na docelowy przepływ auth.

### 3. Szczegóły odpowiedzi
- **200 OK**: JSON z danymi generacji + liczniki.
  - **Decyzja kontraktowa (wymagana)**:
    - **Wariant A (spójny z resztą API i typami)**: zwracamy obiekt w snake_case (jak `GenerationEntity`), a „liczniki” to po prostu `total_generated`, `total_accepted`, `total_rejected` (bez dodatkowych pól camelCase).  
  - **Rekomendacja planu**: wybrać **A** (konsekwencja z aktualnymi DTO) _albo_ **B2** (konsekwencja stylu w obrębie jednej odpowiedzi). Unikać B1.
- **400 Bad Request**: nieprawidłowy `id` (błąd walidacji).
  - Body: `{ "error": "validation_error", "details": <zod-format> }`
- **401 Unauthorized**: brak/nieprawidłowa sesja użytkownika.
  - Body: `{ "error": "unauthorized" }`
- **404 Not Found**: brak rekordu lub rekord nie należy do użytkownika.
  - Body: `{ "error": "not_found" }` (lub bardziej specyficzne `generation_not_found`, jeśli spójne z resztą API)
- **500 Internal Server Error**: błąd bazy / nieoczekiwany wyjątek / brak `locals.supabase`.
  - Body: `{ "error": "server_error", "details": "<safe_message>" }`

### 4. Przepływ danych
1. **Middleware Astro** udostępnia klienta Supabase w `locals.supabase` (zgodnie z regułą: nie importować klienta globalnego do route’ów).
2. Handler `GET`:
   - Waliduje `params.id` schematem Zod (coercion → number, int, positive).
   - Ustala `userId`:
     - Docelowo: `await locals.supabase.auth.getUser()` i bierze `user.id`.
     - MVP: fallback do `DEFAULT_USER_ID` tylko jeśli projekt świadomie utrzymuje stub auth (należy to jawnie oznaczyć w kodzie).
   - Wywołuje service: `getGenerationById({ supabase, userId }, id)`.
3. Service wykonuje zapytanie do `generations`:
   - `.select(<lista_kolumn>)`
   - `.eq("user_id", userId)`
   - `.eq("id", id)`
   - `.maybeSingle()`
4. Service mapuje wynik:
   - **Wariant A**: zwraca `GenerationDetailDTO`/`GenerationEntity`.
5. Endpoint zwraca `200` z JSON.
6. Obsługa błędów:
   - brak rekordu → 404
   - błąd supabase → 500 (log serwerowy)

### 5. Względy bezpieczeństwa
- **Uwierzytelnianie**: endpoint wymaga użytkownika; brak sesji → 401.
- **Autoryzacja**:
  - Nawet przy RLS należy filtrować po `user_id` w zapytaniu (jak w `getCardById`), żeby konsekwentnie maskować zasoby.
  - Zwracać 404 również dla prób dostępu do cudzej generacji (brak wycieku informacji).
- **Walidacja danych wejściowych**: `id` musi być dodatnią liczbą całkowitą; odrzucić `NaN`, ujemne, float, string nie-numeryczny → 400.
- **Ryzyka**:
  - Enumeracja ID (`/generations/1`, `/generations/2`): mitigacja przez filtr po `user_id` + 404.
  - Nadmierne ujawnianie szczegółów błędów DB: w odpowiedzi zwracać bezpieczny komunikat; pełne szczegóły tylko w logach serwera.

### 6. Obsługa błędów
- **Scenariusze i kody**:
  - **400**: `id` nie przechodzi walidacji (Zod).
  - **401**: brak usera z Supabase Auth (docelowo).
  - **404**: generacja nie istnieje lub nie należy do usera.
  - **500**:
    - `locals.supabase` nie jest skonfigurowane (błąd środowiska)
    - supabase/postgrest zwraca błąd
    - nieoczekiwany wyjątek w service/handlerze
- **Rejestrowanie w `generation_errors`**:
  - **Nie dotyczy standardowo** dla odczytu. To tabela do błędów procesu generowania (LLM/processing), nie do błędów odczytu.
  - Jeśli zespół chce audytować awarie odczytu, robić to w logach aplikacji (nie w `generation_errors`), żeby nie mieszać semantyki.

### 7. Wydajność
- **Zapytanie po PK + user_id**: jedno lekkie zapytanie bez paginacji.
- **Select tylko potrzebnych kolumn**: unikać `select("*")`.
- **Indeksy**:
  - PK `generations.id` istnieje.
  - Dodatkowo filtrujemy po `user_id`; w praktyce i tak selekcja po `id` jest dominująca, ale spójność filtrów jest ważniejsza niż mikro-optymalizacja.
- **Jeśli liczniki mają być liczone „na żywo” z `cards`** (alternatywa dla snapshotów w `generations`):
  - To oznacza dodatkowe zapytanie agregujące (COUNT/GROUP BY) i potencjalnie większy koszt; w MVP rekomendowane jest użycie snapshotów `total_*` z `generations`.

### 8. Kroki implementacji
1. **Doprecyzować kontrakt odpowiedzi (Wariant A vs B2)**:
   - Ustalić, czy API ma być snake_case jak reszta, czy camelCase jak w specyfikacji tego endpointu.
2. **Typy i DTO (w `src/types.ts`)**:
   - Dodać typ dla params:
     - np. `export type GenerationIdParam = { id: number }` (lub użyć z validatorów jako `z.infer`).
   - Jeśli wybierzemy **B2**: dodać `GenerationDetailWithCountersDTO` w camelCase (pełny kontrakt odpowiedzi) + opis mapowania z `GenerationEntity`.
3. **Walidacja (Zod) w `src/lib/validators/generations.ts`**:
   - Dodać `generationIdParamSchema = z.object({ id: z.coerce.number().int().positive() })`.
4. **Service w `src/lib/services/generations.service.ts`**:
   - Dodać `getGenerationById({ supabase, userId }, id)` analogicznie do `getCardById`:
     - `.from("generations")...maybeSingle()`
     - błędy DB mapować na `{ code: "database_error" }`, brak danych → `{ code: "not_found" }`
     - w logu uwzględnić `userId`, `id`, `db_code/message/details` (bez zwracania tego klientowi).
   - Jeśli **B2**: wykonać mapowanie na DTO camelCase w warstwie service (żeby endpoint był cienki).
5. **Endpoint Astro `src/pages/api/generations/[id].ts`**:
   - `export const prerender = false`
   - `GET: APIRoute`:
     - walidacja `params.id` → 400
     - pobranie `supabase` z `locals` (brak → 500 `supabase_not_configured`)
     - userId:
       - docelowo `supabase.auth.getUser()` → 401 jeśli brak
       - w MVP (jeśli nadal obowiązuje): `DEFAULT_USER_ID`
     - `getGenerationById(...)`
     - mapowanie błędów: not_found → 404, database_error → 500
     - sukces → 200 z JSON

7. **Spójność z resztą API**:
   - Ujednolicić kody błędów do zestawu używanego w innych endpointach (`validation_error`, `unauthorized`, `not_found`, `server_error`).
   - Upewnić się, że endpoint nie importuje globalnego klienta Supabase (zgodnie z regułami backend).


