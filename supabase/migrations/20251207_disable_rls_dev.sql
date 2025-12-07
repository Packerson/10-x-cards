-- Temporarily disable RLS for development. Do NOT use in production.

alter table public.profiles          disable row level security;
alter table public.generations       disable row level security;
alter table public.generation_errors disable row level security;
alter table public.cards             disable row level security;

