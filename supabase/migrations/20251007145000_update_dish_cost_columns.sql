-- Align saved and cooked dish tables with app cost/calorie tracking
alter table if exists public.saved_dishes
  add column if not exists calories_est numeric,
  add column if not exists cost_est numeric,
  add column if not exists restaurant_cost_est numeric,
  add column if not exists savings_est numeric;

alter table if exists public.cooked_dishes
  add column if not exists restaurant_cost_est numeric,
  add column if not exists savings_est numeric;
