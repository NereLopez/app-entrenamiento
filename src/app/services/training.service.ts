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
export class TrainingService {
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
    // 1. "user(this.auth)" is a Firebase tool that constantly observes if someone logs in or out.
    user(this.auth).subscribe(u => {
      // 2. If there are changes, we update your "signal" (userSignal). This made it so the whole app knows the user has changed.
      this.userSignal.set(u);
      // 3. If the user exists (u), we ask the service to go to the database to fetch their history and stats.
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
    const profileSnap = await runInInjectionContext(this.injector, () => {
      const profileRef = doc(this.firestore, `user_nutrition/${userId}`);
      return getDoc(profileRef);
    });

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
    return runInInjectionContext(this.injector, () => createUserWithEmailAndPassword(this.auth, email, pass));
  }

  async login(email: string, pass: string) {
    return runInInjectionContext(this.injector, () => signInWithEmailAndPassword(this.auth, email, pass));
  }

  logout() {
    return runInInjectionContext(this.injector, () => signOut(this.auth));
  }


  private async fetchUserStats(userId: string) {

    const snap = await runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, `stats/${userId}`);
      return getDoc(docRef);

    });

    if (this.auth.currentUser?.uid !== userId) {
      return;
    }

    if (snap.exists()) {
      const stats = snap.data() as UserStats;
      this.statsSignal.set(stats);

      const today = new Date().setHours(0, 0, 0, 0);
      const lastSession = new Date(stats.lastSessionDate || 0).setHours(0, 0, 0, 0);

      // Keep stored streak/history intact; only toggle whether today's workout is already done.
      this.isWorkoutCompletedToday.set(today === lastSession);
    } else {
      this.isWorkoutCompletedToday.set(false);
    }
  }

  private fetchHistory(userId: string) {
    this.historySubscription?.unsubscribe();
    this.historySubscription = runInInjectionContext(this.injector, () => {
      const ref = collection(this.firestore, 'workouts');
      const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      return collectionData(q, { idField: 'id' }).subscribe(async data => {
        this.history.set(data);

        await runInInjectionContext(this.injector, () => this.syncCaloriesBurnedToday(userId, data as any[])
        );
      });
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
    let totalMinutes = 0;
    let totalReps = 0;
    let totalWeightVolume = 0;

    workoutExercises.forEach(exercise => {
      exercise.sets?.forEach((set: any) => {
        totalSets += 1;

        const reps = Number(set.reps || set.repetitions) || 0;
        const weight = Number(set.weight) || 0;
        const durationSeconds = Number(set.durationSeconds) || 0;

        totalReps += reps;
        totalWeightVolume += weight * reps;

        if (durationSeconds > 0) {
          totalMinutes += durationSeconds / 60;
        }
      });
    });

    if (totalSets === 0) {
      return 0;
    }

    // Use actual duration if available, otherwise estimate from sets
    const estimatedMinutes = totalMinutes > 0
      ? Math.max(5, Math.round(totalMinutes))
      : Math.max(15, Math.round(totalSets * 2.2));

    const met = this.getMetByIntensity(intensity);

    // Base calculation from duration and MET
    let caloriesBurned = Math.round(((met * 3.5 * weightKg) / 200) * estimatedMinutes);

    // Adjust for actual reps and weight volume if available
    if (totalReps > 0 && totalWeightVolume > 0) {
      // Factor in intensity of weight lifted (relative to body weight)
      const volumeIntensityFactor = Math.min(2, (totalWeightVolume / (weightKg * 100)) + 1);
      caloriesBurned = Math.round(caloriesBurned * volumeIntensityFactor);
    }

    return caloriesBurned;
  }

  private async syncCaloriesBurnedToday(userId: string, workoutsData?: any[]) {
    if (this.auth.currentUser?.uid !== userId) {
      return;
    }

    const workouts = workoutsData ?? this.history();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const tomorrowStart = todayStart + 86400000;
    const referenceWeightKg = await runInInjectionContext(this.injector, () => this.getUserWeightKg(userId)) ?? 70;

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

    await runInInjectionContext(this.injector, async () => {

      try {
        const statsRef = doc(this.firestore, `stats/${userId}`);
        await setDoc(statsRef, { caloriesBurnedToday: caloriesToday }, { merge: true });
        console.log("Calories burned today synchronized:");
      } catch (e) {
        console.error("Error updating calories burned today", e);
      }
    });
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
    try {
      await runInInjectionContext(this.injector, () => setDoc(statsRef, statsWithoutDailyBurn, { merge: true }));
    } catch (e) {
      console.error("Error updating stats without daily burn", e);
    }
    this.statsSignal.set(currentStats);

    // Force recompute after session save to avoid race conditions with live history updates.
    await this.syncCaloriesBurnedToday(userId);

    this.isWorkoutCompletedToday.set(true);
    return { brokeRecord, earnedXP: newXP, caloriesBurned };
  }

  async syncWeeklyActivity(weekId: string, activity: any[]) {
    const currentUser = this.userSignal();
    if (!currentUser) return;

    await runInInjectionContext(this.injector, () => {
      const statsRef = doc(this.firestore, `stats/${currentUser.uid}`);
      return setDoc(
        statsRef,
        {
          weeklyActivity: {
            [weekId]: activity
          }
        },
        { merge: true }
      );
    });
  }

  async deleteWorkout(workoutId: string) {
    await runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, `workouts/${workoutId}`);
      return deleteDoc(docRef);
    });
  }
  async deleteExerciseFromWorkout(workoutId: string, exerciseIndex: number) {
    const workout = this.history().find(entry => entry.id === workoutId);
    if (!workout) return;

    const nextExercises = (workout.exercises || []).filter((_: any, index: number) => index !== exerciseIndex);

    if (nextExercises.length === 0) {
      await this.deleteWorkout(workoutId);
      return;
    }

    await runInInjectionContext(this.injector, () => {
      const docRef = doc(this.firestore, `workouts/${workoutId}`);
      return updateDoc(docRef, { exercises: nextExercises });
    });
  }

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) return false;

    try {
      await runInInjectionContext(this.injector, async () => {
        const workoutsRef = collection(this.firestore, 'workouts');
        const newWorkout = {
          ...formData,
          userId: currentUser.uid,
          createdAt: Date.now()
        };

        await addDoc(workoutsRef, newWorkout);

        await this.finalizeSession(formData.exercises || [], formData.intensity || 'moderate');
      });
      return true;
    } catch (error) {
      console.error("Error saving workout:", error);
      return false;
    }
  }
}