<authentication_analysis>
1. Przepływy autentykacji:
   - Rejestracja z automatycznym logowaniem i przekierowaniem.
   - Logowanie z przekierowaniem do widoku generowania.
   - Wylogowanie i przekierowanie do strony głównej.
   - Odzyskiwanie hasła z linkiem email i ustawieniem nowego hasła.
   - Weryfikacja sesji przy SSR i ochrona widoków.
   - Odświeżanie tokenu i reakcja na wygaśnięcie sesji.
   - Dostęp non-auth do przykładowych fiszek bez zapisu.

2. Główni aktorzy i interakcje:
   - Przeglądarka: inicjuje formularze i nawigację.
   - Middleware: weryfikuje sesję i chroni trasy.
   - Astro API: obsługuje endpointy auth.
   - Supabase Auth: realizuje logowanie, rejestrację i reset.

3. Procesy weryfikacji i odświeżania tokenów:
   - Middleware odczytuje sesję z ciasteczek.
   - Przy wygaśnięciu tokenu następuje odświeżenie.
   - Brak odświeżenia skutkuje przekierowaniem do logowania.

4. Krótki opis kroków:
   - UI zbiera dane i wysyła do API.
   - API deleguje do Supabase Auth.
   - Supabase zwraca sesję lub błąd.
   - Middleware chroni trasy i dopuszcza tylko zalogowanych.
   - Reset hasła używa linku email i aktualizacji hasła.
</authentication_analysis>

<mermaid_diagram>
```mermaid
sequenceDiagram
  autonumber
  participant Browser as Przeglądarka
  participant MW as Middleware
  participant API as Astro API
  participant Auth as Supabase Auth

  Browser->>API: Wysłanie formularza logowania
  activate API
  API->>Auth: Logowanie
  activate Auth
  Auth-->>API: Sesja lub błąd
  deactivate Auth
  API-->>Browser: Odpowiedź i ustawienie sesji
  deactivate API
  alt Logowanie poprawne
    Browser->>MW: Wejście na chronioną stronę
    activate MW
    MW->>Auth: Weryfikacja sesji z ciasteczek
    activate Auth
    Auth-->>MW: Sesja aktywna
    deactivate Auth
    MW-->>Browser: Dostęp i render SSR
    deactivate MW
  else Logowanie błędne
    Browser-->>Browser: Komunikat o błędzie
  end

  Browser->>API: Wysłanie formularza rejestracji
  activate API
  API->>Auth: Rejestracja
  activate Auth
  Auth-->>API: Sesja lub błąd
  deactivate Auth
  API-->>Browser: Odpowiedź i zalogowanie
  deactivate API
  alt Rejestracja poprawna
    Browser->>Browser: Przekierowanie do generowania
  else Email zajęty
    Browser-->>Browser: Komunikat o błędzie
  end

  Browser->>API: Wylogowanie
  activate API
  API->>Auth: Wylogowanie
  activate Auth
  Auth-->>API: Potwierdzenie
  deactivate Auth
  API-->>Browser: Przekierowanie do strony głównej
  deactivate API

  Browser->>API: Odzyskiwanie hasła
  activate API
  API->>Auth: Wysłanie linku resetującego
  activate Auth
  Auth-->>API: Potwierdzenie
  deactivate Auth
  API-->>Browser: Komunikat o wysyłce
  deactivate API

  Browser->>API: Ustawienie nowego hasła
  activate API
  API->>Auth: Aktualizacja hasła
  activate Auth
  Auth-->>API: Sesja lub błąd
  deactivate Auth
  API-->>Browser: Odpowiedź i zalogowanie
  deactivate API
  alt Link ważny
    Browser->>Browser: Przekierowanie do generowania
  else Link wygasł
    Browser-->>Browser: Komunikat o błędzie
  end

  Browser->>MW: Wejście na chronioną stronę
  activate MW
  MW->>Auth: Weryfikacja i odświeżenie tokenu
  activate Auth
  alt Token ważny
    Auth-->>MW: Sesja aktywna
  else Token wygasł
    Auth-->>MW: Brak sesji
  end
  deactivate Auth
  alt Sesja aktywna
    MW-->>Browser: Dostęp do zasobu
  else Brak sesji
    MW-->>Browser: Przekierowanie do logowania
  end
  deactivate MW

  par Widok non-auth
    Browser->>MW: Wejście na stronę startową
    activate MW
    MW-->>Browser: Widok CTA i przykładowe fiszki
    deactivate MW
  and Ochrona generowania
    Browser->>MW: Wejście na generowanie
    activate MW
    MW-->>Browser: Wymóg logowania
    deactivate MW
  end
```
</mermaid_diagram>
