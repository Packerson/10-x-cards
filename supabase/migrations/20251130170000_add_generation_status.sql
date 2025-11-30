-- Adds lifecycle status tracking to generations
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'generation_status_enum'
      and n.nspname = 'public'
  ) then
    create type public.generation_status_enum as enum (
      'processing',
      'completed',
      'failed'
    );
  end if;
end $$;

alter table public.generations
  add column if not exists status generation_status_enum not null default 'processing';

