export type LunchSection =
  | 'Proteins'
  | 'Produce'
  | 'Grains'
  | 'Breads'
  | 'Dairy'
  | 'Condiments'
  | 'Equipment';

export type LunchLibrary = Record<LunchSection, string[]>;

export const LUNCH_SECTIONS: LunchSection[] = [
  'Proteins',
  'Produce',
  'Grains',
  'Breads',
  'Dairy',
  'Condiments',
  'Equipment',
];

export const LUNCH_MIN_COMPLETE = 6;

export const LUNCH_DEFAULTS: LunchLibrary = {
  Proteins: ['Chicken Breast', 'Turkey Slices', 'Ham', 'Tuna Salad', 'Tofu'],
  Produce: ['Lettuce', 'Tomatoes', 'Cucumbers', 'Spinach', 'Bell Peppers'],
  Grains: ['Quinoa', 'Brown Rice', 'Farro', 'Couscous', 'Barley'],
  Breads: ['Whole Grain Bread', 'Tortillas', 'Wraps', 'Ciabatta', 'Pita'],
  Dairy: ['Cheddar Cheese', 'Mozzarella', 'Greek Yogurt', 'Feta', 'Cream Cheese'],
  Condiments: ['Mayo', 'Mustard', 'Balsamic Vinaigrette', 'Pesto', 'Salsa'],
  Equipment: ['Skillet', 'Grill Pan', 'Toaster', 'Mixing Bowl', 'Chef Knife'],
};

export const LUNCH_SUGGESTIONS: LunchLibrary = {
  Proteins: [
    'Grilled Chicken',
    'Roast Beef',
    'Pulled Pork',
    'Smoked Turkey',
    'Black Beans',
    'Chickpeas',
    'Egg Salad',
    'Shrimp',
    'Edamame',
  ],
  Produce: [
    'Arugula',
    'Carrots',
    'Red Cabbage',
    'Avocado',
    'Kale',
    'Herbs',
    'Roasted Peppers',
    'Apples',
    'Grapes',
  ],
  Grains: ['Wild Rice', 'Bulgur', 'Freekeh', 'Oats', 'Millet'],
  Breads: ['Baguette', 'Brioche', 'Whole Wheat Wrap', 'Focaccia', 'Sourdough'],
  Dairy: ['Goat Cheese', 'Blue Cheese', 'Parmesan Shavings', 'Swiss Cheese', 'Yogurt Ranch'],
  Condiments: ['Honey Mustard', 'Chipotle Mayo', 'Italian Dressing', 'Hummus', 'Tahini'],
  Equipment: ['Food Processor', 'Blender', 'Mandoline', 'Salad Spinner', 'Sheet Pan'],
};

export const createEmptyLunchLibrary = (): LunchLibrary => {
  return LUNCH_SECTIONS.reduce((acc, section) => {
    acc[section] = [];
    return acc;
  }, {} as LunchLibrary);
};

export const mergeLunchDefaults = (current: LunchLibrary): LunchLibrary => {
  const next: LunchLibrary = { ...current };
  LUNCH_SECTIONS.forEach((section) => {
    const combined = new Set<string>([
      ...(current[section] || []),
      ...(LUNCH_DEFAULTS[section] || []),
    ]);
    next[section] = Array.from(combined).sort((a, b) => a.localeCompare(b));
  });
  return next;
};
