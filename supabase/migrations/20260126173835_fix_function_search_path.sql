-- migration: fix role mutable search_path in functions
-- purpose: lock down search_path for trigger functions to satisfy security warnings
-- affected objects: public.tr_cards_update_counters, public.tr_generations_set_prompt_hash
-- special notes: function bodies remain unchanged; only search_path is fixed

-- 1. tr_cards_update_counters ---------------------------------------------------------------
create or replace function public.tr_cards_update_counters()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  gid_old bigint;
begin
  gid_old := old.generation_id;

  if tg_op = 'DELETE' then
    if gid_old is null then
      return null;
    end if;

    update public.generations g set
      total_rejected = g.total_rejected + 1,
      updated_at     = now()
    where g.id = gid_old;

    return null;
  end if;

  -- insert/update: intentionally no-op for counters semantics.
  return null;
end;$$;

-- 2. tr_generations_set_prompt_hash ---------------------------------------------------------
create or replace function public.tr_generations_set_prompt_hash()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- trimming whitespace and md5() -> char(32)
  new.prompt_hash := md5(trim(both from new.prompt_text));
  return new;
end;$$;
