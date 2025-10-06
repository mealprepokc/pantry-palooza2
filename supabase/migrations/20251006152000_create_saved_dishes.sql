-- Create saved_dishes table if it does not exist and add RLS policies
-- Safe-guarded for repeated runs

-- Enable required extension for gen_random_uuid (usually enabled by default on Supabase)
create extension if not exists pgcrypto;

create table if not exists public.saved_dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cuisine_type text,
  cooking_time text not null default '30 mins',
  ingredients text[] not null default '{}'::text[],
  instructions text,
  created_at timestamptz not null default now()
);

-- Optional: prevent duplicate titles per user (can be relaxed later)
create unique index if not exists saved_dishes_user_title_idx
  on public.saved_dishes (user_id, title);

-- Ensure RLS is enabled
alter table public.saved_dishes enable row level security;

-- Drop existing policies if re-running (optional for idempotency)
drop policy if exists "insert_own_saved_dishes" on public.saved_dishes;
drop policy if exists "select_own_saved_dishes" on public.saved_dishes;
drop policy if exists "delete_own_saved_dishes" on public.saved_dishes;

-- Allow authenticated users to insert/select/delete ONLY their own rows
create policy "insert_own_saved_dishes"
  on public.saved_dishes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "select_own_saved_dishes"
  on public.saved_dishes for select
  to authenticated
  using (user_id = auth.uid());

create policy "delete_own_saved_dishes"
  on public.saved_dishes for delete
  to authenticated
  using (user_id = auth.uid());
