-- Align saved_dishes and cooked_dishes schema with app usage
alter table if exists public.saved_dishes
  add column if not exists cost_est numeric,
  add column if not exists restaurant_cost_est numeric,
  add column if not exists savings_est numeric,
  add column if not exists suggested_sides text[] not null default '{}'::text[],
  add column if not exists meal_type text;

alter table if exists public.cooked_dishes
  add column if not exists restaurant_cost_est numeric,
  add column if not exists savings_est numeric;
