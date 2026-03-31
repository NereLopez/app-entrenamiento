import { Injectable, signal, computed, inject } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class NutricionService {
  private firestore = inject(Firestore);

  public userName = signal<string>('');
  public weight = signal<number | null>(null);
  public height = signal<number | null>(null);
  public age = signal<number | null>(null);
  public gender = signal<'male' | 'female'>('male');
  public activityLevel = signal<number>(1.55); 
  public goal = signal<'lose' | 'maintain' | 'gain'>('maintain');
  public isWorkoutDay = signal<boolean>(false);

 
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

  async saveToFirestore() {
    const colRef = collection(this.firestore, 'user_nutrition');
    return addDoc(colRef, {
      userName: this.userName(),
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
}