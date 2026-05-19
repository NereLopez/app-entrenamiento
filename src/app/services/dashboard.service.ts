import { Injectable, computed, inject, signal, effect, runInInjectionContext, Injector } from '@angular/core';
import { QuickAction } from '../models/dashboard.model';
import { Firestore, doc, getDoc, setDoc, increment, collection, query, where, getDocs } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private injector = inject(Injector);

  private sessionStartTime = signal<number | null>(null);
  public isSessionRunning = signal(false);
  public currentSessionSeconds = signal(0);
  private sessionInterval: any = null;

  public dailyAccumulatedSeconds = signal(0);
  public isNutritionCompleteToday = signal(false);

  private readonly pendingKey = 'Kinetic_pending_seconds';

  public isWatchlockerRunning = signal(false);
  public watchlockerRemaining = signal(60);
  private watchlockerTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;

  // --- QUICK ACTIONS ---
  readonly quickActions = computed<QuickAction[]>(() => [
    { label: 'DASHBOARD.MY_DIET', subLabel: 'DASHBOARD.MY_DIET', icon: 'bi-apple', route: '/nutrition' },
    { label: 'DASHBOARD.REGISTER_WATER', subLabel: 'DASHBOARD.REGISTER_WATER', icon: 'bi-cup-straw', route: '/nutrition' },
    { label: 'DASHBOARD.WATCHLOCKER', subLabel: 'DASHBOARD.WATCHLOCKER', icon: 'bi-stopwatch', route: '/training' },
    { label: 'DASHBOARD.NEW_SESSION', subLabel: 'DASHBOARD.NEW_SESSION', icon: 'bi-plus-square', route: '/training' }
  ]);

  constructor() {

    window.addEventListener('beforeunload', () => {
      const elapsed = this.currentSessionSeconds();
      if (elapsed > 0) {
        const existing = parseInt(localStorage.getItem(this.pendingKey) || '0', 10);
        localStorage.setItem(this.pendingKey, String(existing + elapsed));
      }
    });

    effect(() => {
      const user = this.authService.userSignal();
      if (user) {
        this.loadDailyDataFromFirebase();
        this.loadWeeklyStats();
        this.loadMonthlyStats();
      } else {
        this.cleanupEverything();
      }
    });
  }

  // --- PRIVATE FIREBASE METHODS ---
  private async loadDailyDataFromFirebase() {
    const user = this.authService.userSignal();
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Everything related to Firebase (doc, getDoc) goes inside this block
      const docSnap = await runInInjectionContext(this.injector, () => {
        const docRef = doc(this.firestore, `users/${user.uid}/daily_activity/${today}`);
        return getDoc(docRef);
      });

      if (docSnap.exists()) {
        const data = docSnap.data();
        this.dailyAccumulatedSeconds.set(data['total_seconds'] || 0);
        this.isNutritionCompleteToday.set(data['is_nutrition_complete'] || false);
      }

      const pending = parseInt(localStorage.getItem(this.pendingKey) || '0', 10);
      
      if (pending > 0) {
        localStorage.removeItem(this.pendingKey);
        this.dailyAccumulatedSeconds.update(v => v + pending);

        // 2. For the setDoc, we open another secure block
        await runInInjectionContext(this.injector, () => {
          const docRef = doc(this.firestore, `users/${user.uid}/daily_activity/${today}`);
          return setDoc(docRef, { 
            total_seconds: increment(pending), 
            last_updated: Date.now() 
          }, { merge: true });
        });
      }
    } catch (e) { 
      console.error("Error loading Firebase", e); 
    }
  }

  private async syncSessionWithFirebase() {
    const user = this.authService.userSignal();
    const secondsToSave = this.currentSessionSeconds();
    if (!user || secondsToSave <= 0) return;

    try {
      await runInInjectionContext(this.injector, () => setDoc(doc(this.firestore, `users/${user.uid}/daily_activity/${new Date().toISOString().split('T')[0]}`), {
        total_seconds: increment(secondsToSave),
        last_updated: Date.now()
      }, { merge: true }));

      this.dailyAccumulatedSeconds.update(v => v + secondsToSave);
      this.currentSessionSeconds.set(0);
      // Reset the session start time so it doesn't continue adding the already saved time
      if (this.sessionInterval) this.sessionStartTime.set(Date.now());
    } catch (e) { console.error("Error saving", e); }
  }

  startSession() {
    if (this.sessionInterval) return;
    this.sessionStartTime.set(Date.now());
    this.isSessionRunning.set(true);
    this.sessionInterval = setInterval(() => {
      const start = this.sessionStartTime();
      if (start) {
        this.currentSessionSeconds.set(Math.floor((Date.now() - start) / 1000));
      }
    }, 1000);
  }

  async stopSession() {
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    this.sessionInterval = null;
    this.isSessionRunning.set(false);
    await this.syncSessionWithFirebase();
    this.sessionStartTime.set(null);
  }

  private cleanupEverything() {
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    this.sessionInterval = null;
    this.isSessionRunning.set(false);
    this.sessionStartTime.set(null);
    this.dailyAccumulatedSeconds.set(0);
    this.currentSessionSeconds.set(0);
    this.stopWatchlockerCountdown();
  }

  public formattedTime = computed(() => {
    const total = this.dailyAccumulatedSeconds() + this.currentSessionSeconds();
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  public displayTime = computed(() => {
    const total = this.dailyAccumulatedSeconds() + this.currentSessionSeconds();
    if (total < 3600) {
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return this.formattedTime();
  });
  // --- WATCHLOCKER (DESCANSO) ---
  startWatchlockerCountdown() {
    if (this.isWatchlockerRunning()) return;
    this.isWatchlockerRunning.set(true);
    this.watchlockerRemaining.set(60);
    this.watchlockerTimer = setInterval(() => {
      const next = this.watchlockerRemaining() - 1;
      this.watchlockerRemaining.set(next);
      // Play beep at every second from 5 down to 0
      if (next <= 5 && next >= 0) {
        this.playBeep(880, 0.2);
      }
      if (next <= 0) {
        this.stopWatchlockerCountdown();
        this.playBeep(1200, 0.35);
      }
    }, 1000);
  }

  stopWatchlockerCountdown() {
    if (this.watchlockerTimer) clearInterval(this.watchlockerTimer);
    this.isWatchlockerRunning.set(false);
  }

  private playBeep(freq: number, dur: number) {
    try {
      this.audioContext = this.audioContext || new AudioContext();
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + dur);
    } catch (e) { console.error("Audio error", e); }
  }

  // --- WEEKLY/MONTHLY STATS ---
  public weeklyTrainingSeconds = signal(0);
  public monthlyTrainingSeconds = signal(0);

  async loadWeeklyStats() {
    const user = this.authService.userSignal();
  if (!user) return;

  // 1. Calculate Monday (this is already working)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - diffToMonday);
  const mondayStr = mondayDate.toISOString().split('T')[0]; // Example: "2026-05-11"

  try {
    // 2. MAKE A SINGLE QUERY
    // We look in the 'daily_activity' collection for all entries with ID >= Monday
    const total = await runInInjectionContext(this.injector, async () => {
    const activityRef = collection(this.firestore, `users/${user.uid}/daily_activity`);
    const q = query(activityRef, where("__name__", ">=", mondayStr)); 
    
    const querySnapshot = await getDocs(q);
    
    let total = 0;
    querySnapshot.forEach((doc) => {
      console.log("Day found in Firebase:", doc.id, "Data:", doc.data());
      total += doc.data()['total_seconds'] || 0;
    });
    return total;
  });

    this.weeklyTrainingSeconds.set(total);
    // Goodbye yellow warnings! By making a single request, Angular doesn't get confused.

  } catch (e) {
    console.error("Error in the query:", e);
  }
}
   

  async loadMonthlyStats() {
    const user = this.authService.userSignal();
    if (!user) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // Calculate how many days have passed in the current month
    const monthStartStr = monthStart.toISOString().split('T')[0];

  console.log("--- Start of monthly load ---");
  console.log("Looking for records from the day:", monthStartStr);

  try {
    // 2. A SINGLE QUERY: "Give me everything from this month onwards"
    const total = await runInInjectionContext(this.injector, async () => {  
    const activityRef = collection(this.firestore, `users/${user.uid}/daily_activity`);
    const q = query(activityRef, where("__name__", ">=", monthStartStr)); 
    
    const querySnapshot = await getDocs(q);

    let total = 0;
    querySnapshot.forEach((doc) => {
      // Important: here we will get data for the entire month
      total += doc.data()['total_seconds'] || 0;
    });
    return total;
  });
  this.monthlyTrainingSeconds.set(total);

  } catch (e) {
    console.error("Error loading monthly stats", e);
  }
}

  formatTrainingTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
