## Podsumowanie prac e2e - Cards Page

### Zakres i założenia
- Celem było przygotowanie pod testy e2e stabilnych selektorow i POM pod flow uzytkownika.
- Flow uwzglednia logowanie przez UI (strona `/auth/login`) oraz operacje na `/cards`.
- Testy korzystaja z `data-testid` i `page.getByTestId()` zgodnie z zasadami.

### Kluczowe selektory `data-testid`
- `cards-add-button`
- `create-card-modal`
- `create-card-front-input`
- `create-card-back-input`
- `create-card-submit`
- `create-card-cancel`
- `create-card-close`
- `cards-empty-state`
- `cards-grid`
- `flashcard-${card.id}`
- `flashcard-delete-${card.id}`
- `inline-delete-confirmation`
- `inline-delete-confirm`
- `inline-delete-cancel`
- `login-form`
- `login-email-input`
- `login-password-input`
- `login-submit`

### POM (Page Object Model)
- `tests/e2e/page-objects/BasePage.ts` - wspolna baza (root, waitForLoad).
- `tests/e2e/page-objects/CardsPage.ts` - lokatory i akcje dla cards.
- `tests/e2e/page-objects/LoginPage.ts` - lokatory i akcje dla logowania.

### Testy i czyszczenie danych
- Testy: `tests/e2e/cards.spec.ts`
- Przed kazdym testem:
  - logowanie supabase clientem i usuniecie kart dla usera,
  - logowanie przez UI (pelny flow) na `/auth/login`,
  - wejscie na `/cards`.

### Scenariusze testowe (Cards Page)
1. **Happy path - create + delete**
   - Start: user nie ma fiszek (widoczny `cards-empty-state`).
   - Klik w `cards-add-button`, modal widoczny.
   - Wypelnij `create-card-front-input` i `create-card-back-input` (mniej niz limity).
   - Klik `create-card-submit`.
   - Oczekiwanie na pojawienie sie fiszki w `cards-grid` (FlashCard).
   - Klik `flashcard-delete-*`, pojawia sie `inline-delete-confirmation`.
   - Klik `inline-delete-confirm`.
   - Fiszka znika, wraca `cards-empty-state`.

2. **Walidacja - pusty przod**
   - Otworz modal.
   - Pusty `create-card-front-input`, uzupelniony `create-card-back-input`.
   - `create-card-submit` pozostaje wylaczony.

3. **Walidacja - pusty tyl**
   - Otworz modal.
   - Uzupelniony `create-card-front-input`, pusty `create-card-back-input`.
   - `create-card-submit` pozostaje wylaczony.
