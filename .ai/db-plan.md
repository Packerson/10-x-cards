# Schemat bazy danych – 10x-cards (MVP)

## 1. Tabele i kolumny

### 1.1 Enumy

- `locale_enum`: `'pl' | 'en'`
- `card_source_enum`: `'manual' | 'ai_created' | 'ai_edited'`
- `card_status_enum`: `'pending' | 'accepted' | 'rejected'`


### Users -> This table is managed by Supabase Auth


### 1.2 profiles

| Kolumna      | Typ          | Ograniczenia                                                  |
|--------------|--------------|---------------------------------------------------------------|
| `id`         | uuid         | PK, FK → `auth.users.id`, ON DELETE CASCADE                  |
| `locale`     | locale_enum  | NOT NULL, DEFAULT `'pl'`                                      |
| `created_at` | timestamptz  | NOT NULL, DEFAULT `now()`                                     |

### 1.3 prompts

| Kolumna            | Typ            | Ograniczenia                                                  |
|--------------------|----------------|---------------------------------------------------------------|
| `id`               | uuid           | PK, DEFAULT `gen_random_uuid()                    |
| `user_id`          | uuid           | NOT NULL, FK → `auth.users.id`, ON DELETE CASCADE            |
| `prompt_text`      | text           | NOT NULL                                                     |
| `model`            | text           | NOT NULL                                                     |
| `model_settings`   | jsonb          | NOT NULL                                                     |
| `cost_usd`         | numeric(10,4)  | NOT NULL DEFAULT 0                                           |
| `duration_ms`      | integer        | NOT NULL DEFAULT 0                                           |
| `total_generated`  | integer        | NOT NULL DEFAULT 0                                           |
| `total_accepted`   | integer        | NOT NULL DEFAULT 0                                           |
| `total_deleted`    | integer        | NOT NULL DEFAULT 0                                           |
| `created_at`       | timestamptz    | NOT NULL DEFAULT `now()`                                     |

### 1.4 prompt_errors

| Kolumna          | Typ    | Ograniczenia                                               |
|------------------|--------|------------------------------------------------------------|
| `id`             | uuid   | PK, DEFAULT `gen_random_uuid()`                            |
| `prompt_id`      | uuid   | NOT NULL, FK → `prompts.id`, ON DELETE CASCADE            |
| `error_code`     | text   | NOT NULL                                                  |
| `error_message`  | text   | NOT NULL                                                  |
| `created_at`     | timestamptz | NOT NULL DEFAULT `now()`                              |

### 1.5 cards

| Kolumna       | Typ              | Ograniczenia                                                                                                   |
|---------------|------------------|----------------------------------------------------------------------------------------------------------------|
| `id`          | uuid             | PK, DEFAULT `gen_random_uuid()`                                                                                |
| `user_id`     | uuid             | NOT NULL, FK → `auth.users.id`, ON DELETE CASCADE                                                             |
| `prompt_id`   | uuid             | FK → `prompts.id`, ON DELETE SET NULL                                                                        |
| `deck_id`     | uuid             | NULL (przyszła FK → `decks.id`)                                                                               |
| `front`       | varchar(200)     | NOT NULL, CHECK `char_length(front) ≤ 200`                                                                     |
| `back`        | varchar(500)     | NOT NULL, CHECK `char_length(back) ≤ 500`                                                                     |
| `source`      | card_source_enum | NOT NULL                                                                                                      |
| `status`      | card_status_enum | NOT NULL                                                                                                      |
| `created_at`  | timestamptz      | NOT NULL DEFAULT `now()`                                                                                       |
| `updated_at`  | timestamptz      | NOT NULL DEFAULT `now()`                                                                                       |

**Unikalność:** `UNIQUE (user_id, front)` – brak duplikatów fiszek o tym samym przodzie dla danego użytkownika.

### 1.6 (opcjonalne, puste na MVP) – pozostałe tabele

- `decks(id uuid PK, user_id uuid FK → auth.users.id, name text ...)`
- `tags(id uuid PK, name text UNIQUE)`
- `card_tags(card_id uuid FK → cards.id, tag_id uuid FK → tags.id, PRIMARY KEY(card_id, tag_id))`

## 2. Relacje między tabelami

1. `auth.users 1 ── 1 profiles`
2. `auth.users 1 ── N prompts`
3. `prompts 1 ── N prompt_errors`
4. `prompts 1 ── N cards`
5. `auth.users 1 ── N cards`
6. (przyszłość) `decks 1 ── N cards`
7. (przyszłość) `cards N ── N tags` (poprzez `card_tags`)

## 3. Indeksy

| Tabela | Indeks | Pozytywne skutki |
|--------|--------|------------------|
| `cards` | `cards_user_idx` (`user_id`) | szybkie pobieranie fiszek użytkownika |
| `cards` | `cards_user_source_idx` (`user_id`, `source`) | filtrowanie po źródle |
| `cards` | `cards_user_status_idx` (`user_id`, `status`) | filtrowanie po statusie |
| `cards` | `cards_prompt_idx` (`prompt_id`) | szybkie powiązanie karta → prompt |
| `prompts` | `prompts_user_idx` (`user_id`) | listowanie promptów użytkownika |
| `prompt_errors` | `prompt_errors_prompt_idx` (`prompt_id`) | analityka błędów |

(Przyszłość) partycjonowanie `cards` po `user_id` lub `created_at`.

## 4. Zasady RLS

Zakładamy, że Supabase ma włączone RLS.

### 4.1 profiles
```
ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are self-only" ON profiles
FOR SELECT USING ( id = auth.uid() );
CREATE POLICY "Insert profile for self" ON profiles
FOR INSERT WITH CHECK ( id = auth.uid() );
```

### 4.2 prompts
```
ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can CRUD" ON prompts
FOR ALL USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );
```

### 4.3 prompt_errors
```
ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can SELECT" ON prompt_errors
FOR SELECT USING ( prompt_id IN ( SELECT id FROM prompts WHERE user_id = auth.uid() ) );
```

### 4.4 cards
```
ENABLE ROW LEVEL SECURITY;
-- SELECT / UPDATE / DELETE wyłącznie własnych kart
CREATE POLICY "Owner can CRUD" ON cards
FOR ALL USING ( user_id = auth.uid() ) WITH CHECK ( user_id = auth.uid() );
```

### 4.5 Przejścia statusu i źródła (funkcja + polityka)

Funkcja `fn_validate_card_update()` blokuje:
- zmianę `source` poza `ai_created → ai_edited`
- inne przejścia `status` niż `pending → accepted|rejected`

Polityka UPDATE wywołuje funkcję w klauzuli `WITH CHECK`.

## 5. Dodatkowe uwagi
- tabela users is managed by Supabase Auth!

- **Triggery**:
  - `tr_cards_default_status` – przed `INSERT`: jeśli `source = 'ai_created'` ustawia `status = 'pending'`, w przeciwnym razie `status = 'accepted'`.
  - `tr_cards_update_counters` – po `INSERT/UPDATE/DELETE` na `cards`: aktualizuje liczniki `total_generated | accepted | deleted` w tabeli `prompts`.
- **Walidacja długości**: CHECK-constrainty zapewniają limity znaków zamiast aplikacji.
- **Koszty i czas**: precyzja `numeric(10,4)` pozwala na śledzenie kosztu do 0.0001 USD.
- **Rozszerzalność**: kolumna `deck_id` i puste tabele `decks`, `tags`, `card_tags` przygotowują bazę pod przyszłe funkcje bez wymuszania zależności w MVP.
- **Bezpieczeństwo**: brak wglądu w dane innych użytkowników dzięki RLS; wszystkie FK używają `ON DELETE CASCADE` lub `SET NULL`, co ułatwia usuwanie konta.
