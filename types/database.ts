export interface UserSelection {
  id: string;
  user_id: string;
  seasonings: string[];
  vegetables: string[];
  entrees: string[];
  pastas: string[];
  equipment: string[];
  breakfast_proteins?: string[];
  breakfast_produce?: string[];
  breakfast_grains?: string[];
  breakfast_breads?: string[];
  breakfast_dairy?: string[];
  breakfast_condiments?: string[];
  breakfast_equipment?: string[];
  created_at: string;
  updated_at: string;
}

export interface SavedDish {
  id: string;
  user_id: string;
  title: string;
  cuisine_type: string;
  cooking_time: string;
  ingredients: string[];
  instructions: string;
  created_at: string;
  servings?: number | null;
  calories_est?: number | null;
  cost_est?: number | null;
  restaurant_cost_est?: number | null;
  savings_est?: number | null;
  suggested_sides?: string[] | null;
}

export interface GeneratedDish {
  title: string;
  cuisine_type: string;
  cooking_time: string;
  ingredients: string[];
  instructions: string | string[];
  servings?: number | null;
  baseServings?: number | null;
  mealType?: string | null;
  mainDishName?: string | null;
  mainDishDescription?: string | null;
  dishType?: string | null;
  sides?: import('./generated').DishSideSuggestion[];
  rawSides?: import('./generated').DishSideSuggestion[];
  sideMetadata?: {
    catalogCount?: number;
    openAiPromptTokens?: number | null;
    openAiCompletionTokens?: number | null;
  };
  cookAtHomeCost?: number | null;
  orderOutCost?: number | null;
  analysisSummary?: string | null;
  calories?: number | null;
  caloriesPerServing?: number | null;
  totalCostUsd?: number | null;
  costPerServingUsd?: number | null;
}

export interface EdgeGeneratedDish {
  title: string;
  cuisine_type: string;
  cooking_time: string;
  ingredients: string[];
  instructions: string[];
  calories_per_serving: number | null;
  total_cost_usd: number | null;
  cost_per_serving_usd: number | null;
  servings: number;
}

export interface GenerateDishesFunctionResponse {
  dishes: EdgeGeneratedDish[];
  error?: string;
  details?: string;
}
