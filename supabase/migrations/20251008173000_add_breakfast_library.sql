-- Add breakfast-specific library columns to user_library
alter table if exists public.user_library
  add column if not exists breakfast_proteins text[] not null default '{}',
  add column if not exists breakfast_produce text[] not null default '{}',
  add column if not exists breakfast_grains text[] not null default '{}',
  add column if not exists breakfast_breads text[] not null default '{}',
  add column if not exists breakfast_dairy text[] not null default '{}',
  add column if not exists breakfast_condiments text[] not null default '{}',
  add column if not exists breakfast_equipment text[] not null default '{}';

-- Ensure updated_at trigger still fires
update public.user_library set updated_at = now();
