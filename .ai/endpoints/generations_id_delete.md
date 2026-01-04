## API Endpoint Implementation Plan: DELETE /generations/{id}

## 1. Przegląd punktu końcowego
Celem endpointu jest **usunięcie generacji** o podanym `id` wraz z **powiązanymi kartami** i **błędami generacji** w sposób **atomowy**, tak aby użytkownik nie widział już tej generacji ani jej artefaktów.

### Ustalenia
- **Usunięcie generacji usuwa powiązane karty**: wymagane zachowanie.
- **Użytkownik ma dostęp tylko do swoich generacji**: wszystkie operacje muszą egzekwować ownership (RLS i/lub filtr `user_id`).
- **Atomowość**: cała operacja ma być niepodzielna (albo wszystko, albo nic).

## 2. Szczegóły żądania
- **Metoda HTTP**: `DELETE`
- **Ścieżka**: `/api/generations/{id}`
- **Parametry**
  - **Wymagane**
    - **`id` (path)**: dodatnia liczba całkowita (bigint w DB). Walidacja: `z.coerce.number().int().positive()`.
  - **Opcjonalne**: brak
- **Request Body**: brak
- **Nagłówki**
  - **`Authorization`**: docelowo wymagany (Supabase Auth); w MVP może być pomijany.

## 3. Wykorzystywane typy
- **Walidacja parametrów**
  - `generationIdParamSchema` (`src/lib/validators/generations.ts`)
  - `GenerationIdParamInput` (typ inferowany z Zod)
- **Supabase**
  - `SupabaseClient` z `src/db/supabase.client.ts` (zgodnie z regułą backend)
- **Serwis (nowe typy)**
  - `DeleteGenerationByIdError`:
    - `{ code: "not_found" }`
    - `{ code: "database_error"; details?: unknown }`

## 4. Szczegóły odpowiedzi
- **Sukces**
  - **204 No Content**: generacja (oraz jej karty i błędy) usunięta.
- **Błędy**
  - **400 Bad Request**: niepoprawny `id` (walidacja path param).
  - **401 Unauthorized**: brak/niepoprawna sesja użytkownika (docelowo; MVP może nie zwracać).
  - **404 Not Found**: generacja nie istnieje lub nie należy do użytkownika (maskowanie zasobów obcych).
  - **500 Internal Server Error**: błąd serwera/DB.

## 5. Przepływ danych
### 5.1 Warstwa API (Astro route)
1. **Walidacja** `params.id` przez `generationIdParamSchema`.
2. Pobranie klienta Supabase z `context.locals.supabase` (zgodnie z regułą backend).
3. Ustalenie `userId`:
   - **MVP**: `DEFAULT_USER_ID`.
   - **Docelowo**: z sesji Supabase (brak sesji → 401).
4. Wywołanie serwisu: `deleteGenerationById({ supabase, userId }, generationId)`.
5. Mapowanie wyniku serwisu na status HTTP:
   - `not_found` → 404
   - `database_error` → 500
6. Zwrot **204** (bez body) w przypadku powodzenia.

### 5.2 Warstwa serwisów (`src/lib/services`)
Implementacja powinna:
- Egzekwować filtr po `user_id` przy operacjach na `generations` i `cards`, aby:
  - nie dało się usuwać cudzych danych,
  - 404 maskowało brak vs brak dostępu (zgodnie z istniejącą praktyką w `getGenerationById` i `deleteCard`).

#### Rekomendowany algorytm usuwania (atomowy)
Najprostszy, atomowy wariant to **pojedyncze `DELETE` na `generations`**, a usunięcie kart i błędów dzieje się kaskadowo w DB.

Wymagania po stronie bazy danych:
- `generation_errors.generation_id` ma już `ON DELETE CASCADE` (spełnione w schemacie MVP).
- **`cards.generation_id` musi mieć `ON DELETE CASCADE`** (obecnie w schemacie MVP jest `ON DELETE SET NULL`, więc wymaga migracji).

Operacja w serwisie:
1. `DELETE FROM generations WHERE id = :generationId AND user_id = :userId RETURNING id`
2. Jeśli nic nie zwrócono → `not_found`
3. Jeśli zwrócono `id` → sukces (kaskady usuwają `cards` i `generation_errors` w ramach tej samej transakcji)

Uwagi o triggerach:
- jeśli w `cards` są triggery “licznikowe”, będą uruchamiane przy kasowaniu kart w kaskadzie; to jest akceptowalne, ale warto przetestować, że nie powoduje konfliktów podczas kasowania rodzica.

## 6. Względy bezpieczeństwa
- **Autoryzacja**:
  - docelowo: wymagana sesja Supabase; brak sesji → **401**.
  - MVP: obecnie stosowany `DEFAULT_USER_ID` (ryzyko: brak realnej separacji użytkowników).
- **Autoryzacja zasobów (ownership)**:
  - wszystkie operacje muszą mieć filtr `eq("user_id", userId)` (na `generations`), a kaskady DB obsługują resztę.
  - zwracamy **404** zamiast 403 dla zasobów nie należących do użytkownika (maskowanie).
- **Walidacja wejścia**:
  - `id` musi być dodatnią liczbą całkowitą; odrzucamy `NaN`, ułamki, zera, wartości ujemne.
- **RLS / polityki Supabase**:
  - jeśli RLS jest włączony, polityki muszą pozwalać użytkownikowi usuwać wyłącznie swoje rekordy.
  - w środowisku dev może być wyłączone (migracja `disable_rls_dev`), ale plan powinien zakładać docelowo RLS=ON.
- **Zapobieganie nadużyciom**:
  - rozważyć rate limiting (middleware / edge), bo `DELETE` może usuwać dużo danych (DoS kosztowy).

## 7. Obsługa błędów
### 7.1 Scenariusze błędów i statusy
- **400**:
  - `id` nie jest liczbą całkowitą dodatnią (błąd walidacji Zod).
  - body jest nieobecne (ok) — brak walidacji body.
- **401** (docelowo):
  - brak sesji lub nieprawidłowy token.
- **404**:
  - brak generacji o `id` dla danego `user_id`,
  - generacja istnieje, ale należy do innego użytkownika (maskowane).
- **500**:
  - błąd Supabase/PostgREST (np. chwilowy błąd DB),
  - brak `locals.supabase` (błąd konfiguracji middleware),
  - wyjątki nieprzewidziane w serwisie.

### 7.2 Logowanie i tabela błędów
- **Nie logować do `generation_errors`** błędów z `DELETE /generations/{id}`:
  - endpoint usuwa generację (i kaskadowo jej błędy), więc logowanie “do środka” jest nietrwałe i może być mylące.
- **Logowanie serwerowe**:
  - `console.error` z kontekstem: `userId`, `generationId`, `db_code`, `message`, `details`, `hint`.
  - nie logować danych wrażliwych (tokenów/pełnych promptów) w kontekście delete.

## 8. Wydajność
- **Kasowanie wielu kart** odbywa się w DB przez kaskadę:
  - koszt operacji zależy od liczby kart; kluczowe jest posiadanie indeksu na `cards.generation_id` (jest w schemacie MVP).
- **Minimalizacja round-tripów**:
  - docelowy wariant to **jedno zapytanie** (`DELETE generations ... RETURNING`), więc minimalny narzut sieciowy.

## 9. Kroki implementacji
1. **Zmiana DB (warunek spełnienia specyfikacji)**
   - dodać migrację, która zmienia FK `cards.generation_id` z `ON DELETE SET NULL` na **`ON DELETE CASCADE`**.
   - potwierdzić, że `generation_errors.generation_id` ma `ON DELETE CASCADE` (już ma).
2. **Warstwa walidacji**
   - użyć istniejącego `generationIdParamSchema` (`src/lib/validators/generations.ts`) w route.
3. **Warstwa serwisu**
   - dodać w `src/lib/services/generations.service.ts` funkcję np. `deleteGenerationById({ supabase, userId }, generationId)`.
   - zdefiniować typ błędu w stylu istniejących serwisów:
     - `{ code: "not_found" }`
     - `{ code: "database_error"; details?: unknown }`
4. **Warstwa API**
   - w pliku `src/pages/api/generations/[id].ts` dodać handler `export const DELETE: APIRoute = ...`
   - flow analogiczny do `GET`:
     - validate,
     - `locals.supabase`,
     - `userId`,
     - call service,
     - map errors,
     - success → `new Response(null, { status: 204 })`.
5. **Obsługa auth (opcjonalnie, jeśli wchodzi w zakres)**
   - podmienić `DEFAULT_USER_ID` na userId z sesji Supabase, a brak sesji mapować na 401 (spójnie w całym API).
6. **Testy ręczne (krótkie)**
   - przypadek: poprawne `id` (istnieje) → 204; po tym:
     - `GET /generations/{id}` → 404
     - `GET /cards?generation_id={id}` → pusto (jeśli endpoint wspiera filtr) albo brak rekordów w DB
   - przypadek: `id` niepoprawne → 400
   - przypadek: `id` poprawne, ale nie istnieje → 404
7. **Weryfikacja zgodności z DB**
   - upewnić się, że `generation_errors` rzeczywiście kaskadują (FK `ON DELETE CASCADE`).
   - potwierdzić, że kaskadowe kasowanie kart nie powoduje problemów w triggerach (jeśli istnieją).


