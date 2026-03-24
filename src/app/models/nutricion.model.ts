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