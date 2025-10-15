-- ============================================================================
-- Pantry Palooza: Cached generated dishes + rate limiting support
-- ============================================================================

create table if not exists public.generated_dish_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  cache_key text not null,
  request_hash text not null,
  meal_type text check (meal_type in ('Breakfast','Lunch','Dinner')),
  servings integer not null default 2,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, request_hash)
);

create index if not exists generated_dish_cache_request_hash_idx
  on public.generated_dish_cache (request_hash);

create index if not exists generated_dish_cache_expires_idx
  on public.generated_dish_cache (expires_at);

alter table public.generated_dish_cache enable row level security;

drop policy if exists select_cached_dishes on public.generated_dish_cache;
drop policy if exists insert_cached_dishes on public.generated_dish_cache;
drop policy if exists delete_cached_dishes on public.generated_dish_cache;

create policy select_cached_dishes
  on public.generated_dish_cache
  for select
  using (auth.uid() = user_id);

create policy insert_cached_dishes
  on public.generated_dish_cache
  for insert
  with check (auth.uid() = user_id);

create policy delete_cached_dishes
  on public.generated_dish_cache
  for delete
  using (auth.uid() = user_id);

-- Track per-user generation requests for rate limiting
create table if not exists public.user_generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_generation_events_user_created_idx
  on public.user_generation_events (user_id, created_at desc);

alter table public.user_generation_events enable row level security;

drop policy if exists select_generation_events on public.user_generation_events;
drop policy if exists insert_generation_events on public.user_generation_events;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_generation_events'
      and policyname = 'select_generation_events'
  ) then
    create policy select_generation_events
      on public.user_generation_events
      for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_generation_events'
      and policyname = 'insert_generation_events'
  ) then
    create policy insert_generation_events
      on public.user_generation_events
      for insert
      with check (auth.uid() = user_id);
  end if;
end;
$$;
