# API Endpoint Implementation Plan: POST /generations

## 1. Przegląd punktu końcowego
Punkt końcowy umożliwia zainicjowanie generowania fiszek na podstawie dostarczonego tekstu (prompt). Tworzy rekord `generations` w statusie `processing`, wylicza skrót MD5 dla deduplikacji i zwraca wstępne propozycje fiszek (mock w MVP; docelowo LLM).
Domknięcie generacji (`status = completed`) oraz ustawienie snapshot liczników (`total_accepted`, `total_rejected`) następuje dopiero po zapisie zaakceptowanych/edytowanych kart przez `POST /cards`.

## 2. Szczegóły żądania
- **Metoda HTTP:** POST
- **URL:** /api/generations
- **Parametry URL:** brak
- **Request Body (JSON):**
  ```json
  {
    "prompt_text": "string (1000-10000 znaków)"
  }
  ```
- **Wymagane pola:** `prompt_text`
- **Opcjonalne pola:** brak (model i ustawienia nadpisywane domyślnie po stronie backendu)

## 3. Wykorzystywane typy
- **CreateGenerationCommand** (z `src/types.ts`) – wejście
- **GenerationCreatedDTO** – sukces 201
- **GenerationLifecycleStatus** – wartości statusu
- **CardProposalDTO** – element tablicy `card_proposals`

## 4. Szczegóły odpowiedzi
Status | Treść
-------|------
201 Created | `GenerationCreatedDTO`
400 Bad Request | `{ error: "validation_error", details }`
401 Unauthorized | `{ error: "unauthorized" }`
409 Conflict | `{ error: "duplicate_prompt" }`
500 Internal Server Error | `{ error: "server_error" }`

Przykład 201:
```json
{
  "id": 123,
  "prompt_text": "...",
  "status": "processing",
  "total_generated": 0,
  "card_proposals": [
    { "front": "...", "back": "..." }
  ]
}
```

## 5. Przepływ danych
1. Klient wysyła POST /api/generations z `prompt_text`.
2. Middleware uwierzytelnia użytkownika i udostępnia `supabase` w `locals`.
3. Wywałonie dedykowanego serwisu`generation.serive` który.
   1. Waliduje dane Zodem.
   2. Liczy `prompt_hash = md5(trim(prompt_text))`.
   3. W transakcji:
      - Próbuje wstawić rekord do `generations` z unikalnością `(user_id,prompt_hash)`.
      - W przypadku konfliktu zwraca 409.
   4. Ustawia `total_generated` na liczbę zwróconych propozycji (`card_proposals.length`) oraz `status = processing`.
5. Błędy LLM zapisywane w `generation_errors` + update `status = 'failed'`.
6. Odpowiedź 201 z `GenerationCreatedDTO`.
7. Po akceptacji/edycji propozycji frontend zapisuje karty przez `POST /cards`, co domyka generację (`status = completed`) i ustawia snapshot liczników.


## 6. Względy bezpieczeństwa
- **Auth**: wymagana sesja Supabase (`auth.users`).
- **RLS**: tabele posiadają polityki ograniczające do `auth.uid()`.
- **Walidacja długości**: Zod + CHECK w DB.
- **SQL-Injection**: korzystamy z Supabase client (parametryzacja).
- **Deduplikacja**: unikalny `(user_id,prompt_hash)` chroni przed spamem.
- **ograniczenie ekspozycji błędów** Szczegóły błędów nie powinny być zwraze uzytkownikowi.

## 7. Obsługa błędów
Kod | Scenariusz | Działanie
----|------------|----------
400 | brak `prompt_text`, zbyt krótki/długi | zwrot z informacją o polu
401 | brak/nieprawidłowy JWT | middleware zwraca 401
409 | identyczny prompt już istnieje | konflikt
500 | błąd nieoczekiwany/LLM | zapis rekordu w `generation_errors`, status `failed`

## 8. Rozważania dotyczące wydajności
- Początkowo synchroniczne wywołanie LLM,
- timeout dla AI 60s;

## 9. Etapy wdrożenia
1. **Definicje typów** – upewnić się, że `GenerationCreatedDTO` zawiera `card_proposals`.
2. **Zod schema** `CreateGenerationSchema` w `src/lib/validators/generation.ts`.
3. **GenerationService** (`src/lib/services/generation.service.ts`) który:
    - createGeneration() - Na tym etapie developmentu skorzystami z mocków zamiast wywowływań do serwisu AI
    - Obsługa logi zapisu do tabeli `generations`
    - rejestracja błędów do `generation_errors`
4. Dodanie mechanizmu uwierzytelnienia poprzez Supabase Auth
5. **Endpoint** `src/pages/api/generations/index.ts`:
   - export const POST;
   - pobierz `supabase` z `Astro.locals`;
   - wywołaj service;
   - zwróć 201 lub błędy.
6. **Dodaniee szczegółowego logowania akcji i błędów**


