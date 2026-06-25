-- Admin allowlist for Secret Market.
-- Keep this list small. These emails are assigned role=admin on registration.

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
    when lower(coalesce(new.email, '')) in ('milkiees6faceit@gmail.com', 'hardpleilol@gmail.com', 'milkieesbot@gmail.com') then 'admin'
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

update public.profiles
set role = 'admin'
where lower(email) in ('milkiees6faceit@gmail.com', 'hardpleilol@gmail.com', 'milkieesbot@gmail.com');
