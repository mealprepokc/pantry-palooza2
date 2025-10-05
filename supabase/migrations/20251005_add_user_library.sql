-- ============================================================================
-- Pantry Palooza: Core schema and policies
-- Project: iqykqsjtelipuccimysu
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- 1) Create NEW schema table: user_library
create table if not exists public.user_library (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seasonings text[] not null default '{}',
  produce text[] not null default '{}',
  proteins text[] not null default '{}',
  pastas text[] not null default '{}',
  equipment text[] not null default '{}',
  grains text[] not null default '{}',
  breads text[] not null default '{}',
  sauces_condiments text[] not null default '{}',
  dairy text[] not null default '{}',
  non_perishables text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Ensure columns exist (noop if present)
alter table public.user_library
  add column if not exists seasonings        text[] not null default '{}',
  add column if not exists produce           text[] not null default '{}',
  add column if not exists proteins          text[] not null default '{}',
  add column if not exists pastas            text[] not null default '{}',
  add column if not exists equipment         text[] not null default '{}',
  add column if not exists grains            text[] not null default '{}',
  add column if not exists breads            text[] not null default '{}',
  add column if not exists sauces_condiments text[] not null default '{}',
  add column if not exists dairy             text[] not null default '{}',
  add column if not exists non_perishables   text[] not null default '{}',
  add column if not exists updated_at        timestamptz not null default now();

-- 2) Legacy compatibility table: user_selections
create table if not exists public.user_selections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seasonings text[] not null default '{}',
  vegetables text[] not null default '{}', -- legacy "produce"
  entrees text[] not null default '{}',    -- legacy "proteins"
  pastas text[] not null default '{}',
  equipment text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_selections
  add column if not exists seasonings text[] not null default '{}',
  add column if not exists vegetables text[] not null default '{}',
  add column if not exists entrees    text[] not null default '{}',
  add column if not exists pastas     text[] not null default '{}',
  add column if not exists equipment  text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

-- 3) RLS: Enable and add policies for both tables
alter table public.user_library enable row level security;
alter table public.user_selections enable row level security;

-- Policies for user_library (drop-if-exists then create)
drop policy if exists select_own_user_library on public.user_library;
drop policy if exists insert_own_user_library on public.user_library;
drop policy if exists update_own_user_library on public.user_library;

create policy select_own_user_library
  on public.user_library
  for select
  using (auth.uid() = user_id);

create policy insert_own_user_library
  on public.user_library
  for insert
  with check (auth.uid() = user_id);

create policy update_own_user_library
  on public.user_library
  for update
  using (auth.uid() = user_id);

-- Policies for user_selections (legacy)
drop policy if exists select_own_user_selections on public.user_selections;
drop policy if exists insert_own_user_selections on public.user_selections;
drop policy if exists update_own_user_selections on public.user_selections;

create policy select_own_user_selections
  on public.user_selections
  for select
  using (auth.uid() = user_id);

create policy insert_own_user_selections
  on public.user_selections
  for insert
  with check (auth.uid() = user_id);

create policy update_own_user_selections
  on public.user_selections
  for update
  using (auth.uid() = user_id);

-- 4) updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_library_updated_at on public.user_library;
create trigger trg_user_library_updated_at
before update on public.user_library
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_selections_updated_at on public.user_selections;
create trigger trg_user_selections_updated_at
before update on public.user_selections
for each row execute function public.set_updated_at();

-- 5) Helpful indexes
create index if not exists idx_user_library_user_id on public.user_library (user_id);
create index if not exists idx_user_selections_user_id on public.user_selections (user_id);
