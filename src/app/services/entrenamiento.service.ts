import { Injectable, signal, inject, computed } from '@angular/core';
import { 
  Firestore, collection, addDoc, query, where, orderBy, 
  collectionData, doc, getDoc, setDoc, updateDoc, deleteDoc 
} from '@angular/fire/firestore'; 
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';


export interface UserStats {
  experiencePoints: number;
  personalRecords: { [key: string]: number };
  currentStreak: number;
  lastSessionDate: number;
  dailyCaloriesTarget: number;
  weeklyActivity?: { [weekId: string]: any[] };
}

@Injectable({ providedIn: 'root' })
export class EntrenamientoService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  public selectedExercise = signal<string | null>(null);
  public currentTab = signal<string>('dashboard');
  public userSignal = signal<any>(null);
  public history = signal<any[]>([]);
  public userLevel = signal<string>('Intermediate');
  public isWorkoutCompletedToday = signal<boolean>(false);
  public isAuthReady = signal<boolean>(false);
  
  public statsSignal = signal<UserStats>({
    experiencePoints: 0,
    personalRecords: {},
    currentStreak: 0,
    lastSessionDate: 0,
    dailyCaloriesTarget: 0
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
      if (u) {
        this.fetchHistory(u.uid);
        this.fetchUserStats(u.uid); 
      } else {
        // 4. Si el usuario sale (se desloguea), limpiamos el historial
        // para que no se quede la info de la sesión anterior.
        this.history.set([]);
      }
    });
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
          const reps = Number(s.repetitions) || 0;
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
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const stats = snap.data() as UserStats;
      this.statsSignal.set(stats);

      const today = new Date().setHours(0, 0, 0, 0);
      const lastSession = new Date(stats.lastSessionDate ||0).setHours(0, 0, 0, 0);

      if (today === lastSession) {
        this.isWorkoutCompletedToday.set(true);
      } else {
        this.statsSignal.set({
          experiencePoints: 0,
          personalRecords: {},
          currentStreak: 0,
          lastSessionDate: Date.now(),
          dailyCaloriesTarget: 2000
        });
      }
    }
  }

  private fetchHistory(userId: string) {
    const ref = collection(this.firestore, 'workouts');
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    collectionData(q, { idField: 'id' }).subscribe(data => {
      this.history.set(data);
    });
  }

  
  async finalizeSession(workoutExercises: any[]) {
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
     
    }

    currentStats.experiencePoints += newXP;

    await setDoc(statsRef, currentStats, { merge: true });
    this.statsSignal.set(currentStats);

    this.isWorkoutCompletedToday.set(true);
    return { brokeRecord, earnedXP: newXP };
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
      
      await this.finalizeSession(formData.exercises || []);
      
      return true;
    } catch (error) {
      console.error("Error saving workout:", error);
      return false;
    }
  }
}