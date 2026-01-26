-- migration: add role-specific rls policies for generations, cards, profiles, generation_errors
-- purpose: replace generic owner policies with per-role crud policies for anon/authenticated
-- affected objects: public.generations, public.cards, public.profiles, public.generation_errors
-- special notes: drops existing generic policies created in 20251127120000_create_mvp_schema.sql

-- 1. ensure rls is enabled -------------------------------------------------------------------
alter table public.generations enable row level security;
alter table public.cards enable row level security;
alter table public.generation_errors enable row level security;
alter table public.profiles enable row level security;

-- 2. drop existing generic policies -----------------------------------------------------------
-- these drops are required to avoid duplicate or ambiguous policy evaluation.
drop policy if exists generations_select_owner on public.generations;
drop policy if exists generations_insert_owner on public.generations;
drop policy if exists generations_update_owner on public.generations;
drop policy if exists generations_delete_owner on public.generations;

drop policy if exists cards_select_owner on public.cards;
drop policy if exists cards_insert_owner on public.cards;
drop policy if exists cards_update_owner on public.cards;
drop policy if exists cards_delete_owner on public.cards;

drop policy if exists generation_errors_select_owner on public.generation_errors;

drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;

-- 3. generations: per-role, per-action policies -----------------------------------------------
-- anon: no access by default; auth.uid() is null for anon, so these predicates block access.
create policy generations_select_anon on public.generations
for select to anon
using (user_id = auth.uid());

create policy generations_insert_anon on public.generations
for insert to anon
with check (user_id = auth.uid());

create policy generations_update_anon on public.generations
for update to anon
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy generations_delete_anon on public.generations
for delete to anon
using (user_id = auth.uid());

-- authenticated: allow only row ownership operations.
create policy generations_select_authenticated on public.generations
for select to authenticated
using (user_id = auth.uid());

create policy generations_insert_authenticated on public.generations
for insert to authenticated
with check (user_id = auth.uid());

create policy generations_update_authenticated on public.generations
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy generations_delete_authenticated on public.generations
for delete to authenticated
using (user_id = auth.uid());

-- 4. cards: per-role, per-action policies -----------------------------------------------------
-- anon: no access by default; auth.uid() is null for anon, so these predicates block access.
create policy cards_select_anon on public.cards
for select to anon
using (user_id = auth.uid());

create policy cards_insert_anon on public.cards
for insert to anon
with check (user_id = auth.uid());

create policy cards_update_anon on public.cards
for update to anon
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy cards_delete_anon on public.cards
for delete to anon
using (user_id = auth.uid());

-- authenticated: allow only row ownership operations.
create policy cards_select_authenticated on public.cards
for select to authenticated
using (user_id = auth.uid());

create policy cards_insert_authenticated on public.cards
for insert to authenticated
with check (user_id = auth.uid());

create policy cards_update_authenticated on public.cards
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy cards_delete_authenticated on public.cards
for delete to authenticated
using (user_id = auth.uid());

-- 5. generation_errors: per-role policies (select/insert only) --------------------------------
-- anon: no access by default; auth.uid() is null for anon, so these predicates block access.
create policy generation_errors_select_anon on public.generation_errors
for select to anon
using (generation_id in (select id from public.generations where user_id = auth.uid()));

create policy generation_errors_insert_anon on public.generation_errors
for insert to anon
with check (generation_id in (select id from public.generations where user_id = auth.uid()));

-- authenticated: allow only access to errors owned through the generation.
create policy generation_errors_select_authenticated on public.generation_errors
for select to authenticated
using (generation_id in (select id from public.generations where user_id = auth.uid()));

create policy generation_errors_insert_authenticated on public.generation_errors
for insert to authenticated
with check (generation_id in (select id from public.generations where user_id = auth.uid()));


-- 6. profiles: per-role, per-action policies --------------------------------------------------
-- anon: no access by default; auth.uid() is null for anon, so these predicates block access.
create policy profiles_select_anon on public.profiles
for select to anon
using (id = auth.uid());

create policy profiles_insert_anon on public.profiles
for insert to anon
with check (id = auth.uid());

create policy profiles_update_anon on public.profiles
for update to anon
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_delete_anon on public.profiles
for delete to anon
using (id = auth.uid());

-- authenticated: allow only own profile operations.
create policy profiles_select_authenticated on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_insert_authenticated on public.profiles
for insert to authenticated
with check (id = auth.uid());

create policy profiles_update_authenticated on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_delete_authenticated on public.profiles
for delete to authenticated
using (id = auth.uid());
