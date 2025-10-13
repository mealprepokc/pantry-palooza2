export type DietaryKey =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'gluten_free'
  | 'dairy_free'
  | 'keto'
  | 'paleo';

export type DietaryPrefs = Partial<Record<DietaryKey, boolean>>;

export const DIETARY_KEYS: DietaryKey[] = ['vegan', 'vegetarian', 'pescatarian', 'gluten_free', 'dairy_free', 'keto', 'paleo'];

export const DIETARY_FEATURE_ENABLED = false;

const KEYWORDS = {
  meat: ['beef', 'steak', 'pork', 'bacon', 'ham', 'lamb', 'veal', 'prosciutto', 'salami', 'pepperoni', 'chorizo', 'duck', 'goat'],
  poultry: ['chicken', 'turkey', 'hen'],
  fish: ['salmon', 'tuna', 'tilapia', 'cod', 'trout', 'sardine', 'anchovy', 'halibut', 'mahi mahi', 'snapper'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'clam', 'mussel', 'oyster', 'scallop'],
  dairy: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'ghee', 'whey', 'kefir'],
  egg: ['egg', 'eggs', 'egg yolk', 'egg white', 'mayonnaise', 'aioli'],
  gluten: ['wheat', 'barley', 'rye', 'malt', 'semolina', 'farina', 'spelt', 'bulgur'],
  glutenFoods: ['bread', 'pasta', 'noodle', 'flour', 'tortilla', 'baguette', 'bun', 'roll', 'cracker', 'pastry'],
  legumes: ['bean', 'beans', 'lentil', 'legume', 'peanut', 'peas', 'chickpea', 'soy', 'edamame'],
  sugars: ['white sugar', 'cane sugar', 'brown sugar', 'corn syrup', 'high fructose', 'agave', 'maple syrup'],
  starchyVeg: ['potato', 'sweet potato', 'yam', 'parsnip'],
  refinedOils: ['canola oil', 'vegetable oil', 'corn oil'],
  fruitHighSugar: ['banana', 'mango', 'pineapple', 'grape', 'dates'],
};

const HONEY_KEYWORDS = ['honey'];

function includesAny(text: string, terms: string[]) {
  if (!terms.length) return false;
  const t = text.toLowerCase();
  return terms.some((k) => t.includes(k));
}

export function sanitizeDietaryPrefs(raw: any): DietaryPrefs {
  if (!DIETARY_FEATURE_ENABLED) return {};
  const prefs: DietaryPrefs = {};
  if (!raw || typeof raw !== 'object') return prefs;
  DIETARY_KEYS.forEach((key) => {
    if (raw[key]) prefs[key] = true;
  });
  return prefs;
}

export function isIngredientAllowed(ingredient: string, prefs: DietaryPrefs): boolean {
  if (!DIETARY_FEATURE_ENABLED) return true;
  const t = (ingredient || '').toLowerCase();
  if (!t) return true;

  const has = (key: keyof typeof KEYWORDS) => includesAny(t, KEYWORDS[key]);

  if (prefs.vegan) {
    if (has('meat') || has('poultry') || has('fish') || has('shellfish') || has('dairy') || has('egg') || includesAny(t, HONEY_KEYWORDS)) {
      return false;
    }
  }

  if (prefs.vegetarian) {
    if (has('meat') || has('poultry')) return false;
    if (!prefs.pescatarian && (has('fish') || has('shellfish'))) return false;
  }

  if (prefs.pescatarian) {
    if (has('meat') || has('poultry')) return false;
  }

  if (prefs.gluten_free) {
    if (has('gluten') || has('glutenFoods')) return false;
  }

  if (prefs.dairy_free && (has('dairy'))) {
    return false;
  }

  if (prefs.keto) {
    if (has('gluten') || has('glutenFoods') || has('legumes') || has('starchyVeg') || includesAny(t, KEYWORDS.sugars) || includesAny(t, KEYWORDS.fruitHighSugar)) {
      return false;
    }
  }

  if (prefs.paleo) {
    if (has('gluten') || has('glutenFoods') || has('legumes') || has('dairy') || includesAny(t, KEYWORDS.sugars)) {
      return false;
    }
    if (includesAny(t, KEYWORDS.refinedOils)) return false;
  }

  return true;
}

export const DIETARY_OPTIONS: Array<{ key: DietaryKey; label: string; helper: string }> = [
  { key: 'vegan', label: 'Vegan', helper: 'Plant-based, no animal products.' },
  { key: 'vegetarian', label: 'Vegetarian', helper: 'No meat or poultry.' },
  { key: 'pescatarian', label: 'Pescatarian', helper: 'Seafood ok, no meat or poultry.' },
  { key: 'gluten_free', label: 'Gluten-free', helper: 'Avoid wheat, barley, and rye.' },
  { key: 'dairy_free', label: 'Dairy-free', helper: 'Skip milk-based products.' },
  { key: 'keto', label: 'Keto', helper: 'Low-carb, high-fat focus.' },
  { key: 'paleo', label: 'Paleo', helper: 'Whole foods, no grains or legumes.' },
];

export const DIETARY_LIBRARY_RECOMMENDATIONS: Record<DietaryKey, Partial<Record<string, string[]>>> = {
  vegan: {
    Proteins: ['Tofu', 'Tempeh', 'Chickpeas', 'Lentils', 'Seitan'],
    Dairy: ['Almond Milk', 'Oat Milk', 'Coconut Yogurt', 'Nutritional Yeast'],
    'Sauces/Condiments': ['Tahini', 'Tamari'],
    'Non-Perishable Items': ['Black Beans', 'Canned Chickpeas']
  },
  vegetarian: {
    Proteins: ['Paneer', 'Eggs'],
    Dairy: ['Greek Yogurt', 'Halloumi', 'Goat Cheese']
  },
  pescatarian: {
    Proteins: ['Salmon', 'Tuna', 'Shrimp', 'Cod', 'Scallops'],
    'Sauces/Condiments': ['Fish Sauce', 'Seaweed'],
  },
  gluten_free: {
    Grains: ['Quinoa', 'Brown Rice', 'Buckwheat'],
    Pasta: ['Rice Noodles', 'Chickpea Pasta', 'Zucchini Noodles'],
    Breads: ['Gluten-Free Bread', 'Cassava Tortillas'],
  },
  dairy_free: {
    Dairy: ['Almond Milk', 'Coconut Milk', 'Vegan Cheese', 'Cashew Cream'],
    'Sauces/Condiments': ['Coconut Yogurt'],
  },
  keto: {
    Proteins: ['Chicken Thighs', 'Ground Beef', 'Salmon', 'Pork Belly'],
    Produce: ['Cauliflower', 'Broccoli', 'Spinach', 'Avocado', 'Zucchini'],
    'Sauces/Condiments': ['Avocado Oil', 'MCT Oil', 'Pesto'],
  },
  paleo: {
    Proteins: ['Grass-Fed Beef', 'Turkey', 'Wild-Caught Salmon'],
    Produce: ['Sweet Potatoes', 'Cauliflower Rice', 'Brussels Sprouts'],
    'Non-Perishable Items': ['Almond Flour', 'Coconut Flour'],
    'Sauces/Condiments': ['Coconut Aminos'],
  },
};
