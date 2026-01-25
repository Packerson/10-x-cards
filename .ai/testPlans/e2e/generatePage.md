## Podsumowanie konwersacji (E2E Generate)

### Zakres i cel
- Stworzono mapę komponentów `src/components/generate` oraz przygotowano selektory i POM dla testów e2e.
- Zrealizowano scenariusze: logowanie, przejście do `/generate`, walidacje długości promptu, generowanie propozycji, akceptacja zbiorcza, zapis i weryfikacja na `/cards`, oraz błąd duplikatu promptu.

### Drzewo komponentów (ASCII, skrót)
- `GenerateView`
  - `PromptForm` (textarea, licznik, przycisk)
  - `LoadingOverlay` (gdy generowanie)
  - `ErrorMessage` (gdy błąd)
  - `ProposalSection` (gdy są propozycje)
    - `ProposalStats`
    - `BulkActions` (accept all / reject all / save)
    - `ProposalList` -> `ProposalCard` (akcje accept/edit/reject)
  - `Empty state` (brak propozycji)

### Data-testid dodane do UI (kluczowe selektory)
- Header: `site-header`, `header-logo`, `header-nav-desktop`, `header-nav-mobile`,
  `header-nav-login`, `header-nav-register`, `header-nav-generate`,
  `header-nav-cards`, `header-nav-history`
- Generate:
  - `generate-view`, `generate-prompt-section`, `generate-prompt-form`
  - `generate-prompt-input`, `generate-prompt-counter`, `generate-submit`
  - `generate-loading`, `generate-error`, `generate-empty-state`
- Proposals:
  - `proposal-section`, `proposal-header`, `proposal-list`
  - `proposal-item-{id}`, `proposal-card-{id}`
  - `proposal-bulk-actions`, `proposal-accept-all`, `proposal-reject-all`,
    `proposal-save-accepted`
  - `proposal-accept`, `proposal-edit`, `proposal-reject`

### POM (Page Object Model)
- `tests/e2e/page-objects/HeaderNav.ts`
  - scoped do desktopowej nawigacji przez `header-nav-desktop`
  - metody: `goToGenerate()`, `goToCards()`
- `tests/e2e/page-objects/GeneratePage.ts`
  - lokatory dla promptu, loadera, błędu, listy propozycji i bulk actions
  - pomocniczo: `goto()`, `fillPrompt()`, `submitPrompt()`, `proposalCardById()`
- `tests/e2e/page-objects/CardsPage.ts`
  - rozszerzony o `flashcardCount()`

### Testy E2E
- `tests/e2e/generate.spec.ts`
  - Ustawiony viewport desktop: `1280x720`
  - Wymagane envy: `SUPABASE_URL`, `SUPABASE_KEY`, `E2E_USERNAME`, `E2E_PASSWORD`
  - Reużywane helpery z `cards.spec.ts`: logowanie i czyszczenie kart
  - Losowy prompt:
    - `buildRandomPrompt(length)` aby uniknąć błędu duplikatu
  - Timeouts:
    - `loadingOverlay` i `proposalItems` z timeoutem `30000ms`
  - Scenariusze:
    - happy path (walidacje min/max, generowanie 10 propozycji,
      akceptuj wszystkie, zapisz, weryfikuj 10 kart na `/cards`)
    - błąd duplikatu promptu (oczekiwany komunikat)

### Wnioski i pułapki
- Link w headerze był niewidoczny z powodu selektora bez testId na desktop;
  rozwiązanie: przekazanie `testId` do `NavLink` w mapie desktopowej
  + scoping do `header-nav-desktop`.
- Generator bywa wolny: używaj zwiększonych timeoutów dla `generate-loading`
  oraz `proposalItems`.
- Prompt musi być losowy; stały prompt generuje błąd duplikatu i 0 propozycji.

### Wzorce do kolejnych testów
- Zawsze używaj `getByTestId` (zgodnie z regułą Playwright).
- Dla nawigacji desktopowej korzystaj z `HeaderNav`.
- Dla `/generate` używaj `GeneratePage`, a dla `/cards` — `CardsPage`.
- Walidacje długości promptu:
  - 1000 i 10000 -> submit enabled
  - 0 i >10000 -> submit disabled
*** End Patch
