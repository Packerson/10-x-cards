# Architektura UI dla 10x-cards

## 1. Przegląd struktury UI

Aplikacja 10x-cards to hybrydowa aplikacja oparta na Astro 5 z React 19 dla komponentów interaktywnych. Struktura UI dzieli się na:

- **Strony statyczne (Astro)**: Landing, layout, routing
- **Komponenty dynamiczne (React)**: Formularze, listy fiszek, interakcje

Kluczowe założenia architektoniczne:
- Mobile-first z responsywnym gridem (1-4 kolumny)
- Stan lokalny z `useState` bez bibliotek cache'ujących
- Walidacja real-time z Zod, błędy inline
- Komunikaty sukcesu jako toast notifications
- Sticky header z nawigacją kontekstową (zalogowany/niezalogowany)

---

## 2. Lista widoków

### 2.1 Widok logowania

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/` lub `/login` |
| **Cel** | Uwierzytelnienie istniejącego użytkownika |
| **Dostęp** | Tylko niezalogowani |

**Kluczowe informacje:**
- Formularz email + hasło
- Link do rejestracji
- Komunikaty błędów walidacji

**Komponenty:**
- `LoginForm` - formularz z walidacją real-time
- `FormField` - pole z inline error
- `SubmitButton` - przycisk z loading state

**UX/Dostępność:**
- Autofocus na pierwszym polu
- Walidacja po blur i submit
- Obsługa Enter do submit
- Aria-describedby dla błędów

**Bezpieczeństwo:**
- Hasło jako type="password"
- Rate limiting na backend
- Generyczne komunikaty błędów (bez ujawniania czy email istnieje)

---

### 2.2 Widok rejestracji

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/register` |
| **Cel** | Utworzenie nowego konta użytkownika |
| **Dostęp** | Tylko niezalogowani |

**Kluczowe informacje:**
- Formularz email + hasło + potwierdzenie hasła
- Link do logowania
- Komunikaty walidacji

**Komponenty:**
- `RegisterForm` - formularz rejestracji
- `PasswordStrengthIndicator` - opcjonalny wskaźnik siły hasła
- `FormField`, `SubmitButton`

**UX/Dostępność:**
- Walidacja zgodności haseł w real-time
- Jasne wymagania dotyczące hasła
- Potwierdzenie sukcesu + auto-login

**Bezpieczeństwo:**
- Minimalne wymagania hasła (8+ znaków)
- Ochrona przed automatyczną rejestracją (rate limiting)

---

### 2.3 Widok generowania fiszek

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/generate` |
| **Cel** | Generowanie propozycji fiszek przez AI |
| **Dostęp** | Tylko zalogowani (domyślny po login) |

**Kluczowe informacje:**
- Pole tekstowe na prompt (1000-10000 znaków)
- Lista propozycji fiszek od AI
- Statystyki: ile zaakceptowano/odrzucono

**Komponenty:**
- `PromptForm` - textarea z licznikiem znaków i przyciskiem "Generuj"
- `CharacterCounter` - licznik z kolorowym feedbackiem (czerwony poza zakresem)
- `ProposalList` - kontener na propozycje
- `ProposalCard` - pojedyncza propozycja z akcjami:
  - ✓ Akceptuj
  - ✏️ Edytuj (inline)
  - ✗ Odrzuć
- `BulkActions` - "Zaakceptuj wszystkie", "Odrzuć wszystkie", "Zapisz zaakceptowane"
- `LoadingOverlay` - loader podczas wywołania API
- `ErrorMessage` - komunikat błędu z przyciskiem "Spróbuj ponownie"

**UX/Dostępność:**
- Przycisk "Generuj" disabled poza zakresem znaków
- Licznik znaków zawsze widoczny
- Loader blokujący podczas generowania
- Inline editing propozycji bez opuszczania widoku
- Keyboard shortcuts dla akcji (Enter = akceptuj, Esc = anuluj edycję)
- Focus trap podczas edycji

**Bezpieczeństwo:**
- Walidacja długości na frontend i backend
- Obsługa 409 Conflict (duplikat promptu) z dedykowanym komunikatem

**Mapowanie API:**
- `POST /generations` - wysłanie promptu
- `POST /cards` - bulk zapis zaakceptowanych

---

### 2.4 Widok "Moje fiszki"

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/cards` |
| **Cel** | Przeglądanie, edycja, usuwanie zapisanych fiszek |
| **Dostęp** | Tylko zalogowani |

**Kluczowe informacje:**
- Grid fiszek z paginacją
- Filtry: source (manual/ai_created/ai_edited), generation_id
- Wyszukiwanie po treści front
- Przycisk dodania nowej fiszki

**Komponenty:**
- `SearchInput` - pole wyszukiwania z debounce 300ms
- `FilterBar` - filtry source i generation_id (dropdown)
- `CardGrid` - responsywny grid (1-4 kolumny)
- `FlashCard` - pojedyncza fiszka:
  - Front (pełny tekst)
  - Back (truncated ~100 znaków, rozwijalny)
  - `SourceBadge` - manual/ai_created/ai_edited
  - Data utworzenia
  - Akcje: Edytuj, Usuń
- `InlineEditor` - edycja bezpośrednio na karcie
- `InlineConfirmation` - "Potwierdź/Anuluj" dla usuwania (timeout 5s)
- `PaginationControls` - numerowana paginacja + wybór rozmiaru (10/25/50)
- `CreateCardModal` - modal tworzenia fiszki (zamykany tylko przyciskiem)
- `EmptyState` - ilustracja + CTA gdy brak fiszek

**UX/Dostępność:**
- Pole wyszukiwania zawsze widoczne
- Stan wyszukiwania zachowany przy zmianie strony
- Inline editing bez modal
- Inline confirmation zamiast osobnego dialogu
- Toast po pomyślnym zapisie/usunięciu
- Truncate z "Pokaż więcej" dla długiego tekstu
- Responsive: 1 kolumna mobile → 4 desktop

**Bezpieczeństwo:**
- Walidacja front ≤200, back ≤500 znaków
- Unikalność front per user (obsługa 422)

**Mapowanie API:**
- `GET /cards` - lista z paginacją i filtrami
- `PATCH /cards/{id}` - edycja
- `DELETE /cards/{id}` - usuwanie
- `POST /cards` - tworzenie nowej

---

### 2.5 Widok historii generacji

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/generations` |
| **Cel** | Przegląd historii generacji AI ze statystykami |
| **Dostęp** | Tylko zalogowani |

**Kluczowe informacje:**
- Lista generacji z kluczowymi danymi
- Statystyki: total_generated, total_accepted, total_rejected
- Status generacji
- Kliknięcie w wiersz → przejście do szczegółów `/generations/{id}`

**Komponenty:**
- `GenerationList` - lista generacji
- `GenerationItem` - klikalny wiersz generacji:
  - Data utworzenia
  - Fragment promptu (truncated ~100 znaków)
  - Status (processing/completed)
  - Statystyki (generated/accepted/rejected)
- `PaginationControls` - paginacja
- `EmptyState` - gdy brak generacji

**UX/Dostępność:**
- Jasne oznaczenie statusu (ikona/kolor)
- Hover state na wierszu wskazujący klikalność
- Cały wiersz klikalny (nie tylko tekst)

**Bezpieczeństwo:**
- Brak wrażliwych operacji w tym widoku

**Mapowanie API:**
- `GET /generations` - lista z paginacją

---

### 2.6 Widok szczegółów generacji

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/generations/{id}` |
| **Cel** | Wyświetlenie pełnych szczegółów generacji |
| **Dostęp** | Tylko zalogowani |

**Kluczowe informacje:**
- Pełny tekst promptu
- Data utworzenia
- Status generacji
- Statystyki: total_generated, total_accepted, total_rejected
- Przycisk "Pokaż fiszki" → `/cards?generation_id=X`
- Przycisk "Usuń generację"

**Komponenty:**
- `GenerationDetails` - kontener szczegółów
- `PromptDisplay` - wyświetlenie pełnego promptu (scrollable jeśli długi)
- `StatisticsCard` - statystyki w formie kart/liczników
- `StatusBadge` - badge statusu
- `ActionButtons` - przyciski akcji (Pokaż fiszki, Usuń)
- `InlineConfirmation` - potwierdzenie usunięcia
- `BackLink` - link powrotu do listy `/generations`

**UX/Dostępność:**
- Breadcrumb lub link powrotu do listy
- Pełny prompt czytelnie sformatowany
- Wyraźne statystyki (ikony + liczby)
- Potwierdzenie przed usunięciem z informacją o kaskadzie

**Bezpieczeństwo:**
- Usunięcie generacji wymaga potwierdzenia
- Informacja że usunięcie usuwa też powiązane fiszki

**Mapowanie API:**
- `GET /generations/{id}` - pobranie szczegółów
- `DELETE /generations/{id}` - usuwanie

---

### 2.7 Widok profilu

| Atrybut | Wartość |
|---------|---------|
| **Ścieżka** | `/profile` |
| **Cel** | Zarządzanie kontem i preferencjami użytkownika |
| **Dostęp** | Tylko zalogowani |

**Kluczowe informacje:**
- Aktualny email użytkownika
- Ustawienie locale (pl/en)
- Sekcja usunięcia konta

**Komponenty:**
- `ProfileForm` - formularz z danymi profilu
- `EmailField` - pole email (edytowalne)
- `LocaleSelector` - dropdown wyboru języka (pl/en)
- `SaveButton` - przycisk zapisu zmian
- `DangerZone` - sekcja niebezpiecznych operacji
- `DeleteAccountButton` - przycisk usunięcia konta
- `DeleteAccountModal` - modal potwierdzenia usunięcia (wpisanie "USUŃ")

**UX/Dostępność:**
- Jasny podział na sekcje (dane, preferencje, danger zone)
- Natychmiastowy feedback po zapisie (toast)
- Danger zone wizualnie wyróżniona (czerwona ramka)
- Modal usunięcia konta wymaga wpisania "USUŃ" dla potwierdzenia

**Bezpieczeństwo:**
- Zmiana email może wymagać weryfikacji (Supabase Auth)
- Usunięcie konta wymaga dodatkowego potwierdzenia
- Informacja o trwałym usunięciu wszystkich danych (RODO)

**Mapowanie API:**
- `GET /profile` - pobranie profilu
- `PATCH /profile` - zmiana locale
- (Supabase Auth) - zmiana email, usunięcie konta

---

## 3. Mapa podróży użytkownika

### 3.1 Główny przepływ: Generowanie fiszek AI

```
[Niezalogowany]
     │
     ▼
┌─────────────┐    nie ma konta    ┌──────────────┐
│   /login    │ ─────────────────► │  /register   │
│  Logowanie  │                    │  Rejestracja │
└──────┬──────┘                    └──────┬───────┘
       │ sukces                           │ sukces
       │◄─────────────────────────────────┘
       ▼
┌─────────────────┐
│    /generate    │◄──────────────────────────────┐
│ Generuj fiszki  │                               │
└────────┬────────┘                               │
         │                                        │
         ▼                                        │
   Wklej tekst                                    │
   (1000-10000 znaków)                            │
         │                                        │
         ▼                                        │
   Kliknij "Generuj"                              │
         │                                        │
         ▼                                        │
   [Loader - POST /generations]                   │
         │                                        │
         ▼                                        │
   Wyświetl propozycje                            │
         │                                        │
    ┌────┴────┬────────────┐                      │
    ▼         ▼            ▼                      │
Akceptuj   Edytuj      Odrzuć                     │
    │         │            │                      │
    └────┬────┴────────────┘                      │
         ▼                                        │
   "Zapisz zaakceptowane"                         │
         │                                        │
         ▼                                        │
   [POST /cards - bulk]                           │
         │                                        │
         ▼                                        │
   Toast sukcesu ──────────────────────────────────┘
         │
         ▼
   Opcjonalnie: przejdź do /cards
```

### 3.2 Przepływ: Tworzenie fiszki ręcznie

```
┌──────────────┐
│    /cards    │
│ Moje fiszki  │
└──────┬───────┘
       │
       ▼
  Kliknij "Dodaj fiszkę"
       │
       ▼
┌──────────────────┐
│ CreateCardModal  │
│  Front + Back    │
│  (liczniki)      │
└────────┬─────────┘
         │
         ▼
   Wypełnij pola
   Kliknij "Zapisz"
         │
         ▼
   [POST /cards]
         │
         ▼
   Modal zamknięty
   Lista odświeżona
   Toast sukcesu
```

### 3.3 Przepływ: Edycja fiszki

```
┌──────────────┐
│    /cards    │
│ Moje fiszki  │
└──────┬───────┘
       │
       ▼
  Kliknij "Edytuj" na fiszce
       │
       ▼
  InlineEditor aktywny
  (front + back edytowalne)
       │
  ┌────┴────┐
  ▼         ▼
Zapisz    Anuluj
  │         │
  ▼         │
[PATCH]     │
  │         │
  └────┬────┘
       ▼
  Widok normalny
  Toast sukcesu (jeśli zapisano)
```

### 3.4 Przepływ: Usuwanie fiszki

```
┌──────────────┐
│    /cards    │
└──────┬───────┘
       │
       ▼
  Kliknij "Usuń" na fiszce
       │
       ▼
  InlineConfirmation
  "Potwierdź | Anuluj"
  (timeout 5s)
       │
  ┌────┴────┐
  ▼         ▼
Potwierdź  Anuluj/timeout
  │         │
  ▼         │
[DELETE]    │
  │         │
  └────┬────┘
       ▼
  Toast sukcesu (jeśli usunięto)
```

### 3.5 Przepływ: Przeglądanie historii generacji

```
┌─────────────────┐
│  /generations   │
│ Historia gen.   │
└────────┬────────┘
         │
         ▼
  Lista generacji
  (data, prompt truncated, statystyki)
         │
         ▼
  Kliknij w wiersz
         │
         ▼
┌─────────────────────┐
│ /generations/{id}   │
│ Szczegóły generacji │
└─────────┬───────────┘
          │
          ▼
   Pełny prompt + statystyki
          │
     ┌────┴────┐
     ▼         ▼
 "Pokaż     "Usuń"
 fiszki"      │
     │        ▼
     │   InlineConfirmation
     │        │
     │        ▼
     │   [DELETE /generations/{id}]
     │        │
     ▼        ▼
  /cards?generation_id=X
  (filtrowana lista)
```

---

## 4. Układ i struktura nawigacji

### 4.1 Layout główny

```
┌────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────┐ │
│ │           STICKY HEADER                    │ │
│ │  Logo    Nav Items    Profile Dropdown     │ │
│ └────────────────────────────────────────────┘ │
├────────────────────────────────────────────────┤
│                                                │
│                MAIN CONTENT                    │
│                                                │
│     (zawartość zależna od aktualnego widoku)   │
│                                                │
└────────────────────────────────────────────────┘
```

### 4.2 Nawigacja dla niezalogowanych

```
┌─────────────────────────────────────────────────┐
│  [Logo 10x-cards]              [Zaloguj się]    │
│                                [Zarejestruj]    │
└─────────────────────────────────────────────────┘
```

### 4.3 Nawigacja dla zalogowanych

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]  [Generuj fiszki] [Moje fiszki] [Historia]  [👤▼] │
└──────────────────────────────────────────────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │ user@email.com  │
                                              │ ────────────────│
                                              │ Mój profil      │
                                              │ Wyloguj się     │
                                              └─────────────────┘
```

### 4.4 Aktywny stan nawigacji

- Aktualny widok wyróżniony wizualnie (underline/bold/kolor)
- "Generuj fiszki" jako domyślny po zalogowaniu

### 4.5 Responsywność nawigacji

**Mobile (< 768px):**
```
┌─────────────────────────────────┐
│ [Logo]              [☰ Menu]   │
└─────────────────────────────────┘
                          │
                  ┌───────▼───────┐
                  │ Generuj fiszki│
                  │ Moje fiszki   │
                  │ Historia      │
                  │ Mój profil    │
                  │ ──────────────│
                  │ Wyloguj       │
                  └───────────────┘
```

---

## 5. Kluczowe komponenty

### 5.1 Komponenty layoutu

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `MainLayout` | Główny layout z header i main content area | Wszystkie strony |
| `StickyHeader` | Nawigacja sticky u góry strony | MainLayout |
| `NavLink` | Link nawigacyjny z aktywnym stanem | StickyHeader |
| `UserMenu` | Dropdown z linkiem do profilu i wylogowaniem | StickyHeader |
| `MobileMenu` | Rozwijane menu na mobile | StickyHeader |

### 5.2 Komponenty formularzy

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `FormField` | Pole formularza z labelem i inline error | Login, Register, CreateCardModal |
| `CharacterCounter` | Licznik znaków z kolorowym feedbackiem | PromptForm, CreateCardModal, InlineEditor |
| `SubmitButton` | Przycisk submit z loading state | Wszystkie formularze |
| `PromptForm` | Textarea + przycisk generowania | /generate |

### 5.3 Komponenty fiszek

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `CardGrid` | Responsywny grid (1-4 kolumny) | /cards |
| `FlashCard` | Pojedyncza fiszka z front/back/akcje | CardGrid |
| `SourceBadge` | Badge źródła (manual/ai_created/ai_edited) | FlashCard |
| `InlineEditor` | Edycja inline na karcie | FlashCard |
| `CreateCardModal` | Modal tworzenia fiszki | /cards |

### 5.4 Komponenty propozycji AI

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `ProposalList` | Lista propozycji od AI | /generate |
| `ProposalCard` | Pojedyncza propozycja z akcjami | ProposalList |
| `BulkActions` | Akcje zbiorcze (akceptuj/odrzuć wszystkie, zapisz) | /generate |

### 5.5 Komponenty nawigacji danych

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `PaginationControls` | Numerowana paginacja + page size | /cards, /generations |
| `SearchInput` | Pole wyszukiwania z debounce | /cards |
| `FilterBar` | Filtry (source, generation_id) | /cards |

### 5.6 Komponenty generacji

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `GenerationList` | Lista generacji | /generations |
| `GenerationItem` | Klikalny wiersz generacji ze statystykami | GenerationList |
| `GenerationDetails` | Szczegóły generacji z pełnym promptem | /generations/{id} |
| `PromptDisplay` | Wyświetlenie pełnego promptu | GenerationDetails |
| `StatisticsCard` | Karta ze statystykami | GenerationDetails |
| `StatusBadge` | Badge statusu (processing/completed) | GenerationItem, GenerationDetails |
| `BackLink` | Link powrotu do listy | GenerationDetails |

### 5.7 Komponenty feedbacku

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `ToastProvider` | Kontekst dla toast notifications | MainLayout |
| `Toast` | Pojedyncze powiadomienie toast | Globalnie |
| `LoadingOverlay` | Overlay z loaderem | PromptForm |
| `InlineConfirmation` | Potwierdzenie inline (Potwierdź/Anuluj) | FlashCard, GenerationDetails |
| `EmptyState` | Stan pusty z ilustracją i CTA | /cards, /generations |
| `ErrorMessage` | Komunikat błędu z opcją retry | PromptForm, formularze |

### 5.8 Komponenty profilu

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `ProfileForm` | Formularz danych profilu | /profile |
| `LocaleSelector` | Dropdown wyboru języka (pl/en) | ProfileForm |
| `DangerZone` | Sekcja niebezpiecznych operacji | /profile |
| `DeleteAccountButton` | Przycisk inicjujący usunięcie konta | DangerZone |
| `DeleteAccountModal` | Modal potwierdzenia usunięcia konta | /profile |

### 5.9 Komponenty modali

| Komponent | Opis | Używany w |
|-----------|------|-----------|
| `Modal` | Bazowy modal (zamykany tylko przyciskiem) | CreateCardModal, DeleteAccountModal |
| `CreateCardModal` | Modal tworzenia fiszki | /cards |
| `DeleteAccountModal` | Modal potwierdzenia usunięcia konta | /profile |

---

## 6. Mapowanie wymagań na UI

### 6.1 User Stories → Komponenty

| US ID | Tytuł | Widok | Komponenty |
|-------|-------|-------|------------|
| US-001 | Rejestracja konta | `/register` | RegisterForm, FormField, SubmitButton |
| US-002 | Logowanie | `/login` | LoginForm, FormField, SubmitButton |
| US-003 | Generowanie fiszek AI | `/generate` | PromptForm, CharacterCounter, LoadingOverlay |
| US-004 | Przegląd propozycji | `/generate` | ProposalList, ProposalCard, BulkActions |
| US-005 | Edycja fiszek | `/cards` | FlashCard, InlineEditor |
| US-006 | Usuwanie fiszek | `/cards` | FlashCard, InlineConfirmation |
| US-007 | Tworzenie ręczne | `/cards` | CreateCardModal, FormField |
| US-009 | Bezpieczny dostęp | Wszystkie | StickyHeader, middleware |

---

## 7. Obsługa stanów i błędów

### 7.1 Stany ładowania

| Kontekst | Komponent | Zachowanie |
|----------|-----------|------------|
| Generowanie AI | LoadingOverlay | Blokujący overlay na PromptForm |
| Pobieranie listy | Skeleton/Spinner | W miejscu CardGrid/GenerationList |
| Akcje CRUD | SubmitButton | Disabled + spinner na przycisku |

### 7.2 Stany błędów

| Błąd | HTTP | Obsługa UI |
|------|------|------------|
| Walidacja | 400/422 | Inline error przy polu |
| Nieautoryzowany | 401 | Redirect do /login |
| Forbidden | 403 | Toast + redirect |
| Not found | 404 | EmptyState lub redirect |
| Duplikat promptu | 409 | Dedykowany komunikat inline |
| Błąd AI | 500 | ErrorMessage z przyciskiem retry |
| Rate limit | 429 | Toast z informacją o czekaniu |

### 7.3 Stany puste

| Widok | EmptyState CTA |
|-------|----------------|
| /cards (brak fiszek) | "Wygeneruj pierwsze fiszki" → /generate |
| /cards (brak wyników filtra) | "Zmień kryteria wyszukiwania" |
| /generations (brak generacji) | "Rozpocznij od wklejenia tekstu" → /generate |
| Propozycje (wszystkie odrzucone) | "Wygeneruj ponownie" lub "Utwórz ręcznie" |

---

## 8. Responsywność

### 8.1 Breakpoints

| Nazwa | Szerokość | Grid fiszek | Uwagi |
|-------|-----------|-------------|-------|
| Mobile | < 640px | 1 kolumna | Pełna szerokość, menu hamburger |
| Tablet | 640-1023px | 2 kolumny | Widoczna nawigacja |
| Desktop | 1024-1279px | 3 kolumny | Pełna nawigacja |
| Large | ≥ 1280px | 4 kolumny | Max-width container |

### 8.2 Elementy responsywne

| Element | Mobile | Desktop |
|---------|--------|---------|
| Nawigacja | Hamburger menu | Pełny header |
| PromptForm textarea | min-height: 150px | min-height: 200px |
| Przyciski formularzy | Pełna szerokość | Auto width |
| FilterBar | Stack pionowy | Inline horizontal |
| PaginationControls | Uproszczona | Pełna z numerami |

---

## 9. Dostępność (a11y)

### 9.1 Wymagania

- Semantic HTML (nav, main, article, button vs div)
- ARIA labels dla interaktywnych elementów
- Focus visible dla wszystkich focusable elements
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Color contrast minimum 4.5:1
- Skip links do main content

### 9.2 Focus management

| Akcja | Focus po akcji |
|-------|----------------|
| Otwarcie modala | Pierwszy focusable w modalu |
| Zamknięcie modala | Element który otworzył modal |
| Usunięcie fiszki | Następna fiszka lub EmptyState |
| Zapisanie propozycji | Komunikat sukcesu lub PromptForm |

---

## 10. Bezpieczeństwo UI

### 10.1 Chronione ścieżki

| Ścieżka | Wymagane | Redirect jeśli brak |
|---------|----------|---------------------|
| `/generate` | Zalogowany | `/login` |
| `/cards` | Zalogowany | `/login` |
| `/generations` | Zalogowany | `/login` |
| `/generations/{id}` | Zalogowany | `/login` |
| `/profile` | Zalogowany | `/login` |
| `/login` | Niezalogowany | `/generate` |
| `/register` | Niezalogowany | `/generate` |

### 10.2 Walidacja danych

- Wszystkie inputy walidowane przed wysłaniem
- Limity znaków wymuszane przez CharacterCounter
- Sanityzacja danych przed wyświetleniem (XSS)
- CSRF protection przez Supabase Auth

### 10.3 Wrażliwe operacje

| Operacja | Zabezpieczenie |
|----------|----------------|
| Usunięcie fiszki | InlineConfirmation |
| Usunięcie generacji | InlineConfirmation + info o kaskadzie |
| Usunięcie konta | Modal + wpisanie "USUŃ" |
| Wylogowanie | Natychmiastowe, bez potwierdzenia |
