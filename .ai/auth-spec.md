# Specyfikacja architektury modułu auth (rejestracja/logowanie/odzyskiwanie hasła)

Poniższa specyfikacja opisuje architekturę funkcjonalności uwierzytelniania zgodną z wymaganiami z `@.ai/prd.md` (sekcja 5) oraz stackiem z `@.ai/tech-stack.md`. Nie zawiera implementacji – wskazuje moduły, komponenty i kontrakty.

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1. Nowe strony (Astro)
- `src/pages/auth/login.astro`
  - Strona logowania, zawiera tylko layout + komponent React z formularzem.
  - Po zalogowaniu przekierowanie do `/generate`.
- `src/pages/auth/register.astro`
  - Strona rejestracji z polami email, hasło, potwierdzenie hasła.
  - Po rejestracji: komunikat o sukcesie i automatyczne zalogowanie (bez aktywacji konta).
- `src/pages/auth/forgot-password.astro`
  - Formularz podania emaila do odzyskania hasła.
- `src/pages/auth/reset-password.astro`
  - Formularz ustawienia nowego hasła po wejściu z linku email.
- `src/pages/auth/logout.astro` (opcjonalnie)
  - Prosty endpoint/strona wylogowania i przekierowanie do `/`.

### 1.2. Nowe komponenty React (client-side)
- `src/components/auth/LoginForm.tsx`
  - Odpowiada za stan formularza, walidację i wywołanie akcji logowania.
- `src/components/auth/RegisterForm.tsx`
  - Obsługa rejestracji i walidacji hasła/confirm.
- `src/components/auth/ForgotPasswordForm.tsx`
  - Wysyłka emaila resetującego.
- `src/components/auth/ResetPasswordForm.tsx`
  - Ustawienie nowego hasła po wejściu z linku.
- `src/components/auth/index.ts`
  - Reeksport komponentów.

### 1.3. Rozszerzenia istniejących komponentów/layoutów
- `src/layouts/Layout.astro`
  - W prawym górnym rogu: przyciski `Zaloguj` / `Zarejestruj` dla non-auth.
  - Dla zalogowanego: menu użytkownika z `Wyloguj`.
- `src/components/layout/UserMenu.tsx`
  - Dodanie akcji `Wyloguj`, dostęp do ustawień profilu (zgodnie z US-004 Zalogowany).
- `src/components/layout/MobileMenu.tsx` i `NavLink.tsx`
  - Dodanie linków do stron auth w trybie non-auth.

### 1.4. Rozdział odpowiedzialności: Astro vs React
- Astro:
  - Renderowanie stron i layoutów, zapewnienie SSR i wstępnego kontekstu sesji.
  - Przekazanie `isAuthenticated` do komponentów layoutu.
- React:
  - Obsługa formularzy, walidacji client-side, komunikatów błędów.
  - Wywołania API `/api/auth/*` lub bezpośrednich serwisów frontowych.

### 1.5. Walidacja i komunikaty błędów (UI)
- Logowanie:
  - Email wymagany, poprawny format.
  - Hasło wymagane.
  - Błędne dane: „Nieprawidłowy email lub hasło.”
- Rejestracja:
  - Email wymagany, poprawny format.
  - Hasło wymagane, min. 8 znaków, min. 1 znak specjalny.
  - Potwierdzenie hasła musi być zgodne.
  - Email zajęty: „Konto o tym adresie już istnieje.”
- Reset hasła:
  - Email wymagany, poprawny format.
  - Potwierdzenie wysyłki: „Jeśli konto istnieje, wysłaliśmy link resetujący.”
  - Ustawienie nowego hasła: 2 pola (nowe hasło + potwierdzenie), błędy typu „Link wygasł” / „Nieprawidłowy link”.

### 1.6. Kluczowe scenariusze UI
- Rejestracja:
  - Nowy user → rejestracja → automatyczne logowanie → przekierowanie do `/generate`.
- Logowanie:
  - User niezalogowany → logowanie → przekierowanie do `/generate`.
- Odzyskiwanie:
  - User wpisuje email → dostaje link → ustawia nowe hasło → loguje się.
- Non-auth:
  - Na `src/pages/index.astro` widoczne CTA: logowanie, rejestracja, „Przykładowe fiszki”.
  - Dostęp do przykładowych fiszek bez logowania (bez edycji, zapisu, generowania).

## 2. LOGIKA BACKENDOWA

### 2.1. Struktura endpointów API (Astro)
Nowe endpointy w `src/pages/api/auth/`:
- `POST /api/auth/login`
  - Body: `{ email: string; password: string }`
  - Response: `{ user: { id: string; email: string } }`
- `POST /api/auth/register`
  - Body: `{ email: string; password: string; passwordConfirm: string }`
  - Response: `{ user: { id: string; email: string } }`
- `POST /api/auth/logout`
  - Body: `{}`
  - Response: `{ success: true }`
- `POST /api/auth/forgot-password`
  - Body: `{ email: string }`
  - Response: `{ success: true }`
- `POST /api/auth/reset-password`
  - Body: `{ newPassword: string; newPasswordConfirm: string }`
  - Response: `{ success: true }`

### 2.2. Modele danych (DTO/typy)
Nowe DTO w `src/types.ts`:
- `AuthLoginDTO`, `AuthRegisterDTO`, `AuthForgotPasswordDTO`, `AuthResetPasswordDTO`
- `AuthUserDTO` (subset z Supabase: `id`, `email`)
Uwagi:
- `AuthResetPasswordDTO` zawiera `newPassword` i `newPasswordConfirm`.

### 2.2.1. Przykładowe fiszki (non-auth)
Wymaganie dostępu do przykładowych fiszek bez logowania bez tworzenia osobnych modeli:
- Wybrany wariant: ta sama tabela `cards` z dodatkowym atrybutem logicznym `is_sample`.
- Odczyt przykładowych fiszek bez autoryzacji przez istniejący endpoint listujący (filtrowanie po `is_sample=true`).
- Fiszki przykładowe są stałe, ale losowane per użytkownik niezalogowany.
- Zapamiętywanie „już przerobionych” dla non-auth:
  - Rekomendacja: client-side storage sessionStorage z listą `card_id`.
  - Backend nie zapisuje postępu dla non-auth (brak nowego modelu).
  - Gdy brak nowych fiszek:  komunikat o wyczerpaniu puli. 
 
### 2.3. Walidacja danych wejściowych
- Nowe walidatory w `src/lib/validators/auth.ts`:
  - Zod (analogicznie do istniejących walidatorów).
  - Walidacja formatów email i hasła, zgodność `passwordConfirm`.
  - Hasło: min. 8 znaków i co najmniej 1 znak specjalny.
- Walidacja w endpointach (guard clauses, early returns).

### 2.4. Obsługa wyjątków
- Wspólne mapowanie błędów z Supabase Auth:
  - `invalid_credentials` → 401 z komunikatem użytkownika.
  - `user_already_exists` → 409.
  - `token_expired` / `invalid_token` → 400.
- Zwracanie ujednoliconych odpowiedzi błędów (patrz `src/lib/api/api-error.ts`).

### 2.5. Renderowanie server-side (Astro)
- `astro.config.mjs` ma `output: "server"` → SSR dostępne.
- W `src/middleware/index.ts`:
  - Rozszerzenie o wczytanie sesji użytkownika z ciasteczek Supabase.
  - Dodanie `context.locals.user` i `context.locals.isAuthenticated`.
- Ochrona stron:
  - `/generate` i `/cards` dostępne tylko dla zalogowanych (MVP, część US-004).
  - `/profile` dostępne tylko dla zalogowanych (MVP, ustawienia profilu).
  - `/decks`, `/categories` oraz widoki sesji nauki dostępne tylko dla zalogowanych (MVP).
  - `/auth/*` dostępne tylko dla niezalogowanych (opcjonalnie redirect).

## 3. SYSTEM AUTENTYKACJI (Supabase Auth + Astro)

### 3.1. Przepływy Supabase Auth
- Rejestracja:
  - `supabase.auth.signUp({ email, password })`
  - Automatyczne logowanie po rejestracji (bez aktywacji konta w flow).
  - Jeśli email confirmation jest włączone w Supabase, flow je ignoruje.
- Logowanie:
  - `supabase.auth.signInWithPassword({ email, password })`
- Wylogowanie:
  - `supabase.auth.signOut()`
- Odzyskiwanie hasła:
  - `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
  - Na stronie `/auth/reset-password` → `supabase.auth.updateUser({ password })`
  - Po ustawieniu hasła: automatyczne logowanie i redirect do `/generate`.

### 3.2. Integracja z Astro
- Serwisy:
  - `src/lib/services/auth.service.ts` (nowy) – thin wrapper dla Supabase Auth.
- Klient:
  - Użycie istniejącego `src/db/supabase.client.ts` do inicjalizacji klienta.
  - W SSR korzystanie z klienta z kontekstu middleware.

### 3.3. Kontrakty i nawigacja
- Po udanym logowaniu/rejestracji: redirect do `/generate`.
- Po wylogowaniu: redirect do `/`.
- W przypadku błędów: status 4xx + komunikat przy polu formularza.

## Uwagi zgodności z wymaganiami
- Spełnia US-001, US-002, US-003 (bez zewnętrznych providerów) oraz US-004.
- Non-auth widzi CTA logowania/rejestracji i opcję „Przykładowe fiszki”.
- Autoryzacja dostępu do generowania i fiszek tylko po zalogowaniu.
- Wymóg usunięcia konta z PRD realizowany w module profilu, poza zakresem auth.

