import { Injectable, signal, inject, computed, Injector, runInInjectionContext } from '@angular/core';
import { 
  Firestore, collection, addDoc, query, where, orderBy, 
  collectionData, doc, getDoc, setDoc, updateDoc, deleteDoc 
} from '@angular/fire/firestore'; 
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Subscription } from 'rxjs';


export interface UserStats {
  experiencePoints: number;
  personalRecords: { [key: string]: number };
  currentStreak: number;
  lastSessionDate: number;
  dailyCaloriesTarget: number;
  caloriesBurnedToday?: number;
  weeklyActivity?: { [weekId: string]: any[] };
}

@Injectable({ providedIn: 'root' })
export class EntrenamientoService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(Injector);

  public selectedExercise = signal<string | null>(null);
  public currentTab = signal<string>('dashboard');
  public userSignal = signal<any>(null);
  public history = signal<any[]>([]);

  public userLevel = computed(() => {
    const xp = this.statsSignal().experiencePoints;
    if (xp >= 2000) {
      return 'LEVELS.ADVANCED';
    } else if (xp >= 500) {
      return 'LEVELS.INTERMEDIATE';
    } else {
      return 'LEVELS.BEGINNER';
    }
    });
    
    public xpProgress = computed(() => {
      const xp = this.statsSignal().experiencePoints;
      if (xp >= 2000) return 100;
      if (xp >= 500) return ((xp - 500) / 1500) * 100;
      return (xp / 500) * 100; 
      });
  

  public isWorkoutCompletedToday = signal<boolean>(false);
  public isAuthReady = signal<boolean>(false);
  private historySubscription?: Subscription;
  
  public statsSignal = signal<UserStats>({
    experiencePoints: 0,
    personalRecords: {},
    currentStreak: 0,
    lastSessionDate: 0,
    dailyCaloriesTarget: 0,
    caloriesBurnedToday: 0
  });

  constructor() {
    // 1. "user(this.auth)" es una herramienta de Firebase que observa
    // constantemente si alguien entra o sale de la sesión.
    user(this.auth).subscribe(u => {
      // 2. Si hay cambios, actualizamos tu "señal" (userSignal).
      // Esto hace que toda la app se entere de que el usuario ha cambiado.
      this.userSignal.set(u);
      // 3. Si el usuario existe (u), le pedimos al servicio que vaya
      // a la base de datos a buscar su historial y sus estadísticas.
      this.isAuthReady.set(true);
      this.resetUserState();
      if (u) {
        this.fetchHistory(u.uid);
        this.fetchUserStats(u.uid); 
      }
    });
  }

  private resetUserState() {
    this.historySubscription?.unsubscribe();
    this.historySubscription = undefined;
    this.history.set([]);
    this.isWorkoutCompletedToday.set(false);
    this.statsSignal.set({
      experiencePoints: 0,
      personalRecords: {},
      currentStreak: 0,
      lastSessionDate: 0,
      dailyCaloriesTarget: 0,
      caloriesBurnedToday: 0
    });
  }

  private async getUserWeightKg(userId: string): Promise<number | null> {
    const profileRef = doc(this.firestore, `user_nutrition/${userId}`);
    const profileSnap = await runInInjectionContext(this.injector, () => getDoc(profileRef));

    if (!profileSnap.exists()) {
      return null;
    }

    const weight = Number(profileSnap.data()?.['weight']);
    return Number.isFinite(weight) && weight > 0 ? weight : null;
  }

  public userName = computed(() => {
    const u = this.userSignal();
    let name = u?.displayName || u?.email?.split('@')[0] || 'User';
    name = name.replace(/\./g, ' ').trim();
    return name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : 'User';
  });

  public totalVolume = computed(() => {
    let total = 0;
    this.history().forEach((w: any) => {
      w.exercises?.forEach((ex: any) => {
        ex.sets?.forEach((s: any) => {
          const weight = Number(s.weight) || 0;
          const reps = Number(s.reps || s.repetitions) || 0;
          total += weight * reps;
        });
      });
    });
    return total;
  });

  
  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

  
  private async fetchUserStats(userId: string) {
    const docRef = doc(this.firestore, `stats/${userId}`);
    const snap = await runInInjectionContext(this.injector, () => getDoc(docRef));

    if (this.auth.currentUser?.uid !== userId) {
      return;
    }

    if (snap.exists()) {
      const stats = snap.data() as UserStats;
      this.statsSignal.set(stats);

      const today = new Date().setHours(0, 0, 0, 0);
      const lastSession = new Date(stats.lastSessionDate ||0).setHours(0, 0, 0, 0);

      // Keep stored streak/history intact; only toggle whether today's workout is already done.
      this.isWorkoutCompletedToday.set(today === lastSession);
    } else {
      this.isWorkoutCompletedToday.set(false);
    }
  }

  private fetchHistory(userId: string) {
    const ref = collection(this.firestore, 'workouts');
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    this.historySubscription?.unsubscribe();
    this.historySubscription = runInInjectionContext(
      this.injector,
      () => collectionData(q, { idField: 'id' })
    ).subscribe(async data => {
      this.history.set(data);
      await this.syncCaloriesBurnedToday(userId, data as any[]);
    });
  }

  private getMetByIntensity(intensity: 'light' | 'moderate' | 'intense' = 'moderate'): number {
    const metByIntensity: Record<'light' | 'moderate' | 'intense', number> = {
      light: 4.5,
      moderate: 6.0,
      intense: 8.0
    };
    return metByIntensity[intensity] ?? 6.0;
  }

  private getWorkoutCalories(workoutExercises: any[], intensity: 'light' | 'moderate' | 'intense', weightKg: number): number {
    let totalSets = 0;
    workoutExercises.forEach(exercise => {
      exercise.sets?.forEach(() => {
        totalSets += 1;
      });
    });

    if (totalSets === 0) {
      return 0;
    }

    const estimatedMinutes = Math.max(15, Math.round(totalSets * 2.2));
    const met = this.getMetByIntensity(intensity);
    return Math.round(((met * 3.5 * weightKg) / 200) * estimatedMinutes);
  }

  private async syncCaloriesBurnedToday(userId: string, workoutsData?: any[]) {
    if (this.auth.currentUser?.uid !== userId) {
      return;
    }

    const workouts = workoutsData ?? this.history();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const tomorrowStart = todayStart + 86400000;
    const referenceWeightKg = (await this.getUserWeightKg(userId)) ?? 70;

    const caloriesToday = workouts
      .filter(workout => {
        const createdAt = workout.createdAt instanceof Date
          ? workout.createdAt.getTime()
          : Number(workout.createdAt);
        return Number.isFinite(createdAt) && createdAt >= todayStart && createdAt < tomorrowStart;
      })
      .reduce((total, workout) => {
        const intensity = (workout.intensity || 'moderate') as 'light' | 'moderate' | 'intense';
        return total + this.getWorkoutCalories(workout.exercises || [], intensity, referenceWeightKg);
      }, 0);

    const current = this.statsSignal();
    if ((current.caloriesBurnedToday || 0) === caloriesToday) {
      return;
    }

    const nextStats = { ...current, caloriesBurnedToday: caloriesToday };
    this.statsSignal.set(nextStats);
    const statsRef = doc(this.firestore, `stats/${userId}`);
    await setDoc(statsRef, { caloriesBurnedToday: caloriesToday }, { merge: true });
  }

  
  async finalizeSession(workoutExercises: any[], intensity: 'light' | 'moderate' | 'intense' = 'moderate') {
    const currentUser = this.userSignal();
    if (!currentUser) return;

    const userId = currentUser.uid;
    const statsRef = doc(this.firestore, `stats/${userId}`);
    
    
    let currentStats = { ...this.statsSignal() };

    let newXP = 50; 
    let brokeRecord = false;

    
    workoutExercises.forEach(exercise => {
      if (exercise.sets && exercise.sets.length > 0) {
        
        const weights = exercise.sets.map((s: any) => Number(s.weight || 0));
        const sessionMaxWeight = Math.max(...weights);
        const exerciseKey = exercise.name.toLowerCase();

        if (sessionMaxWeight > (currentStats.personalRecords[exerciseKey] || 0)) {
          currentStats.personalRecords[exerciseKey] = sessionMaxWeight;
          newXP += 25; 
          brokeRecord = true;
        }
      }
    });

    const today = new Date().setHours(0, 0, 0, 0);
    const lastSession = new Date(currentStats.lastSessionDate || 0).setHours(0, 0, 0, 0);
    const oneDayInMs = 86400000;

    if (today > lastSession) {
      const daysSinceLastSession = (today - lastSession) / oneDayInMs;
      if (daysSinceLastSession === 1) {
        currentStats.currentStreak += 1;
      } else {
        currentStats.currentStreak = 1;
      }
      currentStats.lastSessionDate = today;
    } else if (today === lastSession && (currentStats.currentStreak || 0) === 0) {
      // Recovery path for previously corrupted stats (session today but streak persisted as 0).
      currentStats.currentStreak = 1;
      currentStats.lastSessionDate = today;
    }

    const referenceWeightKg = (await this.getUserWeightKg(userId)) ?? 70;
    const caloriesBurned = this.getWorkoutCalories(workoutExercises, intensity, referenceWeightKg);

    currentStats.experiencePoints += newXP;

    // Avoid writing stale per-day burn here; it is recomputed from today's full history.
    const { caloriesBurnedToday, ...statsWithoutDailyBurn } = currentStats;
    void caloriesBurnedToday;
    await setDoc(statsRef, statsWithoutDailyBurn, { merge: true });
    this.statsSignal.set(currentStats);

    // Force recompute after session save to avoid race conditions with live history updates.
    await this.syncCaloriesBurnedToday(userId);

    this.isWorkoutCompletedToday.set(true);
    return { brokeRecord, earnedXP: newXP, caloriesBurned };
  }

  async syncWeeklyActivity(weekId: string, activity: any[]) {
    const currentUser = this.userSignal();
    if (!currentUser) return;

    const statsRef = doc(this.firestore, `stats/${currentUser.uid}`);
    await setDoc(
      statsRef,
      {
        weeklyActivity: {
          [weekId]: activity
        }
      },
      { merge: true }
    );
  }

    async deleteWorkout(workoutId: string) {
     const docRef = doc(this.firestore, `workouts/${workoutId}`);
     await deleteDoc(docRef);
  }

    async deleteExerciseFromWorkout(workoutId: string, exerciseIndex: number) {
      const workout = this.history().find(entry => entry.id === workoutId);
      if (!workout) return;

      const nextExercises = (workout.exercises || []).filter((_: any, index: number) => index !== exerciseIndex);

      if (nextExercises.length === 0) {
        await this.deleteWorkout(workoutId);
        return;
      }

      const docRef = doc(this.firestore, `workouts/${workoutId}`);
      await updateDoc(docRef, { exercises: nextExercises });
    }

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) return false;
        
    try {
      const workoutsRef = collection(this.firestore, 'workouts');
      const newWorkout = {
        ...formData,
        userId: currentUser.uid,
        createdAt: Date.now()
      };
      
      await addDoc(workoutsRef, newWorkout);
      
      await this.finalizeSession(formData.exercises || [], formData.intensity || 'moderate');
      
      return true;
    } catch (error) {
      console.error("Error saving workout:", error);
      return false;
    }
  }
}