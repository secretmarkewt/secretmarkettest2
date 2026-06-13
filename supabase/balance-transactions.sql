-- Secret Market balance and transactions migration

alter table public.profiles
add column if not exists balance numeric(14, 2) not null default 0 check (balance >= 0),
add column if not exists frozen_balance numeric(14, 2) not null default 0 check (frozen_balance >= 0);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'adjustment')),
  amount numeric(14, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected', 'failed')),
  payment_method text not null default 'USDT',
  details jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
before update on public.transactions
for each row execute function public.secmarket_touch_updated_at();

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own_or_admin" on public.transactions;
create policy "transactions_select_own_or_admin"
on public.transactions for select
using (user_id = auth.uid() or public.secmarket_is_admin());

drop policy if exists "transactions_insert_own_pending" on public.transactions;
create policy "transactions_insert_own_pending"
on public.transactions for insert
with check (
  user_id = auth.uid()
  and status = 'pending'
  and type in ('deposit', 'withdrawal')
);

drop policy if exists "transactions_update_admin" on public.transactions;
create policy "transactions_update_admin"
on public.transactions for update
using (public.secmarket_is_admin())
with check (public.secmarket_is_admin());

create index if not exists transactions_user_created_idx
on public.transactions (user_id, created_at desc);

create index if not exists transactions_status_idx
on public.transactions (status, created_at desc);
