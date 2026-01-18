# OpenRouter Service — przewodnik implementacji

## 1. Opis usługi

Usługa OpenRouter stanowi warstwę pośrednią między aplikacją a API OpenRouter, ujednolica konfigurację wywołań LLM, odpowiada za walidację danych wejściowych, budowę żądań, obsługę błędów i normalizację odpowiedzi do spójnego formatu używanego w aplikacji.

Kluczowe komponenty (numerowane):

1. Konfiguracja i środowisko
   - Cel: zarządzanie kluczem API, bazowym URL, domyślnym modelem i limitami.
   - Funkcjonalność: odczyt ENV, walidacja obecności klucza, budowa nagłówków.
   - Wyzwania:
     1) Brak lub błędny klucz API.
     2) Niejednoznaczne źródło konfiguracji (env vs runtime).
   - Rozwiązania:
     1) Wymusić walidację w konstruktorze i zwracać błąd konfiguracyjny.
     2) Ustalić jeden punkt wejścia konfiguracji (np. obiekt konfiguracyjny + fallback do ENV).

2. Budowanie promptów i wiadomości
   - Cel: spójne składanie komunikatu systemowego i użytkownika.
   - Funkcjonalność: łączenie treści w tablicę wiadomości, kontrola długości.
   - Wyzwania:
     1) Niespójne formaty wiadomości między miejscami użycia.
     2) Przekroczenie limitu tokenów.
   - Rozwiązania:
     1) Jednolity kontrakt wiadomości w warstwie serwisu.
     2) Prosta polityka skracania lub odrzucania wejścia z jasnym błędem.

3. Warstwa transportu HTTP
   - Cel: niezawodna komunikacja z API OpenRouter.
   - Funkcjonalność: POST do `api/v1/chat/completions`, obsługa timeoutów i retry.
   - Wyzwania:
     1) Błędy sieciowe i timeouty.
     2) Ograniczenia rate limit.
   - Rozwiązania:
     1) Ustawić timeout i krótkie retry z backoff.
     2) Obsłużyć 429 i przekazywać informację do warstwy wyżej.

4. Normalizacja odpowiedzi
   - Cel: ujednolicenie odpowiedzi do formatu domenowego.
   - Funkcjonalność: wyciąganie treści, metadanych i ewentualnego JSON schema output.
   - Wyzwania:
     1) Różne formaty odpowiedzi przy użyciu response_format.
     2) Brak spodziewanych pól w odpowiedzi.
   - Rozwiązania:
     1) Walidacja odpowiedzi i mapowanie do DTO.
     2) Guard clauses z błędem deserializacji.

5. Walidacja i schematy odpowiedzi
   - Cel: wymuszenie struktury danych z LLM.
   - Funkcjonalność: budowa response_format z json_schema.
   - Wyzwania:
     1) Niedopasowanie schematu do realnej odpowiedzi modelu.
     2) Zbyt restrykcyjny schema powodujący odrzucenia.
   - Rozwiązania:
     1) Iteracyjne dopracowanie schematu, wersjonowanie.
     2) Rozsądny kompromis między ścisłością a elastycznością.

Włączenie wymaganych elementów z przykładami (numerowane):

1. Komunikat systemowy
   - Metoda: przekazać jako pierwszą wiadomość `role: "system"`. Język system prompta i odpowiedzi powinien być uzaleniony od jezyka usera który ten request wysyla. Jezyk jest do wziecia z profile.locale uzytkownika
   - Przykład dla PL:
     - "Jesteś asystentem, który generuje propozycje fiszek w języku . Odpowiadaj tylko w JSON zgodnym ze schematem."

2. Komunikat użytkownika
   - Metoda: przekazać jako `role: "user"` z treścią od użytkownika.
   - Przykład:
     - "Na podstawie poniższego tekstu wygeneruj 5 fiszek: ...".

3. Ustrukturyzowane odpowiedzi (response_format)
   - Metoda: użyć `response_format` z json_schema.
   - Przykład (dokładny wzór):
     - `{ type: 'json_schema', json_schema: { name: 'flashcards_response', strict: true, schema: { type: 'object', properties: { cards: { type: 'array', items: { type: 'object', properties: { front: { type: 'string' }, back: { type: 'string' } }, required: ['front', 'back'], additionalProperties: false } } }, required: ['cards'], additionalProperties: false } } }`

4. Nazwa modelu
   - Metoda: przekazać w polu `model` zgodnie z nazwą w OpenRouter. "openai/gpt-4.1-mini" jako default model.
   - Przykład:
     - `"model": "openai/gpt-4.1-mini"`.

5. Parametry modelu
   - Metoda: przekazać w body żądania jako parametry sterujące.
   - Przykład:
     - `"temperature": 0.7`, `"max_tokens": 800`, `"top_p": 0.9`, `"presence_penalty": 0`.

## 2. Opis konstruktora

Konstruktor powinien przyjmować obiekt konfiguracji, z fallbackiem do ENV:

- `apiKey`: klucz OpenRouter, wymagany.
- `baseUrl`: domyślnie `https://openrouter.ai/api/v1`.
- `defaultModel`: domyślny model LLM.
- `timeoutMs`: limit czasu zapytania.
- `defaultParams`: parametry modelu (temperature, max_tokens, top_p).

W konstruktorze:

- Zweryfikuj obecność `apiKey`, w przeciwnym razie rzuć błąd konfiguracji.
- Zainicjalizuj nagłówki: `Authorization: Bearer <apiKey>` i opcjonalnie `HTTP-Referer`/`X-Title` jeśli wymagane przez politykę OpenRouter.

## 3. Publiczne metody i pola

1. `createChatCompletion(input)`
   - Wejście: `systemMessage`, `userMessage`, `model?`, `params?`, `responseFormat?`.
   - Działanie: buduje payload, wysyła żądanie, normalizuje odpowiedź.
   - Zwraca: znormalizowane DTO z treścią i metadanymi.

2. `createStructuredCompletion(input)`
   - Wejście: jak wyżej, ale `responseFormat` wymagany.
   - Działanie: wymusza JSON schema, waliduje odpowiedź.
   - Zwraca: obiekt zgodny ze schematem.

3. `setDefaultModel(modelName)`
   - Działanie: zmienia model domyślny w runtime.

4. `setDefaultParams(params)`
   - Działanie: aktualizuje domyślne parametry modelu.

Publiczne pola (opcjonalnie, jeśli potrzebne w projekcie):

- `defaultModel`
- `defaultParams`

## 4. Prywatne metody i pola

1. `_buildMessages(systemMessage, userMessage)`
   - Składa tablicę `messages` w poprawnej kolejności.

2. `_buildPayload(input)`
   - Łączy model, messages, params i response_format.

3. `_request(payload)`
   - Wysyła request do OpenRouter, obsługuje timeout i retry.

4. `_normalizeResponse(raw)`
   - Normalizuje odpowiedź na format domenowy.

5. `_parseStructuredOutput(raw)`
   - Parsuje i waliduje response_format.

Prywatne pola:

- `_apiKey`
- `_baseUrl`
- `_timeoutMs`
- `_headers`

## 5. Obsługa błędów

Potencjalne scenariusze błędów (numerowane):

1. Brak klucza API.
2. Błąd sieciowy lub timeout.
3. 4xx z OpenRouter (np. 401, 403, 429).
4. 5xx z OpenRouter.
5. Niezgodna odpowiedź z response_format.
6. Brak spodziewanych pól w odpowiedzi.
7. Przekroczenie limitu tokenów.

Rekomendacja:

- Zmapować błędy do jednolitych typów aplikacyjnych (np. `ConfigError`, `NetworkError`, `RateLimitError`, `ResponseSchemaError`).
- Zwracać przyjazne komunikaty i logować szczegóły techniczne.

## 6. Kwestie bezpieczeństwa

- Przechowuj `OPENROUTER_API_KEY` tylko w ENV i nigdy nie loguj pełnej wartości.
- Ogranicz logowanie payloadów (możliwe dane wrażliwe).
- Wymuś listę dozwolonych modeli po stronie serwisu.
- Ustaw limity długości wejścia użytkownika.
- Obsługuj rate limit i retry z backoff, aby unikać nadużyć.

## 7. Plan wdrożenia krok po kroku

1. Uzgodnij politykę dokumentacji: konflikt „nie twórz .md” vs wymaganie pliku planu; ustal wyjątek na pliki w `.ai/`.
2. Zdefiniuj kontrakt wejściowy i wyjściowy usługi (DTO/typy).
3. Utwórz plik serwisu w `src/lib/services/openrouter.service.ts`.
4. Zaimplementuj konstruktor z walidacją `apiKey` i domyślną konfiguracją.
5. Zaimplementuj `_buildMessages` i `_buildPayload`, uwzględniając:
   - system message
   - user message
   - response_format
   - model i parametry modelu
6. Zaimplementuj `_request` z timeout i prostym retry.
7. Zaimplementuj `_normalizeResponse` oraz `_parseStructuredOutput`.
8. Dodaj publiczne metody `createChatCompletion` i `createStructuredCompletion`.
9. Zintegruj serwis w miejscach wywołujących generację LLM.
11. Zweryfikuj zgodność z wymaganiami OpenRouter API i poprawność response_format.
