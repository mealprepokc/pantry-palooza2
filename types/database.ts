export interface UserSelection {
  id: string;
  user_id: string;
  seasonings: string[];
  vegetables: string[];
  entrees: string[];
  pastas: string[];
  equipment: string[];
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
}

export interface GeneratedDish {
  title: string;
  cuisine_type: string;
  cooking_time: string;
  ingredients: string[];
  instructions: string;
  servings?: number | null;
}
