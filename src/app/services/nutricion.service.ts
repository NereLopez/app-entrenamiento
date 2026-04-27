import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, where, doc, deleteDoc } from '@angular/fire/firestore';
import { FoodEntry } from '../models/nutricion.model';
import { Auth, user } from '@angular/fire/auth';
import { EntrenamientoService } from './entrenamiento.service';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class NutricionService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private entrenamientoService = inject(EntrenamientoService);
  private toastController = inject(ToastController);
   


  public weight = signal<number | null>(null);
  public height = signal<number | null>(null);
  public age = signal<number | null>(null);
  public gender = signal<'male' | 'female'>('male');
  public activityLevel = signal<number>(1.55); 
  public goal = signal<'lose' | 'maintain' | 'gain'>('maintain');
  public isWorkoutDay = signal<boolean>(false);
  public isNutritionCompleteToday = signal<boolean>(false);
  public dailyMeals = signal<FoodEntry[]>([]);

  public isLoading = signal<boolean>(false);

  private get userId(): string | undefined {
    return this.auth.currentUser?.uid;
  }


  constructor (){
    // Escuchamos cuando el usuario se loguea para cargar sus comidas
    user(this.auth).subscribe(u => {
    if (u) {
      this.fetchDailyMeals(); 
      this.fetchUserProfile(u.uid);
    }
  });
    effect(() => {
      const isWorkoutComplete = this.entrenamientoService.isWorkoutCompletedToday();
      console.log('NutricionService detectó cambio en entrenamiento:', isWorkoutComplete); 
      if (isWorkoutComplete) {
        this.isWorkoutDay.set(true);
        console.log('Training Day! Ajusting nutrition goals...');    

      }
    });

    effect(() => {
    const target = this.targetCalories(); 
    const consumed = this.caloriesConsumed();

    if(consumed > 0 && consumed >= (target * 0.8)) {
      this.isNutritionCompleteToday.set(true);
    } else {
      this.isNutritionCompleteToday.set(false);
    }
  });
  }

  public consumedMacros = computed(() => {
    return this.dailyMeals().reduce((acc, meal) => {
      acc.protein += (Number(meal.protein) || 0);
      acc.carbs += (Number(meal.carbs) || 0);
      acc.fats += (Number(meal.fats) || 0);
      return acc;
    }, { protein: 0, carbs: 0, fats: 0 });
  });

  private async fetchUserProfile(userId: string) {  
   // "Solo carga el código para leer documentos cuando realmente alguien vaya a consultar su perfil". 
   // Esto hace que tu app arranque mucho más rápido en el móvil
    const { doc, getDoc } = await import('@angular/fire/firestore');
   const colRef = collection(this.firestore, 'user_nutrition');
  // Aquí lo ideal es que el documento tenga como ID el UID del usuario
  const docRef = doc(this.firestore, `user_nutrition/${userId}`);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    this.weight.set(data['weight']);
    this.height.set(data['height']);
    this.age.set(data['age']);
    this.gender.set(data['gender']);
    this.goal.set(data['goal']);
    this.activityLevel.set(data['activityLevel'] || 1.55);
  }
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
  if (!this.userId) return;

  const today = new Date().setHours(0, 0, 0, 0);
  const colRef = collection(this.firestore, 'food_entries');
  const q = query(
    colRef, 
    where('userId', '==', this.userId), 
    where('date', '==', today)
  );

 
  collectionData(q, { idField: 'id' }).subscribe((data) => {
   
    this.dailyMeals.set(data as FoodEntry[]);
    console.log('Comidas del día cargadas:', data);
  });
}

  
  async saveToFirestore() {
    if (!this.userId) return;

    const { doc, setDoc } = await import('@angular/fire/firestore');
    const docRef = doc(this.firestore, `user_nutrition/${this.userId}`);
    await setDoc(docRef, {
      weight: this.weight(),
      height: this.height(),
      age: this.age(),
      gender: this.gender(),
      goal: this.goal(),
      bmr: this.bmr(),
      targetCalories: this.targetCalories(),
      macros: this.macros(),
      createdAt: new Date()
    }, { merge: true });  
  }   
  
  async addFoodEntry(name: string, calories: number, type: any, p:number = 0, c: number = 0, f: number = 0) {
    if (!this.userId) return;
    this.isLoading.set(true);

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
      await addDoc(colRef, {...newEntry, userId: this.userId});
      this.showToast('Meal guardada');
    } catch (error) {
      this.showToast('No se pudo guardar la comida', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }
  async deleteFoodEntry(id: string) {
    try {
      this.isLoading.set(true);
      const docRef = doc(this.firestore, `food_entries/${id}`);
      await deleteDoc(docRef);
      this.showToast('Comida eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar la comida:', error);
      this.showToast('No se pudo eliminar la comida', 'danger');
    } finally {
      this.isLoading.set(false);
    }
  }

 async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      color: color,
      position: 'bottom'
    });

    await toast.present();
  }
}