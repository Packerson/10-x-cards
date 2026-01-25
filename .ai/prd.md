# Dokument wymagań produktu (PRD) – 10x-cards

## 1. Przegląd produktu
Projekt 10x-cards ma na celu umożliwienie użytkownikom szybkiego tworzenia i zarządzania zestawami fiszek edukacyjnych. Aplikacja wykorzystuje modele LLM (poprzez API) do generowania sugestii fiszek na podstawie dostarczonego tekstu.

## 2. Problem użytkownika
Manualne tworzenie wysokiej jakości fiszek wymaga dużych nakładów czasu i wysiłku, co zniechęca do korzystania z efektywnej metody nauki, jaką jest spaced repetition. Celem rozwiązania jest skrócenie czasu potrzebnego na tworzenie odpowiednich pytań i odpowiedzi oraz uproszczenie procesu zarządzania materiałem do nauki.

## 3. Wymagania funkcjonalne
1. Automatyczne generowanie fiszek:
   - Użytkownik wkleja dowolny tekst (np. fragment podręcznika).
   - Aplikacja wysyła tekst do modelu LLM za pośrednictwem API.
   - Model LLM proponuje zestaw fiszek (pytania i odpowiedzi).
   - Fiszki są przedstawiane użytkownikowi w formie listy z możliwością akceptacji, edycji lub odrzucenia.

2. Ręczne tworzenie i zarządzanie fiszkami:
   - Formularz do ręcznego tworzenia fiszek (przód i tył fiszki).
   - Opcje edycji i usuwania istniejących fiszek.
   - Ręczne tworzenie i wyświetlanie w ramach widoku listy "Moje fiszki"

3. Podstawowy system uwierzytelniania i kont użytkowników:
   - Rejestracja i logowanie.
   - Możliwość usunięcia konta i powiązanych fiszek na życzenie.

4. Podstawowe sesje nauki (MVP):
   - Użytkownik może tworzyć sesje nauki i wznawiać je od ostatniej fiszki.
   - Zaawansowany algorytm powtórek (spaced-repetition) pozostaje poza MVP.

5. Kategorie i talie (MVP):
   - Użytkownik może tworzyć, edytować i usuwać własne kategorie.
   - Użytkownik może tworzyć, edytować i usuwać własne talie (decki).

6. Przechowywanie i skalowalność:
   - Dane o fiszkach i użytkownikach przechowywane w sposób zapewniający skalowalność i bezpieczeństwo.

7. Statystyki generowania fiszek:
   - Zbieranie informacji o tym, ile fiszek zostało wygenerowanych przez AI i ile z nich ostatecznie zaakceptowano.

8. Wymagania prawne i ograniczenia:
   - Dane osobowe użytkowników i fiszek przechowywane zgodnie z RODO.
   - Prawo do wglądu i usunięcia danych (konto wraz z fiszkami) na wniosek użytkownika.

## 4. Granice produktu
1. Poza zakresem MVP:
   - Zaawansowany, własny algorytm powtórek (korzystamy z gotowego rozwiązania, biblioteki open-source).
   - Mechanizmy gamifikacji.
   - Aplikacje mobilne (obecnie tylko wersja web).
   - Import wielu formatów dokumentów (PDF, DOCX itp.).
   - Publicznie dostępne API.
   - Współdzielenie fiszek między użytkownikami.
   - Rozbudowany system powiadomień.
   - Zaawansowane wyszukiwanie fiszek po słowach kluczowych.
  - Plan rozbudowy po MVP:
    - Użytkownik wybiera liczbę propozycji fiszek do wygenerowania.
    - Przypisywanie kategorii do pojedynczej fiszki lub całej generacji.
    - Widok edycji talii (m.in. zarządzanie kolejnością fiszek w talii).
    - Planowanie sesji nauki:
      - Wybór talii do nauki; kolejność losowa lub zgodna z kolejnością ustawioną przez użytkownika.
      - Wybór kategorii do nauki; kolejność fiszek zawsze losowa.

## 5. Historyjki użytkowników

ID: US-001
Tytuł: Rejestracja konta
Opis: Jako nowy użytkownik chcę się zarejestrować, aby mieć dostęp do własnych fiszek i móc korzystać z generowania fiszek przez AI.
Kryteria akceptacji:
- Formularz rejestracyjny zawiera pola na adres e-mail i hasło.
- Użytkownik otrzymuje potwierdzenie pomyślnej rejestracji i zostaje zalogowany.
- Zostaje przekierowany na strone "/"

ID: US-002
Tytuł: Logowanie do aplikacji
Opis: Jako zarejestrowany użytkownik chcę móc się zalogować, aby mieć dostęp do moich fiszek i historii generowania.
Kryteria akceptacji:
- Po podaniu prawidłowych danych logowania użytkownik zostaje przekierowany na stronę główną "/"
- Błędne dane logowania wyświetlają komunikat o nieprawidłowych danych.
- Dane dotyczące logowania przechowywane są w bezpieczny sposób.


## US-003: Bezpieczny dostęp i uwierzytelnianie

- Tytuł: Bezpieczny dostęp
- Opis: Jako użytkownik chcę mieć możliwość rejestracji i logowania się do systemu w sposób zapewniający bezpieczeństwo moich danych.
- Kryteria akceptacji:
  - Logowanie i rejestracja odbywają się na dedykowanych stronach.
  - Logowanie wymaga podania adresu email i hasła.
  - Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła.
  - Użytkownik MOŻE korzystać z generowania fiszek AI, ma dostęp do swoich fiszek
  - Użytkownik NIE MOŻE korzystać z funkcji generowania fiszek, tworzenia ręcznie bez logowania się do systemu.
  - Użytkownik może logować się do systemu poprzez przycisk w prawym górnym rogu.
  - Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu w głównym @Layout.astro.
  - Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).
  - Odzyskiwanie hasła powinno być możliwe.


## US-004 Zalogowany user
- Tytuł: po zalgowaniu
- Co mogę po zalogowaniu:
- Kryteria akcpetacji:
   - Mam dostęp do ustawień profilu
   - mam dostęp do tryby generowania fiszek przez AI
   - mam dostęp do tworzenia/edycji/kasowanie swoich fiszek
   - mam dostęp do tworzenia/edycji/kasowanie swoich kategorii
   - mam dostęp do tworzenia/edycji/kasowanie swoich decków
   - mam dostęp do tworzenia sesji nauki i wznawiania ich od ostatniej fiszki


  ## US-005 Niezalogowany user
- Tytuł: Niezalogowany user
- OPIS: Jako niezalogowany user mam dostępn do X przykładowych fiszek
- Kryteria akceptacji:
   - Na stronie startowej jako niezalogowany user widzę opcje logowania, rejestracji, propyzcjię "Przykładowe fiszki"
   - Mogę rozpocząć sesję nauki z przykładowymi fiszkami z bazy danych. Nie mam mozliwości zapisu/zmiany kolejności, generowania nowych fiszek.

ID: US-006
Tytuł: Generowanie fiszek przy użyciu AI
Opis: Jako zalogowany użytkownik chcę wkleić kawałek tekstu i za pomocą przycisku wygenerować propozycje fiszek, aby zaoszczędzić czas na ręcznym tworzeniu pytań i odpowiedzi.
Kryteria akceptacji:
- W widoku generowania fiszek znajduje się pole tekstowe, w którym użytkownik może wkleić swój tekst.
- Pole tekstowe oczekuje od 1000 do 10 000 znaków.
- Po kliknięciu przycisku generowania aplikacja komunikuje się z API modelu LLM i wyświetla listę wygenerowanych propozycji fiszek do akceptacji przez użytkownika.
- W przypadku problemów z API lub braku odpowiedzi modelu użytkownik zobaczy stosowny komunikat o błędzie.



ID: US-007
Tytuł: Przegląd i zatwierdzanie propozycji fiszek
Opis: Jako zalogowany użytkownik chcę móc przeglądać wygenerowane fiszki i decydować, które z nich chcę dodać do mojego zestawu, aby zachować tylko przydatne pytania i odpowiedzi.
Kryteria akceptacji:
- Lista wygenerowanych fiszek jest wyświetlana pod formularzem generowania.
- Przy każdej fiszce znajduje się przycisk pozwalający na jej zatwierdzenie, edycję lub odrzucenie.
- Po zatwierdzeniu wybranych fiszek użytkownik może kliknąć przycisk zapisu i dodać je do bazy danych.

ID: US-008
Tytuł: Edycja fiszek utworzonych ręcznie i generowanych przez AI
Opis: Jako zalogowany użytkownik chcę edytować stworzone lub wygenerowane fiszki, aby poprawić ewentualne błędy lub dostosować pytania i odpowiedzi do własnych potrzeb.
Kryteria akceptacji:
- Istnieje lista zapisanych fiszek (zarówno ręcznie tworzonych, jak i zatwierdzonych wygenerowanych).
- Każdą fiszkę można kliknąć i wejść w tryb edycji.
- Zmiany są zapisywane w bazie danych po zatwierdzeniu.

ID: US-009
Tytuł: Usuwanie fiszek
Opis: Jako zalogowany użytkownik chcę usuwać zbędne fiszki, aby zachować porządek w moim zestawie.
Kryteria akceptacji:
- Przy każdej fiszce na liście (w widoku "Moje fiszki") widoczna jest opcja usunięcia.
- Po wybraniu usuwania użytkownik musi potwierdzić operację, zanim fiszka zostanie trwale usunięta.
- Fiszki zostają trwale usunięte z bazy danych po potwierdzeniu.

ID: US-010
Tytuł: Ręczne tworzenie fiszek
Opis: Jako zalogowany użytkownik chcę ręcznie stworzyć fiszkę (określając przód i tył fiszki), aby dodawać własny materiał, który nie pochodzi z automatycznie generowanych treści.
Kryteria akceptacji:
- W widoku "Moje fiszki" znajduje się przycisk dodania nowej fiszki.
- Naciśnięcie przycisku otwiera formularz z polami "Przód" i "Tył".
- Po zapisaniu nowa fiszka pojawia się na liście.

ID: US-011
Tytuł: Bezpieczny dostęp i autoryzacja
Opis: Jako zalogowany użytkownik chcę mieć pewność, że moje fiszki nie są dostępne dla innych użytkowników, aby zachować prywatność i bezpieczeństwo danych.
Kryteria akceptacji:
- Tylko zalogowany użytkownik może wyświetlać, edytować i usuwać swoje fiszki.
- Nie ma dostępu do fiszek innych użytkowników ani możliwości współdzielenia.
