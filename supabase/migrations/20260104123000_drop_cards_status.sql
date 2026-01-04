-- purpose: remove cards.status entirely (client wants to retire status-based workflow)
-- affected: cards.status column, card_status_enum type, default status trigger, status index

-- 1) Drop triggers that depend on status defaults (if exists)
drop trigger if exists trg_cards_default_status on public.cards;
drop function if exists public.tr_cards_default_status();

-- 2) Drop status-related index (if exists)
drop index if exists public.cards_user_status_idx;

-- 3) Drop the column
alter table public.cards drop column if exists status;

-- 4) Drop enum (only after the column is removed)
drop type if exists public.card_status_enum;


