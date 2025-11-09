-- Track dishes a user has explicitly disliked to suppress them during future generations
create table if not exists public.disliked_dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  title_key text not null,
  dish jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists disliked_dishes_user_title_key
  on public.disliked_dishes (user_id, title_key);

alter table public.disliked_dishes enable row level security;

drop policy if exists "disliked_select_own" on public.disliked_dishes;
drop policy if exists "disliked_insert_own" on public.disliked_dishes;
drop policy if exists "disliked_delete_own" on public.disliked_dishes;

drop policy if exists "disliked_update_metadata" on public.disliked_dishes;

create policy "disliked_select_own"
  on public.disliked_dishes for select
  to authenticated
  using (user_id = auth.uid());

create policy "disliked_insert_own"
  on public.disliked_dishes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "disliked_delete_own"
  on public.disliked_dishes for delete
  to authenticated
  using (user_id = auth.uid());

create policy "disliked_update_metadata"
  on public.disliked_dishes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
