export type DietaryPrefs = {
  vegan?: boolean;
  vegetarian?: boolean;
  pescatarian?: boolean;
  gluten_free?: boolean;
  dairy_free?: boolean;
  nut_free?: boolean;
  egg_free?: boolean;
  shellfish_free?: boolean;
  soy_free?: boolean;
  pork_free?: boolean;
  beef_free?: boolean;
  halal_friendly?: boolean;
  kosher_friendly?: boolean;
  low_sodium?: boolean;
};

const KEYWORDS = {
  meat: ['beef', 'steak', 'pork', 'bacon', 'ham', 'lamb', 'veal', 'prosciutto', 'salami', 'pepperoni'],
  poultry: ['chicken', 'turkey', 'duck'],
  fish: ['salmon', 'tuna', 'tilapia', 'cod', 'trout', 'sardine', 'anchovy'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop'],
  dairy: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'ghee', 'whey'],
  egg: ['egg', 'eggs', 'egg yolk', 'egg white', 'mayonnaise'],
  gluten: ['wheat', 'barley', 'rye', 'malt', 'semolina', 'farina', 'spelt', 'bulgur'],
  glutenFoods: ['bread', 'pasta', 'noodle', 'flour', 'tortilla', 'baguette', 'bun', 'roll'],
  nuts: ['almond', 'peanut', 'walnut', 'pecan', 'cashew', 'hazelnut', 'pistachio', 'macadamia'],
  soy: ['soy', 'tofu', 'soybean', 'edamame', 'soya', 'miso', 'tempeh'],
  pork: ['pork', 'bacon', 'ham', 'prosciutto'],
  beef: ['beef', 'steak'],
  highSodium: ['soy sauce', 'fish sauce', 'bouillon', 'broth cube', 'cured', 'salted', 'pickled'],
};

function includesAny(text: string, terms: string[]) {
  const t = text.toLowerCase();
  return terms.some((k) => t.includes(k));
}

export function isIngredientAllowed(ingredient: string, prefs: DietaryPrefs): boolean {
  const t = (ingredient || '').toLowerCase();

  // Base diet types
  if (prefs.vegan) {
    if (
      includesAny(t, [...KEYWORDS.meat, ...KEYWORDS.poultry, ...KEYWORDS.fish, ...KEYWORDS.shellfish]) ||
      includesAny(t, KEYWORDS.dairy) ||
      includesAny(t, KEYWORDS.egg)
    ) return false;
  }
  if (prefs.vegetarian) {
    if (includesAny(t, [...KEYWORDS.meat, ...KEYWORDS.poultry, ...KEYWORDS.shellfish])) return false;
    // fish disallowed unless pescatarian
    if (includesAny(t, KEYWORDS.fish) && !prefs.pescatarian) return false;
  }
  if (prefs.pescatarian) {
    // allow fish; disallow meat/poultry/shellfish
    if (includesAny(t, [...KEYWORDS.meat, ...KEYWORDS.poultry, ...KEYWORDS.shellfish])) return false;
  }

  // Additional restrictions
  if (prefs.gluten_free) {
    if (includesAny(t, [...KEYWORDS.gluten, ...KEYWORDS.glutenFoods])) return false;
  }
  if (prefs.dairy_free && includesAny(t, KEYWORDS.dairy)) return false;
  if (prefs.nut_free && includesAny(t, KEYWORDS.nuts)) return false;
  if (prefs.egg_free && includesAny(t, KEYWORDS.egg)) return false;
  if (prefs.shellfish_free && includesAny(t, KEYWORDS.shellfish)) return false;
  if (prefs.soy_free && includesAny(t, KEYWORDS.soy)) return false;
  if (prefs.pork_free && includesAny(t, KEYWORDS.pork)) return false;
  if (prefs.beef_free && includesAny(t, KEYWORDS.beef)) return false;

  // Religious-friendly hints (lightweight; not exhaustive)
  if (prefs.halal_friendly) {
    // No pork, avoid alcohol-based sauces (not modeled now)
    if (includesAny(t, KEYWORDS.pork)) return false;
  }
  if (prefs.kosher_friendly) {
    // No pork, shellfish; avoid mixing meat/dairy (not modeled now)
    if (includesAny(t, [...KEYWORDS.pork, ...KEYWORDS.shellfish])) return false;
  }

  if (prefs.low_sodium && includesAny(t, KEYWORDS.highSodium)) return false;

  return true;
}
