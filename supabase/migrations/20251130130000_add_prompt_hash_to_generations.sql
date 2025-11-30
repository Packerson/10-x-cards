-- migration: add prompt_hash to generations
-- purpose: unique per-user hash of trimmed prompt_text; auto-filled by trigger

-- 1. prerequisites ------------------------------------------------------------
-- pgcrypto extension jest już tworzona w pierwszej migracji, więc nie powtarzamy.

-- 2. kolumna ------------------------------------------------------------------
alter table public.generations
  add column prompt_hash char(32) not null;

-- 3. unikalny indeks -----------------------------------------------------------
create unique index if not exists generations_user_prompt_hash_uidx
  on public.generations (user_id, prompt_hash);

-- 4. funkcja hashująca ---------------------------------------------------------
create or replace function public.tr_generations_set_prompt_hash()
returns trigger language plpgsql as $$
begin
  -- Przycięcie białych znaków oraz md5() -> char(32)
  new.prompt_hash := md5(trim(both from new.prompt_text));
  return new;
end;$$;

-- 5. trigger ------------------------------------------------------------------
create trigger trg_generations_set_prompt_hash
before insert or update of prompt_text on public.generations
for each row execute procedure public.tr_generations_set_prompt_hash();
