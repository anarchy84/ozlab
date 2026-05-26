-- Landing section builder
-- Marketers can add, reorder, and edit safe landing modules inside predefined page slots.

create extension if not exists pgcrypto;

create table if not exists public.landing_slot_items (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  slot_key text not null,
  item_type text not null check (item_type in ('text', 'image', 'split', 'cards', 'cta', 'faq')),
  title text,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  variant_key text not null default 'A',
  traffic_weight integer not null default 100 check (traffic_weight between 0 and 100),
  experiment_key text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists landing_slot_items_page_slot_order_idx
  on public.landing_slot_items (page_path, slot_key, sort_order, created_at);

create index if not exists landing_slot_items_experiment_idx
  on public.landing_slot_items (experiment_key, variant_key)
  where experiment_key is not null;

drop trigger if exists landing_slot_items_set_updated_at on public.landing_slot_items;
create trigger landing_slot_items_set_updated_at
before update on public.landing_slot_items
for each row execute function public.set_updated_at();

alter table public.landing_slot_items enable row level security;

drop policy if exists "landing_slot_items_public_active_read" on public.landing_slot_items;
create policy "landing_slot_items_public_active_read"
on public.landing_slot_items
for select
to anon
using (is_active = true);

drop policy if exists "landing_slot_items_authenticated_read" on public.landing_slot_items;
create policy "landing_slot_items_authenticated_read"
on public.landing_slot_items
for select
to authenticated
using (true);

drop policy if exists "landing_slot_items_authenticated_write" on public.landing_slot_items;
create policy "landing_slot_items_authenticated_write"
on public.landing_slot_items
for all
to authenticated
using (true)
with check (true);

grant select on public.landing_slot_items to anon, authenticated;
grant insert, update, delete on public.landing_slot_items to authenticated;
