<architecture_analysis>
Komponenty i elementy z dokumentów:
- Strony Astro: Strona logowania, Strona rejestracji, Strona odzyskania hasła, Strona resetu hasła.
- Komponenty React auth: LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, indeks eksportów.
- Layout i nawigacja: Layout, UserMenu, MobileMenu, NavLink.
- Widoki produktu: Strona startowa z CTA logowania, rejestracji i przykładowych fiszek, widok generowania fiszek, widok fiszek, profil, kategorie, decki, sesje nauki.
- Moduły stanu: middleware SSR z isAuthenticated, klient Supabase, serwis auth.

Główne strony i komponenty:
- Strona startowa korzysta z Layout i nawigacji oraz CTA do logowania i rejestracji.
- Strony logowania i rejestracji zawierają Layout i pojedynczy formularz React.
- Strony odzyskania i resetu hasła obsługują odzyskiwanie dostępu.
- Widoki chronione (generowanie, fiszki, profil, kategorie, decki, sesje) opierają się o Layout i stan sesji.

Przepływ danych:
- Middleware SSR pobiera stan sesji i przekazuje isAuthenticated do Layout.
- Middleware SSR steruje dostępem: chronione widoki przekierowują niezalogowanych do logowania, a strony logowania/rejestracji przekierowują zalogowanych do generowania.
- Layout decyduje o wyświetleniu CTA logowania/rejestracji lub UserMenu z akcją wylogowania.
- Formularze logowania, rejestracji i resetu hasła wywołują serwis auth, który komunikuje się z Supabase Auth; sukces przekierowuje do generowania.
- CTA prowadzi do przykładowych fiszek dostępnych dla każdego, bez zapisu postępu na backendzie.

Opis funkcjonalności:
- Layout: wspólny szkielet UI i nawigacja.
- UserMenu: akcje użytkownika, w tym wylogowanie i profil.
- MobileMenu i NavLink: linki nawigacyjne zależne od stanu sesji.
- Formularze auth: walidacja i akcje logowania, rejestracji oraz resetu hasła.
- Middleware SSR: źródło stanu isAuthenticated dla UI.
- Serwis auth i klient Supabase: realizacja przepływów logowania, rejestracji i resetu hasła.
</architecture_analysis>

<mermaid_diagram>
```mermaid
flowchart TD
  subgraph "Strony Astro"
    A1["Strona startowa"]
    A2["Logowanie"]
    A3["Rejestracja"]
    A4["Odzyskanie hasła"]
    A5["Reset hasła"]
    A7["Generowanie fiszek"]
    A8["Moje fiszki"]
    A9["Profil"]
    A10["Kategorie"]
    A11["Decki"]
    A12["Sesje nauki"]
    A13["Przykładowe fiszki (publiczne)"]
  end

  subgraph "Komponenty Auth React"
    B1["LoginForm"]
    B2["RegisterForm"]
    B3["ForgotPasswordForm"]
    B4["ResetPasswordForm"]
  end

  subgraph "Layout i nawigacja"
    C1["Layout"]
    C2["Header"]
    C3["UserMenu"]
    C4["MobileMenu"]
    C5["NavLink"]
    C6["Akcja Wyloguj"]
  end

  subgraph "Moduły stanu i usług"
    D1["Middleware SSR"]
    D2["Serwis auth"]
    D3["Klient Supabase"]
    D4["Supabase Auth"]
  end

  subgraph "Funkcje non-auth"
    E1["CTA logowania"]
    E2["CTA rejestracji"]
    E3["CTA przykładowych fiszek"]
  end

  subgraph "Kontrola dostępu"
    F1{Zalogowany?}
    F2{Niezalogowany?}
    F3["Przekierowanie do Generowania"]
    F4["Przekierowanie do Logowania"]
    F5["Przekierowanie do Start"]
    F6["Link resetu hasła"]
  end

  A1 --> C1
  A2 --> C1
  A3 --> C1
  A4 --> C1
  A5 --> C1
  A7 --> C1
  A8 --> C1
  A9 --> C1
  A10 --> C1
  A11 --> C1
  A12 --> C1
  A13 --> C1

  C1 --> C2
  C2 --> C3
  C2 --> C4
  C4 --> C5
  C3 --> C6

  A2 --> B1
  A3 --> B2
  A4 --> B3
  A5 --> B4

  B1 --> D2
  B2 --> D2
  B3 --> D2
  B4 --> D2
  D2 --> D3
  D3 --> D4
  C6 --> D2

  D1 --> C1
  D1 --> C3
  D1 --> C4
  D1 --> F1
  D1 --> F2

  A1 --> E1
  A1 --> E2
  A1 --> E3

  E1 --> A2
  E2 --> A3
  E3 --> A13

  F1 --Tak--> A7
  F1 --Tak--> A8
  F1 --Tak--> A9
  F1 --Tak--> A10
  F1 --Tak--> A11
  F1 --Tak--> A12
  F1 --Nie--> F4
  F4 --> A2

  F2 --Tak--> A2
  F2 --Tak--> A3
  F2 --Tak--> A4
  F2 --Tak--> A5
  F2 --Nie--> F3
  F3 --> A7

  B1 --> F3
  B2 --> F3
  B4 --> F3

  B3 --> F6
  F6 --> A5

  C6 --> F5
  F5 --> A1

  classDef updated fill:#f96,stroke:#333,stroke-width:2px;
  class A2,A3,A4,A5,B1,B2,B3,B4,C1,C2,C3,C4,C5,C6 updated;
```
</mermaid_diagram>
