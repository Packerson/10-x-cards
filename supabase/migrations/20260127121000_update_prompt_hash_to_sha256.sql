-- migration: update prompt_hash to sha256
-- purpose: align hash length and trigger with app logic

begin;

drop trigger if exists trg_generations_set_prompt_hash on public.generations;
drop function if exists public.tr_generations_set_prompt_hash();

alter table public.generations
  alter column prompt_hash type char(64);

update public.generations
set prompt_hash = encode(digest(trim(both from prompt_text), 'sha256'), 'hex');

create or replace function public.tr_generations_set_prompt_hash()
returns trigger language plpgsql as $$
begin
  -- Przycięcie białych znaków oraz sha256() -> char(64)
  new.prompt_hash := encode(digest(trim(both from new.prompt_text), 'sha256'), 'hex');
  return new;
end;$$;

create trigger trg_generations_set_prompt_hash
before insert or update of prompt_text on public.generations
for each row execute procedure public.tr_generations_set_prompt_hash();

commit;
