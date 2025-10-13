-- Add lunch and dinner library columns to user_library
alter table if exists public.user_library
  add column if not exists lunch_proteins text[] not null default '{}',
  add column if not exists lunch_produce text[] not null default '{}',
  add column if not exists lunch_grains text[] not null default '{}',
  add column if not exists lunch_breads text[] not null default '{}',
  add column if not exists lunch_dairy text[] not null default '{}',
  add column if not exists lunch_condiments text[] not null default '{}',
  add column if not exists lunch_equipment text[] not null default '{}',
  add column if not exists dinner_proteins text[] not null default '{}',
  add column if not exists dinner_produce text[] not null default '{}',
  add column if not exists dinner_grains text[] not null default '{}',
  add column if not exists dinner_breads text[] not null default '{}',
  add column if not exists dinner_dairy text[] not null default '{}',
  add column if not exists dinner_condiments text[] not null default '{}',
  add column if not exists dinner_equipment text[] not null default '{}';

-- Touch updated_at so triggers and cache stay fresh
update public.user_library set updated_at = now();
