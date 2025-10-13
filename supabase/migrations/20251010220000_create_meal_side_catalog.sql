-- ============================================================================
-- Pantry Palooza: Meal side catalog + user preferences
-- ============================================================================

-- 1) Create catalog of curated meal sides
create table if not exists public.meal_side_catalog (
  id uuid primary key default gen_random_uuid(),
  meal_type text not null check (meal_type in ('Breakfast','Lunch','Dinner')),
  dish_type text not null,
  side_name text not null,
  is_default boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists meal_side_catalog_unique
  on public.meal_side_catalog (meal_type, dish_type, side_name);

drop trigger if exists trg_meal_side_catalog_updated_at on public.meal_side_catalog;
create trigger trg_meal_side_catalog_updated_at
before update on public.meal_side_catalog
for each row execute function public.set_updated_at();

-- 2) Per-user overrides for side preferences
create table if not exists public.user_side_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_id uuid not null references public.meal_side_catalog(id) on delete cascade,
  is_enabled boolean not null default true,
  is_pinned boolean not null default false,
  position integer not null default 0,
  custom_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, catalog_id)
);

create index if not exists user_side_preferences_catalog_id_idx
  on public.user_side_preferences (catalog_id);

create index if not exists user_side_preferences_user_id_idx
  on public.user_side_preferences (user_id);

drop trigger if exists trg_user_side_preferences_updated_at on public.user_side_preferences;
create trigger trg_user_side_preferences_updated_at
before update on public.user_side_preferences
for each row execute function public.set_updated_at();

-- 3) Enable RLS and add policies
alter table public.meal_side_catalog enable row level security;
alter table public.user_side_preferences enable row level security;

-- Catalog: read-only to everyone (no writes from clients)
drop policy if exists select_meal_side_catalog on public.meal_side_catalog;
create policy select_meal_side_catalog
  on public.meal_side_catalog
  for select
  using (true);

-- Prevent direct writes from end users
drop policy if exists modify_meal_side_catalog on public.meal_side_catalog;
create policy modify_meal_side_catalog
  on public.meal_side_catalog
  for all
  using (false)
  with check (false);

-- User preferences policies
drop policy if exists select_own_user_side_preferences on public.user_side_preferences;
drop policy if exists insert_own_user_side_preferences on public.user_side_preferences;
drop policy if exists update_own_user_side_preferences on public.user_side_preferences;
drop policy if exists delete_own_user_side_preferences on public.user_side_preferences;

create policy select_own_user_side_preferences
  on public.user_side_preferences
  for select
  using (auth.uid() = user_id);

create policy insert_own_user_side_preferences
  on public.user_side_preferences
  for insert
  with check (auth.uid() = user_id);

create policy update_own_user_side_preferences
  on public.user_side_preferences
  for update
  using (auth.uid() = user_id);

create policy delete_own_user_side_preferences
  on public.user_side_preferences
  for delete
  using (auth.uid() = user_id);

-- 4) Seed catalog from curated CSV
with raw(meal_type, dish_type, side_name, is_default, tags_raw) as (
  values
    ('Breakfast','Omlet/Scramble','Hash browns', true, 'hot|hearty|veg'),
    ('Breakfast','Omlet/Scramble','Toast (whole grain)', true, 'bread|light'),
    ('Breakfast','Omlet/Scramble','Fresh fruit cup', true, 'cold|light'),
    ('Breakfast','Omlet/Scramble','Bacon', false, 'protein'),
    ('Breakfast','Omlet/Scramble','Turkey sausage', false, 'protein|lean'),
    ('Breakfast','Omlet/Scramble','Side salad (greens)', false, 'cold|veg|light'),
    ('Breakfast','Breakfast Sandwich','Hash brown patty', true, 'hot|hearty'),
    ('Breakfast','Breakfast Sandwich','Fruit cup', true, 'cold|light'),
    ('Breakfast','Breakfast Sandwich','Yogurt (Greek)', false, 'cold|protein'),
    ('Breakfast','Breakfast Sandwich','Side salad', false, 'cold|veg'),
    ('Breakfast','Breakfast Sandwich','Tomato slices/avocado', false, 'veg|fresh'),
    ('Breakfast','Pancakes/Waffles','Bacon', true, 'protein|classic'),
    ('Breakfast','Pancakes/Waffles','Sausage links', true, 'protein|classic'),
    ('Breakfast','Pancakes/Waffles','Fresh berries', false, 'cold|light'),
    ('Breakfast','Pancakes/Waffles','Yogurt parfait', false, 'cold|light|protein'),
    ('Breakfast','Pancakes/Waffles','Scrambled eggs', false, 'protein'),
    ('Breakfast','Breakfast Burrito/Taco','Potatoes (home fries)', true, 'hot|hearty|veg'),
    ('Breakfast','Breakfast Burrito/Taco','Black beans', true, 'veg|protein'),
    ('Breakfast','Breakfast Burrito/Taco','Salsa & pico de gallo', false, 'fresh|veg'),
    ('Breakfast','Breakfast Burrito/Taco','Avocado slices', false, 'veg|healthy'),
    ('Breakfast','Breakfast Burrito/Taco','Grilled corn', false, 'veg|sweet'),
    ('Breakfast','Bowl/Parfait','Granola', true, 'crunch|light'),
    ('Breakfast','Bowl/Parfait','Fresh berries', true, 'cold|light'),
    ('Breakfast','Bowl/Parfait','Chia pudding', false, 'light|gf'),
    ('Breakfast','Bowl/Parfait','Almonds/walnuts', false, 'crunch|healthy'),
    ('Breakfast','Bowl/Parfait','Side of toast', false, 'bread|light'),
    ('Breakfast','Oatmeal','Fresh fruit (banana/berries)', true, 'light|gf'),
    ('Breakfast','Oatmeal','Peanut butter/almond butter', true, 'protein|healthy'),
    ('Breakfast','Oatmeal','Yogurt (dollop)', false, 'protein'),
    ('Breakfast','Oatmeal','Hard-boiled egg', false, 'protein|grab-and-go'),
    ('Breakfast','Oatmeal','Turkey bacon', false, 'protein|lean'),
    ('Breakfast','Smoked Salmon Plate','Capers & red onion', true, 'fresh|savory'),
    ('Breakfast','Smoked Salmon Plate','Tomato & cucumber', true, 'fresh|veg'),
    ('Breakfast','Smoked Salmon Plate','Toast (rye/bagel)', false, 'bread'),
    ('Breakfast','Smoked Salmon Plate','Side salad', false, 'veg|light'),
    ('Breakfast','Smoked Salmon Plate','Avocado', false, 'healthy|veg'),
    ('Breakfast','Hash/Skillet','Buttered toast', true, 'bread'),
    ('Breakfast','Hash/Skillet','Fried egg', true, 'protein'),
    ('Breakfast','Hash/Skillet','Grilled tomatoes', false, 'veg'),
    ('Breakfast','Hash/Skillet','Fresh fruit', false, 'light'),
    ('Breakfast','Hash/Skillet','Side salad', false, 'veg|light'),
    ('Breakfast','Avocado Toast','Soft scrambled egg', true, 'protein'),
    ('Breakfast','Avocado Toast','Fresh fruit', true, 'light'),
    ('Breakfast','Avocado Toast','Turkey bacon', false, 'protein|lean'),
    ('Breakfast','Avocado Toast','Cottage cheese', false, 'protein|light'),
    ('Breakfast','Avocado Toast','Roasted cherry tomatoes', false, 'veg'),
    ('Lunch','Sandwich/Burger','French fries', true, 'hot|hearty'),
    ('Lunch','Sandwich/Burger','Potato chips', true, 'crunch|light'),
    ('Lunch','Sandwich/Burger','Side salad (greens)', true, 'cold|veg|light'),
    ('Lunch','Sandwich/Burger','Coleslaw', false, 'cold|veg'),
    ('Lunch','Sandwich/Burger','Pickle spear', false, 'fresh|tangy'),
    ('Lunch','Salad/Main Salad','Garlic bread', true, 'bread'),
    ('Lunch','Salad/Main Salad','Cup of soup (tomato/chicken)', true, 'hot|comfort'),
    ('Lunch','Salad/Main Salad','Roasted veggies', false, 'hot|veg'),
    ('Lunch','Salad/Main Salad','Quinoa cup', false, 'grain|gf'),
    ('Lunch','Salad/Main Salad','Fresh fruit', false, 'light|cold'),
    ('Lunch','Wrap/Taco','Chips & salsa', true, 'crunch|fresh'),
    ('Lunch','Wrap/Taco','Elote/street corn', true, 'hot|veg|sweet'),
    ('Lunch','Wrap/Taco','Black beans', false, 'protein|veg'),
    ('Lunch','Wrap/Taco','Cilantro-lime rice', false, 'grain|gf'),
    ('Lunch','Wrap/Taco','Guacamole cup', false, 'healthy|veg'),
    ('Lunch','Pasta','Garlic bread', true, 'bread|classic'),
    ('Lunch','Pasta','Side caesar', true, 'cold|veg'),
    ('Lunch','Pasta','Roasted broccoli', false, 'veg|hot'),
    ('Lunch','Pasta','Caprese salad', false, 'cold|fresh'),
    ('Lunch','Pasta','Grilled asparagus', false, 'veg|hot'),
    ('Lunch','Soup','Half sandwich (combo)', true, 'balanced'),
    ('Lunch','Soup','Side salad', true, 'veg|light'),
    ('Lunch','Soup','Crusty bread/roll', false, 'bread'),
    ('Lunch','Soup','Crackers', false, 'crunch|light'),
    ('Lunch','Soup','Roasted veggies', false, 'veg|hot'),
    ('Lunch','Grain Bowl','Roasted sweet potatoes', true, 'veg|hearty'),
    ('Lunch','Grain Bowl','Steamed greens (spinach/kale)', true, 'veg|light'),
    ('Lunch','Grain Bowl','Pickled veggies', false, 'tangy|fresh'),
    ('Lunch','Grain Bowl','Edamame', false, 'protein|veg'),
    ('Lunch','Grain Bowl','Fresh fruit', false, 'light'),
    ('Lunch','Stir-Fry','Steamed jasmine rice', true, 'grain|gf'),
    ('Lunch','Stir-Fry','Vegetable spring rolls', true, 'crunch|veg'),
    ('Lunch','Stir-Fry','Miso soup', false, 'hot|light'),
    ('Lunch','Stir-Fry','Cucumber salad', false, 'cold|fresh'),
    ('Lunch','Stir-Fry','Edamame', false, 'protein|veg'),
    ('Lunch','Flatbread/Pizza','Side caesar', true, 'veg|classic'),
    ('Lunch','Flatbread/Pizza','Garlic knots', true, 'bread'),
    ('Lunch','Flatbread/Pizza','Antipasto cup', false, 'cold|savory'),
    ('Lunch','Flatbread/Pizza','Roasted vegetables', false, 'veg|hot'),
    ('Lunch','Flatbread/Pizza','Caprese salad', false, 'fresh|cold'),
    ('Lunch','Quesadilla','Chips & salsa', true, 'crunch|fresh'),
    ('Lunch','Quesadilla','Spanish rice', true, 'grain|gf'),
    ('Lunch','Quesadilla','Black beans', false, 'protein|veg'),
    ('Lunch','Quesadilla','Guacamole cup', false, 'healthy|veg'),
    ('Lunch','Quesadilla','Roasted corn', false, 'veg|sweet'),
    ('Lunch','Sushi/Poke','Miso soup', true, 'hot|light'),
    ('Lunch','Sushi/Poke','Seaweed salad', true, 'cold|veg'),
    ('Lunch','Sushi/Poke','Edamame', false, 'protein|veg'),
    ('Lunch','Sushi/Poke','Cucumber salad', false, 'fresh|cold'),
    ('Lunch','Sushi/Poke','Pickled ginger', false, 'fresh|tangy'),
    ('Dinner','Grill/Steak/Chops','Mashed potatoes', true, 'hearty|comfort'),
    ('Dinner','Grill/Steak/Chops','Grilled asparagus', true, 'veg|hot'),
    ('Dinner','Grill/Steak/Chops','Garlic butter mushrooms', false, 'veg|savory'),
    ('Dinner','Grill/Steak/Chops','House salad', false, 'veg|light'),
    ('Dinner','Grill/Steak/Chops','Baked potato', false, 'hearty'),
    ('Dinner','Roast Chicken','Roasted potatoes', true, 'hearty'),
    ('Dinner','Roast Chicken','Green beans almondine', true, 'veg|hot'),
    ('Dinner','Roast Chicken','Side salad', false, 'veg|light'),
    ('Dinner','Roast Chicken','Herbed rice pilaf', false, 'grain'),
    ('Dinner','Roast Chicken','Buttered corn', false, 'veg|sweet'),
    ('Dinner','Pasta','Garlic bread', true, 'bread|classic'),
    ('Dinner','Pasta','Side caesar', true, 'veg|classic'),
    ('Dinner','Pasta','Roasted broccoli', false, 'veg|hot'),
    ('Dinner','Pasta','Bruschetta', false, 'fresh|bread'),
    ('Dinner','Pasta','Caprese salad', false, 'cold|fresh'),
    ('Dinner','Seafood (Salmon/Cod/White fish)','Lemon rice', true, 'grain|fresh'),
    ('Dinner','Seafood (Salmon/Cod/White fish)','Roasted asparagus', true, 'veg|hot'),
    ('Dinner','Seafood (Salmon/Cod/White fish)','Garlic mashed potatoes', false, 'hearty'),
    ('Dinner','Seafood (Salmon/Cod/White fish)','Steamed green beans', false, 'veg|light'),
    ('Dinner','Seafood (Salmon/Cod/White fish)','Coleslaw', false, 'cold|fresh'),
    ('Dinner','Tacos/Fajitas','Spanish rice', true, 'grain|gf'),
    ('Dinner','Tacos/Fajitas','Black or pinto beans', true, 'protein|veg'),
    ('Dinner','Tacos/Fajitas','Elote/street corn', false, 'veg|sweet'),
    ('Dinner','Tacos/Fajitas','Chips & salsa', false, 'crunch|fresh'),
    ('Dinner','Tacos/Fajitas','Guacamole cup', false, 'healthy|veg'),
    ('Dinner','Curry/Stew','Steamed basmati rice', true, 'grain|gf'),
    ('Dinner','Curry/Stew','Garlic naan', true, 'bread'),
    ('Dinner','Curry/Stew','Cucumber raita', false, 'cool|fresh'),
    ('Dinner','Curry/Stew','Pickled onions', false, 'tangy|fresh'),
    ('Dinner','Curry/Stew','Roasted cauliflower', false, 'veg|hot'),
    ('Dinner','Stir-Fry','Steamed jasmine rice', true, 'grain|gf'),
    ('Dinner','Stir-Fry','Vegetable spring rolls', true, 'veg|crunch'),
    ('Dinner','Stir-Fry','Miso soup', false, 'hot|light'),
    ('Dinner','Stir-Fry','Cucumber salad', false, 'cold|fresh'),
    ('Dinner','Stir-Fry','Edamame', false, 'protein|veg'),
    ('Dinner','Casserole/Bake','Side salad (greens)', true, 'veg|light'),
    ('Dinner','Casserole/Bake','Garlic bread', true, 'bread'),
    ('Dinner','Casserole/Bake','Steamed broccoli', false, 'veg|light'),
    ('Dinner','Casserole/Bake','Roasted carrots', false, 'veg|sweet'),
    ('Dinner','Casserole/Bake','Green beans', false, 'veg|hot'),
    ('Dinner','Pizza/Flatbread','Side caesar', true, 'veg|classic'),
    ('Dinner','Pizza/Flatbread','Garlic knots', true, 'bread'),
    ('Dinner','Pizza/Flatbread','Antipasto cup', false, 'cold|savory'),
    ('Dinner','Pizza/Flatbread','Roasted vegetables', false, 'veg|hot'),
    ('Dinner','Pizza/Flatbread','Caprese salad', false, 'fresh|cold'),
    ('Dinner','Vegetarian Plate','Quinoa pilaf', true, 'grain|veg'),
    ('Dinner','Vegetarian Plate','Roasted vegetables', true, 'veg|hot'),
    ('Dinner','Vegetarian Plate','Side salad', false, 'veg|light'),
    ('Dinner','Vegetarian Plate','Garlic bread', false, 'bread'),
    ('Dinner','Vegetarian Plate','Mashed sweet potatoes', false, 'hearty|veg')
)
insert into public.meal_side_catalog (meal_type, dish_type, side_name, is_default, tags)
select
  meal_type,
  dish_type,
  side_name,
  is_default,
  case when tags_raw = '' then '{}'::text[] else string_to_array(tags_raw, '|') end
from raw
on conflict (meal_type, dish_type, side_name)
do update set
  is_default = excluded.is_default,
  tags = excluded.tags,
  updated_at = now();
