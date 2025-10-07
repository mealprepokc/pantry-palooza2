-- Cooked dishes table to track completed meals and support summaries
create table if not exists public.cooked_dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cuisine_type text,
  cooking_time text,
  ingredients text[] not null default '{}'::text[],
  instructions text,
  cooked_at timestamptz not null default now(),
  calories_est numeric,
  cost_est numeric
);

alter table public.cooked_dishes enable row level security;

drop policy if exists "cooked_select_own" on public.cooked_dishes;
drop policy if exists "cooked_insert_own" on public.cooked_dishes;
drop policy if exists "cooked_delete_own" on public.cooked_dishes;

create policy "cooked_select_own"
  on public.cooked_dishes for select
  to authenticated
  using (user_id = auth.uid());

create policy "cooked_insert_own"
  on public.cooked_dishes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "cooked_delete_own"
  on public.cooked_dishes for delete
  to authenticated
  using (user_id = auth.uid());
