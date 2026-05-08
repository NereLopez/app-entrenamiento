import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { QuickAction } from '../models/dashboard.model';
import { Firestore, doc, getDoc, setDoc, increment } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private sessionStartTime = signal<number | null>(null);
  public isSessionRunning = signal(false);
  public currentSessionSeconds = signal(0);
  private sessionInterval: any = null;

  public dailyAccumulatedSeconds = signal(0);

  private readonly pendingKey = 'Kinetic_pending_seconds';

  public isWatchlockerRunning = signal(false);
  public watchlockerRemaining = signal(60);
  private watchlockerTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;

  // --- ACCIONES RÁPIDAS ---
  readonly quickActions = computed<QuickAction[]>(() => [
    { label: 'DASHBOARD.MY_DIET', subLabel: 'DASHBOARD.MY_DIET', icon: 'bi-apple', route: '/nutricion' },
    { label: 'DASHBOARD.REGISTER_WATER', subLabel: 'DASHBOARD.REGISTER_WATER', icon: 'bi-cup-straw', route: '/nutricion' },
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
      } else {
        this.cleanupEverything();
      }
    });
  }

  // --- MÉTODOS PRIVADOS DE FIREBASE ---
  private getDayDocRef() {
    const user = this.authService.userSignal();
    if (!user) return null;
    const today = new Date().toISOString().split('T')[0];
    return doc(this.firestore, `users/${user.uid}/daily_activity/${today}`);
  }

  private async loadDailyDataFromFirebase() {
    const docRef = this.getDayDocRef();
    if (!docRef) return;

    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          this.dailyAccumulatedSeconds.set(docSnap.data()['total_seconds'] || 0);
      }
      const pending = parseInt(localStorage.getItem(this.pendingKey) || '0', 10);
      if (pending > 0) {
        localStorage.removeItem(this.pendingKey);
        this.dailyAccumulatedSeconds.update(v => v + pending);
        await setDoc(docRef, { total_seconds: increment(pending), last_updated: Date.now() }, { merge: true });
      }
    } catch (e) { console.error("Error cargando Firebase", e); }
  }

  private async syncSessionWithFirebase() {
    const docRef = this.getDayDocRef();
    const secondsToSave = this.currentSessionSeconds();
    if (!docRef || secondsToSave <= 0) return;

    try {
      await setDoc(docRef, {
        total_seconds: increment(secondsToSave),
        last_updated: Date.now()
      }, { merge: true });

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
      if (next === 3) this.playBeep(880, 0.2);
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

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let total = 0;

    try {
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const ref = doc(this.firestore, `users/${user.uid}/daily_activity/${dateStr}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          total += snap.data()['total_seconds'] || 0;
        }
      }
      this.weeklyTrainingSeconds.set(total);
    } catch (e) {
      console.error("Error loading weekly stats", e);
    }
  }

  async loadMonthlyStats() {
    const user = this.authService.userSignal();
    if (!user) return;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let total = 0;

    try {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(monthStart.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const ref = doc(this.firestore, `users/${user.uid}/daily_activity/${dateStr}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          total += snap.data()['total_seconds'] || 0;
        }
      }
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
