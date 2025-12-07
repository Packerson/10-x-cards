# Plan wdrożenia API: GET /cards

## 1. Przegląd punktu końcowego
- Cel: listowanie kart użytkownika z paginacją, filtrowaniem, sortowaniem i pełnotekstowym wyszukiwaniem po `front`.
- Kontekst: endpoint wymaga autoryzacji Supabase; stosuje RLS na `cards`.
- Zakres: tylko odczyt (status 200); brak modyfikacji danych.

## 2. Szczegóły żądania
- Metoda HTTP: GET
- URL: `/cards`
- Parametry zapytania:
  - Wymagane: brak (autoryzacja wymagana).
  - Opcjonalne (z defaultami): `page`=1, `limit`=10 (max 100), `sort`=`created_at`, `order`=`desc`.
  - Opcjonalne filtry: `status` ∈ (`pending|accepted|rejected`), `source` ∈ (`manual|ai_created|ai_edited`), `generation_id` (bigint), `search` (full-text na `front`).
- Body: brak.

## 3. Wykorzystywane typy
- Wejście: `CardsListQuery` (`src/types.ts`) rozszerzający `PaginationQuery`.
- Wyjście: `CardsListResponseDTO = ListResponse<CardDTO>`, gdzie `CardDTO` = encja `cards`.
- Enums: `CardStatus`, `CardSource`, `SortOrder`.

## 4. Szczegóły odpowiedzi
- Status 200 przy sukcesie.
- Kształt: `{ data: CardDTO[], pagination: { page, limit, total_pages, total_items, sort, order } }`.
- `sort` odzwierciedla faktycznie użyte pole sortujące.

## 5. Przepływ danych
1) API route `src/pages/api/cards/index.ts` (GET, `export const prerender = false`).
2) Pobranie `supabase` z `locals` (middleware), w dev fallback `DEFAULT_USER_ID` przy braku tokena.
3) Walidacja query (Zod) → normalizacja (domyślne wartości, clamp limit ≤100, mapowanie sort/order).
4) Wywołanie serwisu `cards.service.ts` (lub nowej funkcji) z kontekstem użytkownika.
5) Serwis buduje zapytanie Supabase:
   - `from("cards").select("*", { count: "exact" })`
   - filtry: `eq("user_id", userId)`, `eq("status", ...)`, `eq("source", ...)`, `eq("generation_id", ...)`
   - wyszukiwanie: `ilike("front", "%term%")` lub `textSearch` jeśli dostępny indeks FTS.
   - sort: `.order(sortField, { ascending: order === "asc" })`
   - paginacja: `.range(offset, offset + limit - 1)`
6) Mapowanie wyniku na DTO + metadane paginacji (total_pages = ceil(total_items/limit)).
7) Zwrócenie 200 z danymi.

## 6. Względy bezpieczeństwa
- Uwierzytelnianie: token Supabase; w dev/test użyć `DEFAULT_USER_ID` z `src/db/supabase.client.ts` jeśli brak użytkownika (do ustalenia – potencjalny wyjątek od reguły).
- Autoryzacja: rely on RLS (`user_id` = auth.uid); dodatkowe `eq("user_id", userId)` w zapytaniu.
- Walidacja wejścia: Zod (typy, zakresy, enumy, limit ≤100, page ≥1).
- Ochrona przed injection: Supabase query builder parametryzuje zapytania.
- Unikanie overfetch: explicit columns (`*` akceptowalne, ale można zawęzić do potrzeb DTO).

## 7. Obsługa błędów
- 400: nieprawidłowe parametry (Zod errors) lub limit >100.
- 401: brak/nieprawidłowy token (jeśli middleware nie ustawia usera).
- 403: (opcjonalnie) gdy RLS odrzuci, ale Supabase typowo zwróci 401/permission error.
- 404: nie dotyczy listy (zwróć pustą `data` przy braku wyników).
- 500: błąd Supabase/serwera; logowanie + generyczny komunikat.
- Logowanie: w razie błędu Supabase logować `error.message`, `error.details` do konsoli/monitoringu; brak wymogu wpisu do `generation_errors`.

## 8. Rozważania dotyczące wydajności
- Indeksy z DB planu: `cards_user_idx`, `cards_user_source_idx`, `cards_user_status_idx`, `cards_generation_idx` — wykorzystać filtry w tej kolejności, aby korzystać z indeksów.
- Paginacja offsetowa — limitować `limit` do 100; w przyszłości można dodać kursor.
- `search`: jeśli brak FTS, `ilike` na `front` — możliwe wolniejsze przy dużych zbiorach; można dodać trigram/GIN w przyszłości.
- Selektor kolumn: można ograniczyć do `CardDTO` pól; obecnie `*` jest zgodne z DTO.

## 9. Etapy wdrożenia
1) Dodać/uzupełnić Zod schema dla query (`page`, `limit`, `status`, `source`, `generation_id`, `search`, `sort`, `order`) z defaultami i clampami; umieścić w `src/pages/api/cards/schema.ts` lub wewnątrz route.
2) W route GET `/cards` (`src/pages/api/cards/index.ts`):
   - `export const prerender = false`
   - pobrać `supabase` z `locals`, userId z auth; fallback `DEFAULT_USER_ID` tylko dla dev (oznaczyć komentarzem).
   - zwrócić 401, gdy brak userId (w prod).
   - sparsować i zwalidować query; w razie błędów 400 z listą pól.
3) Rozszerzyć `cards.service.ts` o funkcję `listCards(supabase, userId, query)` (jeśli brak), używając istniejących typów `CardsListQuery`.
4) W serwisie: zbudować zapytanie Supabase z filtrami, sortowaniem, paginacją, liczeniem (`count: "exact"`); obsłużyć `search`.
5) Policzyć `total_pages`, złożyć `CardsListResponseDTO`, zwrócić do route.
6) W route: mapować błędy Supabase na 500 (lub 400, jeśli błąd wejścia), wysłać 200 z DTO.
