export type SideProfileTag =
  | 'light'
  | 'hearty'
  | 'veg'
  | 'crunch'
  | 'fresh'
  | 'comfort'
  | 'savory'
  | 'sweet'
  | 'tangy'
  | 'healthy';

export interface DishSideSuggestion {
  name: string;
  why_it_works: string;
  estimated_ingredients: string[];
  prep_style: 'hot' | 'cold';
  profile: SideProfileTag[];
  feasibility_rate: number;
  meal_type_fit: number;
  semantic_fit: number;
  dishSideScore: number;
  metadata?: {
    catalogId?: string;
    catalogDishType?: string;
    tags?: string[];
    isDefault?: boolean;
    isPinned?: boolean;
    position?: number;
  };
}

export interface DishMainAnalysis {
  cookAtHomeCost: number | null;
  orderOutCost: number | null;
  summary: string | null;
}

export interface DishMainIdea {
  name: string;
  description: string;
  cuisineType: string | null;
  cookTime: string | null;
  servings: number | null;
  ingredients: string[];
  instructions: string[];
  cookAtHomeCost: number | null;
  orderOutCost: number | null;
  analysisSummary: string | null;
}

export interface DishScorecardPayload {
  mealType: 'Breakfast' | 'Lunch' | 'Dinner';
  mainDish: {
    name: string;
    description: string;
    type?: string | null;
    cuisineType?: string | null;
    cookTime?: string | null;
    servings?: number | null;
    ingredients?: string[];
    instructions?: string[];
    analysis?: DishMainAnalysis;
  };
  sides: DishSideSuggestion[];
  mainDishes?: DishMainIdea[];
}

export interface GenerateDishResponse {
  dishScorecard?: DishScorecardPayload;
  rawSides?: DishSideSuggestion[];
  metadata?: {
    catalogCount?: number;
    openAiPromptTokens?: number | null;
    openAiCompletionTokens?: number | null;
  };
}
