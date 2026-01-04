-- purpose: rename generations.total_deleted -> total_rejected
-- semantics: total_generated/total_accepted/total_rejected are "początkowe" (snapshot) values
--           only total_rejected changes over time (increments on physical DELETE of card)

alter table public.generations rename column total_deleted to total_rejected;

-- keep trigger function aligned with new column name
create or replace function public.tr_cards_update_counters()
returns trigger language plpgsql as $$
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

  -- INSERT/UPDATE: intentionally no-op for counters semantics.
  return null;
end;$$;


