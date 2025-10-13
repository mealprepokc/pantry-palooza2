export type DinnerSection =
  | 'Proteins'
  | 'Produce'
  | 'Grains'
  | 'Breads'
  | 'Dairy'
  | 'Condiments'
  | 'Equipment';

export type DinnerLibrary = Record<DinnerSection, string[]>;

export const DINNER_SECTIONS: DinnerSection[] = [
  'Proteins',
  'Produce',
  'Grains',
  'Breads',
  'Dairy',
  'Condiments',
  'Equipment',
];

export const DINNER_MIN_COMPLETE = 6;

export const DINNER_DEFAULTS: DinnerLibrary = {
  Proteins: ['Chicken Thighs', 'Ground Beef', 'Pork Chops', 'Salmon', 'Shrimp'],
  Produce: ['Onions', 'Garlic', 'Carrots', 'Bell Peppers', 'Broccoli'],
  Grains: ['Jasmine Rice', 'Farro', 'Couscous', 'Barley', 'Wild Rice'],
  Breads: ['Garlic Bread', 'Ciabatta', 'Dinner Rolls', 'Flatbread', 'Naan'],
  Dairy: ['Butter', 'Parmesan', 'Mozzarella', 'Heavy Cream', 'Ricotta'],
  Condiments: ['Soy Sauce', 'Tomato Paste', 'BBQ Sauce', 'Pesto', 'Hot Sauce'],
  Equipment: ['Dutch Oven', 'Sheet Pan', 'Skillet', 'Slow Cooker', 'Instant Pot'],
};

export const DINNER_SUGGESTIONS: DinnerLibrary = {
  Proteins: ['Steak', 'Lamb Chops', 'Cod', 'Tofu', 'Italian Sausage', 'Meatballs', 'Rotisserie Chicken', 'Duck Breast'],
  Produce: ['Asparagus', 'Zucchini', 'Eggplant', 'Mushrooms', 'Leeks', 'Brussels Sprouts', 'Butternut Squash', 'Kale'],
  Grains: ['Polenta', 'Bulgur', 'Freekeh', 'Quinoa', 'Millet'],
  Breads: ['Sourdough', 'Cornbread', 'Baguette', 'Tortillas', 'Pita'],
  Dairy: ['Goat Cheese', 'Gouda', 'Gruyere', 'Mascarpone', 'Yogurt'],
  Condiments: ['Harissa', 'Chimichurri', 'Curry Paste', 'Balsamic Glaze', 'Fish Sauce'],
  Equipment: ['Air Fryer', 'Grill Pan', 'Roasting Pan', 'Mandoline', 'Microplane'],
};

export const createEmptyDinnerLibrary = (): DinnerLibrary => {
  return DINNER_SECTIONS.reduce((acc, section) => {
    acc[section] = [];
    return acc;
  }, {} as DinnerLibrary);
};

export const mergeDinnerDefaults = (current: DinnerLibrary): DinnerLibrary => {
  const next: DinnerLibrary = { ...current };
  DINNER_SECTIONS.forEach((section) => {
    const combined = new Set<string>([
      ...(current[section] || []),
      ...(DINNER_DEFAULTS[section] || []),
    ]);
    next[section] = Array.from(combined).sort((a, b) => a.localeCompare(b));
  });
  return next;
};
