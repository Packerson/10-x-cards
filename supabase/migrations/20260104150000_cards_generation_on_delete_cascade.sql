-- purpose: ensure deleting a generation removes its related cards atomically via FK cascade
-- notes:
-- - previously cards.generation_id used ON DELETE SET NULL, which breaks the API contract for DELETE /generations/{id}
-- - generation_errors already cascades on delete (see 20251127120000_create_mvp_schema.sql)

alter table public.cards
drop constraint if exists cards_generation_id_fkey;

alter table public.cards
add constraint cards_generation_id_fkey
foreign key (generation_id)
references public.generations(id)
on delete cascade;


