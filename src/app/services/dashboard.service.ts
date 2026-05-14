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

  // --- ACCIONES RÁPIDAS ---
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

  // --- MÉTODOS PRIVADOS DE FIREBASE ---
  private async loadDailyDataFromFirebase() {
    const user = this.authService.userSignal();
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Todo lo que toque Firebase (doc, getDoc) va dentro de este bloque
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

        // 2. Para el setDoc, abrimos otro bloque de seguridad
        await runInInjectionContext(this.injector, () => {
          const docRef = doc(this.firestore, `users/${user.uid}/daily_activity/${today}`);
          return setDoc(docRef, { 
            total_seconds: increment(pending), 
            last_updated: Date.now() 
          }, { merge: true });
        });
      }
    } catch (e) { 
      console.error("Error cargando Firebase", e); 
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
      // Reseteamos el inicio de sesión para que no siga sumando lo ya guardado
      if (this.sessionInterval) this.sessionStartTime.set(Date.now());
    } catch (e) { console.error("Error guardando", e); }
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

  // --- STATS PARA SEMANAL/MENSUAL ---
  public weeklyTrainingSeconds = signal(0);
  public monthlyTrainingSeconds = signal(0);

  async loadWeeklyStats() {
    const user = this.authService.userSignal();
  if (!user) return;

  // 1. Calculamos el lunes (esto ya lo tienes y funciona)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - diffToMonday);
  const mondayStr = mondayDate.toISOString().split('T')[0]; // Ejemplo: "2026-05-11"

  try {
    // 2. HACEMOS UNA SOLA CONSULTA (Query)
    // Buscamos en la colección 'daily_activity' todos los que tengan ID >= lunes
    const total = await runInInjectionContext(this.injector, async () => {
    const activityRef = collection(this.firestore, `users/${user.uid}/daily_activity`);
    const q = query(activityRef, where("__name__", ">=", mondayStr)); 
    
    const querySnapshot = await getDocs(q);
    
    let total = 0;
    querySnapshot.forEach((doc) => {
      console.log("Día encontrado en Firebase:", doc.id, "Datos:", doc.data());
      total += doc.data()['total_seconds'] || 0;
    });
    return total;
  });

    this.weeklyTrainingSeconds.set(total);
    // ¡Adiós errores amarillos! Al hacer una sola petición, Angular no se marea.

  } catch (e) {
    console.error("Error en la consulta:", e);
  }
}
   

  async loadMonthlyStats() {
    const user = this.authService.userSignal();
    if (!user) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    //Calculamos cuántos días han pasado de lo que llevamos de mes
    const monthStartStr = monthStart.toISOString().split('T')[0];

  console.log("--- Inicio de carga mensual ---");
  console.log("Buscando registros desde el día:", monthStartStr);

  try {
    // 2. UNA SOLA QUERY: "Dame todo lo que sea de este mes en adelante"
    const total = await runInInjectionContext(this.injector, async () => {  
    const activityRef = collection(this.firestore, `users/${user.uid}/daily_activity`);
    const q = query(activityRef, where("__name__", ">=", monthStartStr)); 
    
    const querySnapshot = await getDocs(q);

    let total = 0;
    querySnapshot.forEach((doc) => {
      // Importante: aquí nos vendrán datos de todo el mes
      total += doc.data()['total_seconds'] || 0;
    });
    return total;
  });
  this.monthlyTrainingSeconds.set(total);

  } catch (e) {
    console.error("Error cargando estadísticas mensuales", e);
  }
}

  formatTrainingTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
