# Plan Testów — 10x-cards

## 1. Wprowadzenie i cele testowania
Celem jest zapewnienie jakości dla kluczowych ścieżek: rejestracja/logowanie, generowanie fiszek, zarządzanie fiszkami oraz bezpieczeństwo dostępu do danych użytkownika. Priorytetem jest stabilność API, poprawność walidacji i spójność danych w Supabase. Na tym etapie integracja z OpenRouter jest mockowana.

## 2. Zakres testów
### W zakresie
- Endpointy API w `src/pages/api/` (auth, cards, generations, profile).
- Logika serwisów w `src/lib/services/` oraz walidatory w `src/lib/validators/`.
- Krytyczne komponenty UI i hooki w `src/components/`.
- Integracja z Supabase (RLS, CRUD, spójność).
- Mockowana integracja z OpenRouter (zachowanie na błędy, timeouty, format odpowiedzi).

### Poza zakresem
- Testy obciążeniowe infrastruktury (DO) i pełny pentest.

## 3. Typy testów do przeprowadzenia
- Jednostkowe (Vitest): walidatory, serwisy, hooki.
- Integracyjne: API routes + Supabase (CRUD, autoryzacja, RLS).
- E2E (Playwright): pełne ścieżki użytkownika.
- Kontraktowe API: schematy odpowiedzi i kody błędów.
- Bezpieczeństwa (aplikacyjne): IDOR, brak dostępu bez tokena.
- Wydajnościowe (ograniczone): paginacja, czas odpowiedzi endpointów.

## 4. Scenariusze testowe dla kluczowych funkcjonalności
### Autoryzacja i profil
- Rejestracja z poprawnymi danymi → konto utworzone.
- Rejestracja z błędami walidacji → 400 + komunikat.
- Logowanie poprawne/niepoprawne.
- Reset hasła: generowanie linku i zmiana hasła.
- Profil: odczyt i aktualizacja, brak tokena → 401.

### Generowanie fiszek (P0)
- Prompt w granicach 1000–10000 → generacja poprawna (mock OpenRouter).
- Prompt poza zakresem → 400.
- Mock timeout/429/błąd sieci → błąd obsłużony, komunikat dla UI.
- Zapis wygenerowanych fiszek do `cards` + aktualizacja liczników w `generations`.

### CRUD fiszek
- Tworzenie, edycja, usuwanie dla właściciela.
- Próba dostępu do cudzej fiszki → 404/401.
- Paginacja i filtrowanie.
- Walidacja front/back (1–200 / 1–500).

### UI/UX
- Formularze auth i generacji — walidacja po stronie klienta.
- Stany ładowania i błędów w `GenerateView`.
- Synchronizacja URL ↔ state w `useCardsView`.

## 5. Środowisko testowe
- Lokalnie: Astro dev + Supabase lokalnie.
- Staging (opcjonalnie): oddzielna baza testowa.
- Dane testowe: użytkownicy testowi, zestawy fiszek, dane graniczne.

## 6. Narzędzia do testowania
- Vitest (unit, jsdom dla komponentów, coverage).
- Playwright (E2E, Chromium/Chrome, POM).
- Supabase CLI do środowiska lokalnego i migracji.
- GitHub Actions do uruchamiania testów w CI.

## 7. Harmonogram testów
- Faza 1: jednostkowe walidatory i serwisy (P0/P1).
- Faza 2: integracyjne API + Supabase (P0).
- Faza 3: E2E krytyczne ścieżki (P0).
- Faza 4: regresja UI/UX i rozszerzenia (P1/P2).

## 8. Kryteria akceptacji testów
- Wszystkie testy P0 muszą przechodzić.
- Brak krytycznych i wysokich błędów w auth, generations, cards.
- Testy walidacji i serwisów pokrywają przypadki brzegowe.
- E2E dla pełnego flow generacji i zapisu fiszek przechodzi.
- Dostępny raport coverage dla testów jednostkowych (jako wskaźnik pomocniczy).

## 9. Role i odpowiedzialności
- QA: plan, scenariusze, integracyjne i E2E.
- Frontend: testy komponentów i hooków.
- Backend: testy serwisów i API.
- DevOps/Platform: konfiguracja środowisk i CI.

