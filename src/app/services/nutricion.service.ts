import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, where } from '@angular/fire/firestore';
import { FoodEntry } from '../models/nutricion.model';
import { Auth, user } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class NutricionService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  public weight = signal<number | null>(null);
  public height = signal<number | null>(null);
  public age = signal<number | null>(null);
  public gender = signal<'male' | 'female'>('male');
  public activityLevel = signal<number>(1.55); 
  public goal = signal<'lose' | 'maintain' | 'gain'>('maintain');
  public isWorkoutDay = signal<boolean>(false);
  public isNutritionCompleteToday = signal<boolean>(false);
  public dailyMeals = signal<FoodEntry[]>([]);


  constructor (){
    // Escuchamos cuando el usuario se loguea para cargar sus comidas
    user(this.auth).subscribe(u => {
    if (u) {
      this.fetchDailyMeals(); 
    }
  });

    effect(() => {
    const target = this.targetCalories(); // Tu computed de kcal objetivo
    const consumed = this.caloriesConsumed();

    if(consumed > 0 && consumed >= (target * 0.8)) {
      this.isNutritionCompleteToday.set(true);
    } else {
      this.isNutritionCompleteToday.set(false);
    }
  });
}
  

 
  public bmr = computed(() => {
    const w = this.weight();
    const h = this.height();
    const a = this.age();

    if (!w || !h || !a) return 0;

    if (this.gender() === 'male') {
      return (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      return (10 * w) + (6.25 * h) - (5 * a) - 161;
    }
  });

  public targetCalories = computed(() => {
    let base = Math.round(this.bmr() * this.activityLevel());
    if (base === 0) return 0;

    if (this.goal() === 'lose') return base -= 500;
    if (this.goal() === 'gain') return base += 400;
    return this.isWorkoutDay() ? base + 300 : base -100;
  });



  public macros = computed(() => {
    const total = this.targetCalories();
    if (total === 0) return { protein: 0, carbs: 0, fats: 0 };
    
    return {
      protein: Math.round((total * 0.30) / 4),
      carbs: Math.round((total * 0.40) / 4),
      fats: Math.round((total * 0.30) / 9)
    };
  });

  public caloriesConsumed = computed(() => {
  return this.dailyMeals().reduce((total, meal) => total + meal.calories, 0);
  });

  public fetchDailyMeals() {
  const userId = this.auth.currentUser?.uid;
  if (!userId) return;

  const today = new Date().setHours(0, 0, 0, 0);
  const colRef = collection(this.firestore, 'food_entries');
  const q = query(
    colRef, 
    where('userId', '==', userId), 
    where('date', '==', today)
  );

 
  collectionData(q, { idField: 'id' }).subscribe((data) => {
   
    this.dailyMeals.set(data as FoodEntry[]);
    console.log('Comidas del día cargadas:', data);
  });
}

  
  async saveToFirestore() {
    const colRef = collection(this.firestore, 'user_nutrition');
    await addDoc(colRef, {
      weight: this.weight(),
      height: this.height(),
      age: this.age(),
      gender: this.gender(),
      goal: this.goal(),
      bmr: this.bmr(),
      targetCalories: this.targetCalories(),
      macros: this.macros(),
      createdAt: new Date()
    });  
  }   
  
  async addFoodEntry(name: string, calories: number, type: any, p:number = 0, c: number = 0, f: number = 0) {
    const userId = this.auth.currentUser?.uid;
    if (!userId) return;

    try {
      const colRef = collection(this.firestore, 'food_entries');

      const newEntry: FoodEntry = {
        name: name,
        calories: calories,
        type: type,
        protein: p,
        carbs: c,
        fats: f,
        date: new Date().setHours(0, 0, 0, 0)
      };
      await addDoc(colRef, {...newEntry, userId: userId});
      console.log('Meal guardada');
    } catch (error) {
      console.error('Error al guardar la comida:',error);
    }  
  }
  async deleteFoodEntry(id: string) {
    try {
      const { doc, deleteDoc } = await import('@angular/fire/firestore'); // Importación dinámica si no las tienes arriba
      const docRef = doc(this.firestore, `food_entries/${id}`);
      await deleteDoc(docRef);
      console.log('Comida eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la comida:', error);
    }
  }
}