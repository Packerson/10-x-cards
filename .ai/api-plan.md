# REST API Plan

## 1. Resources

| Resource | DB Table | Description |
|----------|----------|-------------|
| Profile  | `profiles` | User locale preferences and metadata (1-to-1 with `auth.users`). |
| Generation | `generations` | Prompt submissions for AI flash-card generation and aggregated stats. |
| GenerationError | `generation_errors` | Logged errors that occurred during AI generation. |
| Card | `cards` | Flash-cards created manually or by AI. |
| (Auth) User | `auth.users` | Managed by Supabase Auth – authentication only. |

## 2. Endpoints

Below table lists all endpoints; detailed schemas follow.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /generations | ✅ | Submit prompt text for AI generation. | # DONE (MOCKOWANE AI)
| GET    | /generations | ✅ | List generations (pagination, filtering). | # DONE
| GET    | /generations/{id} | ✅ | Get single generation with basic stats. | DONE
| DELETE | /generations/{id} | ✅ | Delete a generation and its cards & errors. | DONE
| GET    | /generations/{id}/errors | ✅ | List errors linked to a generation. | DONE
| POST   | /cards | ✅ | Create cards (manual or accepted AI proposals, bulk supported). # DONE
| GET    | /cards | ✅ | List cards with pagination / filtering / sorting. | DONE
| GET    | /cards/{id} | ✅ | Retrieve single card. | DONE
| PATCH  | /cards/{id} | ✅ | Update card (front, back). | DONE
| DELETE | /cards/{id} | ✅ | Delete card. | DONE
| GET    | /profile | ✅ | Get current profile. | DONE
| PATCH  | /profile | ✅ | Update profile (locale). | DONE

### 2.1 Generations

#### POST /generations
Submit a prompt to generate flash-cards.

*Request JSON*
```json
{
  "prompt_text": "string (1000-10000 chars)"
}
```
Backend assigns default `model` (currently "gpt-4o") and empty `model_settings`.
Generation is created with `status = "processing"`. After the user accepts/edits proposals and saves cards via `POST /cards`, backend marks the generation as `status = "completed"` and stores snapshot counters (`total_accepted`, `total_rejected`).

*Success 201 JSON*
```json
{
  "id": 123,
  "prompt_text": "...",
  "status": "processing",
  "total_generated": 0,
  "card_proposals": [
    { "front": "string", "back": "string", "source": "ai_created"}
  ]
}
```

Validation:
- `prompt_text` length 1000-10000 (DB CHECK). 400 on violation.
- Duplicate `(userId, promptHash)` → 409 Conflict.

#### GET /generations
Query params:
- `page` (default 1)
- `limit` (default 10)
- `sort` (`created_at|updated_at`, default `created_at`)
- `order` (`asc|desc`, default `desc`)

*Success 200 JSON*
```json
{
  "data": [ /* generation objects */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_pages": 5,
    "total_items": 42,
    "sort": "created_at",
    "order": "desc"
  }
}
```

#### GET /generations/{id}
Returns generation plus aggregated counters: `total_generated`, `total_accepted`, `total_rejected`.

#### DELETE /generations/{id}
removes generation, associated cards & errors. 204 No Content.

#### GET /generations/{id}/errors
Filterable by `error_code`.
Pagination params: `page`, `limit`, `sort` (`created_at`), `order`.

*Success 200 JSON*
```json
{
  "data": [ /* generation error objects */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_pages": 1,
    "total_items": 3,
    "sort": "created_at",
    "order": "desc"
  }
}
```

### 2.2 Cards

#### POST /cards
Accepts array for bulk insert.

*Request JSON*
```json
{
  "cards": [
    {
      "front": "string ≤200",
      "back": "string ≤500",
      "source": "manual|ai_created|ai_edited",
      "generation_id": 123            // required when source = ai_created|ai_edited; optional when manual
    }
  ]
}
```

*Success 201 JSON*
```json
{
  "inserted": 3
}
```

Validation & Errors:
- 422 if any card violates length or uniqueness `front` per user.
- If `source = ai_created|ai_edited` and no `generation_id`, 400.

#### GET /cards
Query params:
- `page` (default 1)
- `limit` (default 10)
- `source` (manual|ai_created|ai_edited)
- `generation_id`
- `search` (full-text on `front`)
- `sort` (`created_at|updated_at|front`, default `created_at`)
- `order` (`asc|desc`, default `desc`)

*Success 200 JSON*
```json
{
  "data": [ /* card objects */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_pages": 5,
    "total_items": 42,
    "sort": "created_at",
    "order": "desc"
  }
}
```

#### GET /cards/{id}
Returns full card.

#### PATCH /cards/{id}
Allows updating `front`, `back`.

Source from `ai_created` is changed to `ai_edited`
- 

#### DELETE /cards/{id}
Permanent delete; triggers DB trigger to update generation counters.

### 2.3 Profile

#### GET /profile
Returns current profile (`id`, `locale`, `created_at`).

#### PATCH /profile
```json
{ "locale": "pl|en" }
```

Returns 200 with updated profile.

## 4. Validation & Business Logic

| Resource | Rule | Source |
|----------|------|--------|
| Generation.promptText | Length 1000-10000 | DB CHECK + PRD 73 |
| Generation.promptHash | Unique per user | DB schema line 30 |
| Card.front | ≤200 chars, unique per user | DB lines 62-70 |
| Card.back | ≤500 chars | DB line 63 |
| Card.source defaulting | No status in cards; only `source` is stored | - |
| Counters update | Trigger `tr_cards_update_counters` | DB line 145 |

### Additional Business Logic
- POST /generations returns proposals (mocked in MVP; docelowo LLM).
- When the client approves proposals, it saves accepted cards via POST /cards (bulk) with `source = "ai_created"` or `source = "ai_edited"` (if the user changed the content before saving), always with `generation_id`.
- After successful POST /cards for a given `generation_id`, backend marks the generation as `status = "completed"` and stores snapshot counters:
  - `total_accepted` = number of saved AI cards (ai_created + ai_edited) linked to the generation
  - `total_rejected` = `total_generated - total_accepted`
- Deleting cards later increments `generations.total_rejected` via DB trigger (treated as "rejected/removed over time").

## 5. Errors (common)

| Code | Message |
|------|---------|
| 400  | Validation error (details in body) |
| 401  | Unauthorized – missing/invalid token |
| 403  | Forbidden – attempting to access another user’s resource |
| 404  | Not found |
| 409  | Conflict – duplicate resource |
| 422  | Unprocessable Entity – validation passed auth but failed business rule |
| 429  | Too Many Requests |
| 500  | Internal Server Error |

## 6. Pagination, Filtering, Sorting

- Wszystkie listy zwracają obiekt `{ "data": [...], "pagination": { ... } }`.
- `pagination` obejmuje: `page`, `limit`, `total_pages`, `total_items` oraz opcjonalnie `sort`, `order`.
- `page` domyślnie 1, `limit` domyślnie 10 (maks. 100).
- Nie obsługujemy kursorów – wyłącznie paginacja offsetowa.
- Parametry filtrów i listy dozwolonych pól sortowania opisano w sekcjach endpointów.

## 7. Security & Performance Considerations

- HTTPS enforced.
- JWT verification & Supabase RLS.
- Rate limiting.
- Input validation (express-validator / Zod).
- Prepared statements & parameterized queries to prevent SQL injection.
- Indexes (`cards_user_idx`, etc.) ensure fast filtering as noted in DB schema lines 90-97.
- Background job queue (e.g., Supabase Edge Functions) for AI calls to keep POST /generations fast.

---

*Assumptions*
- Deleting a generation cascades to cards & errors (DB `ON DELETE CASCADE`).
- `modelSettings` is stored verbatim; backend does not validate shape beyond JSON.
- Rejected proposals are not stored as cards; they are represented only via generation counters (snapshot on completion), and by `total_rejected` increments on later physical DELETE of cards.
