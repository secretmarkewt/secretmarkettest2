-- Secret Market Supabase schema
-- Run this file in Supabase SQL Editor before adding public URL and anon key to config.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default 'User',
  telegram text not null default '',
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.secmarket_items (
  collection text not null,
  id text not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'active',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

create or replace function public.secmarket_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.secmarket_touch_updated_at();

drop trigger if exists secmarket_items_touch_updated_at on public.secmarket_items;
create trigger secmarket_items_touch_updated_at
before update on public.secmarket_items
for each row execute function public.secmarket_touch_updated_at();

create or replace function public.secmarket_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role text;
begin
  resolved_role := case
    when lower(coalesce(new.email, '')) in ('milkiees6faceit@gmail.com', 'hardpleilol@gmail.com') then 'admin'
    else coalesce(new.raw_user_meta_data->>'role', 'buyer')
  end;

  insert into public.profiles (id, email, name, telegram, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1), 'User'),
    coalesce(new.raw_user_meta_data->>'telegram', ''),
    resolved_role
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    telegram = excluded.telegram,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists secmarket_on_auth_user_created on auth.users;
create trigger secmarket_on_auth_user_created
after insert on auth.users
for each row execute function public.secmarket_handle_new_user();

create or replace function public.secmarket_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.secmarket_items enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.secmarket_is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.secmarket_is_admin())
with check (id = auth.uid() or public.secmarket_is_admin());

drop policy if exists "items_select_public_own_or_related" on public.secmarket_items;
create policy "items_select_public_own_or_related"
on public.secmarket_items for select
using (
  collection = 'products'
  or owner_id = auth.uid()
  or payload->>'buyerId' = auth.uid()::text
  or payload->>'sellerId' = auth.uid()::text
  or public.secmarket_is_admin()
);

drop policy if exists "items_insert_authenticated" on public.secmarket_items;
create policy "items_insert_authenticated"
on public.secmarket_items for insert
with check (
  auth.uid() is not null
  and owner_id = auth.uid()
  and collection in ('products', 'orders', 'payments', 'tickets', 'disputes', 'withdrawals', 'deliveries', 'ledger')
);

drop policy if exists "items_update_own_related_or_admin" on public.secmarket_items;
create policy "items_update_own_related_or_admin"
on public.secmarket_items for update
using (
  owner_id = auth.uid()
  or payload->>'buyerId' = auth.uid()::text
  or payload->>'sellerId' = auth.uid()::text
  or public.secmarket_is_admin()
)
with check (
  owner_id = auth.uid()
  or payload->>'buyerId' = auth.uid()::text
  or payload->>'sellerId' = auth.uid()::text
  or public.secmarket_is_admin()
);

create index if not exists secmarket_items_collection_created_idx
on public.secmarket_items (collection, created_at desc);

create index if not exists secmarket_items_status_idx
on public.secmarket_items (collection, status);
