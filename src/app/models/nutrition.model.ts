export interface UserNutrition {
  age: number;
  weight: number;
  height: number;
  gender: 'male' | 'female';
  goal: 'lose' | 'maintain' | 'gain';
  caloriesTarget: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  updatedAt: Date;
}

export interface FoodEntry {
  id?: string;
  name: string;
  calories: number;
  type: 'breakfast' | 'lunch' | 'dinner'| 'snack' ;
  protein: number;
  carbs: number;
  fats: number;
  date: number;
}

export interface FoodPreset {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  type: 'breakfast' | 'lunch' | 'dinner'| 'snack' ;
}