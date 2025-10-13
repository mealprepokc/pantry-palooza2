export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';
export type MealTab = MealType;

export type MasterSection =
  | 'Seasonings'
  | 'Produce'
  | 'Proteins'
  | 'Grains'
  | 'Breads'
  | 'Dairy'
  | 'Sauces/Condiments'
  | 'Non-Perishable Items'
  | 'Pasta'
  | 'Equipment';

export const MASTER_SECTIONS: MasterSection[] = [
  'Seasonings',
  'Produce',
  'Proteins',
  'Grains',
  'Breads',
  'Dairy',
  'Sauces/Condiments',
  'Non-Perishable Items',
  'Pasta',
  'Equipment',
];

export type MasterLibrary = Record<MasterSection, string[]>;

export type LibraryInputs = Record<MasterSection, string>;

export type LibraryUnsaved = boolean;

export const INITIAL_UNSAVED = false;

export type LibrarySnapshot = {
  master: MasterLibrary;
  updatedAt?: string;
};

export type MealSectionMap = Record<MealType, MasterSection[]>;

export const MEAL_SECTION_MAP: MealSectionMap = {
  Breakfast: ['Proteins', 'Produce', 'Grains', 'Breads', 'Dairy', 'Sauces/Condiments', 'Equipment'],
  Lunch: ['Proteins', 'Produce', 'Grains', 'Breads', 'Dairy', 'Sauces/Condiments', 'Equipment'],
  Dinner: ['Proteins', 'Produce', 'Grains', 'Breads', 'Dairy', 'Sauces/Condiments', 'Equipment'],
};

export const MEAL_COMPLETION_THRESHOLD: Record<MealType, number> = {
  Breakfast: 4,
  Lunch: 4,
  Dinner: 4,
};

export const createEmptyMasterLibrary = (): MasterLibrary => {
  return MASTER_SECTIONS.reduce((acc, section) => {
    acc[section] = [];
    return acc;
  }, {} as MasterLibrary);
};
