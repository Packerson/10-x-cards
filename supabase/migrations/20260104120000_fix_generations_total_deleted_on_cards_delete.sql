-- purpose: align generations.total_deleted with physical deletions of cards
-- notes:
-- - previously total_deleted was derived from cards.status='rejected', which is incompatible with hard DELETE semantics
-- - counters in generations are treated as "początkowe" (initial) values; we do NOT recompute them from cards

create or replace function public.tr_cards_update_counters()
returns trigger language plpgsql as $$
declare
  gid_old bigint;
begin
  gid_old := old.generation_id;

  -- DELETE: increment total_deleted (physical deletes); other counters remain "początkowe"
  if tg_op = 'DELETE' then
    if gid_old is null then
      return null;
    end if;

    update public.generations g set
      total_deleted   = g.total_deleted + 1,
      updated_at      = now()
    where g.id = gid_old;

    return null;
  end if;

  -- INSERT/UPDATE: intentionally no-op for counters semantics.
  return null;
end;$$;


