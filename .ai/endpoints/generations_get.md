# API Endpoint Implementation Plan: GET /generations

## 1. Przegląd punktu końcowego
- Cel: zwrócenie paginowanej listy generacji użytkownika wraz z metadanymi paginacji.  
- Charakterystyka: endpoint tylko do odczytu, filtruje po właścicielu (RLS), obsługuje sortowanie i stronicowanie.

## 2. Szczegóły żądania
- Metoda HTTP: GET  
- Struktura URL: `/api/generations` (ścieżka Astro w `src/pages/api/generations.ts` lub `index.ts`)  
- Parametry:
  - Wymagane: brak (wszystkie opcjonalne z defaultami)
  - Opcjonalne query:
    - `page` (number, default 1, min 1)
    - `limit` (number, default 10, min 1, proponowany max 100)
    - `sort` (`created_at | updated_at`, default `created_at`)
    - `order` (`asc | desc`, default `desc`)
- Request Body: brak

## 3. Wykorzystywane typy
- Z `src/types.ts`: `GenerationsListQuery`, `GenerationListItemDTO`, `GenerationsListResponseDTO`, `GenerationEntity`.  
- Ewentualny wynik serwisu: `ListResponse<GenerationListItemDTO>`.

## 4. Szczegóły odpowiedzi
- 200 OK: JSON wg specyfikacji  
  - `data`: tablica generacji (pola: id, prompt_text, total_generated, total_accepted, total_deleted, created_at, updated_at, model, status)  
  - `pagination`: { page, limit, total_pages, total_items, sort, order }
- 400: nieprawidłowe parametry (błąd walidacji Zod)  
- 401: brak autoryzacji (brak session w locals.supabase.auth.getUser())  
- 500: błąd serwera / supabase

## 5. Przepływ danych
1. Middleware Astro zapewnia `locals.supabase` (SupabaseClient z `src/db/supabase.client.ts`).  
2. Handler `GET`:
   - Waliduje query Zodem (schemat w pliku endpointu lub wyekstrahowany).  
   - Ustala page, limit, sort, order (z defaultami).  
   - Wylicza offset/range dla zapytania.  
   - Wykonuje zapytanie do tabeli `generations` z RLS (użytkownik z auth.uid() zapewnia tylko własne rekordy):
     - select pola potrzebne do DTO
     - order by sort/order
     - range dla paginacji
     - count: `exact` do total_items
   - Mapuje wynik do `GenerationsListResponseDTO` (total_pages = ceil(total_items/limit)).  
3. Zwraca JSON z kodem 200.  
4. Błędy walidacji → 400; brak user → 401; błąd supabase → 500.

## 6. Względy bezpieczeństwa
- Na czas developmentu zawsze jest DEFAULT_USER.  
- RLS na `generations` wymusza dostęp tylko do własnych danych.  
- Brak mutacji, więc brak wpisów w `generation_errors`; błędy logować w serwerowych logach.  
- Parametry query sanity-check (min/max) zapobiegają wysokim limitom.  
- Nie ujawnia danych innych użytkowników (brak możliwości podania user_id).

## 7. Obsługa błędów
- 400: niepoprawne page/limit/sort/order (z komunikatem z Zod, bez nadmiarowych szczegółów).  
- 500: problemy z bazą/połączeniem; logować `error` z supabase (bez wrażliwych danych w responsie).  
- 404: nie dotyczy listy; dla pustej listy zwracamy 200 z `data: []`.

## 8. Rozważania dotyczące wydajności
- Ogranicz `limit` (np. max 100).  
- Wykorzystaj indeksy z db-plan (`generations_user_idx`).  
- Użyj select tylko potrzebnych kolumn.  
- Jedno zapytanie z `range` i `count: "exact"`; pamiętać o kosztach `exact` przy dużych zbiorach (akceptowalne w MVP).

## 9. Etapy wdrożenia
1. Utwórz endpoint `src/pages/api/generations.ts` (lub `index.ts` w katalogu) z `export const prerender = false` i handlerem `GET`.  
2. Dodaj Zod schema dla query (page, limit, sort, order) z defaultami i limitami.  
4. Zaimportuj SupabaseClient type z `src/db/supabase.client.ts` (jeśli potrzebne typowanie).  
5. Wywołaj service `listGenerations` w `src/lib/services/generations.service.ts` (utwórz plik, jeśli brak):  
   - Przyjmie `client: SupabaseClient`, `params: GenerationsListQuery`.  
   - Zbuduje zapytanie do `generations` z order/range, `select` wybranych pól, `count: "exact"`.  
   - Zwróci `GenerationsListResponseDTO`.  
6. W handlerze opakuj wynik w `Response.json(...)` (status 200).  
7. Obsłuż błędy:  
   - ZodError → 400 z komunikatem.  
   - supabase error → log + 500.  


