-- Account preferences for dietary selections and strict/loose mode
create table if not exists public.account_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strict_mode boolean not null default false,
  dietary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.account_prefs enable row level security;

drop policy if exists "account_prefs_select_own" on public.account_prefs;
drop policy if exists "account_prefs_upsert_own" on public.account_prefs;

create policy "account_prefs_select_own"
  on public.account_prefs for select
  to authenticated
  using (user_id = auth.uid());

create policy "account_prefs_upsert_own"
  on public.account_prefs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "account_prefs_update_own"
  on public.account_prefs for update
  to authenticated
  using (user_id = auth.uid());
