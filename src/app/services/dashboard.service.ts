import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { QuickAction } from '../models/dashboard.model';
import { Firestore, doc, getDoc, setDoc, increment } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {

  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private sessionStartTime = signal<number | null>(null);
  public currentSessionSeconds = signal(0);
  private sessionInterval: any = null;

  public dailyAccumulatedSeconds = signal(0);

  public isWatchlockerRunning = signal(false);
  public watchlockerRemaining = signal(60);
  private watchlockerTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;

  // --- ACCIONES RÁPIDAS ---
  readonly quickActions = computed<QuickAction[]>(() => [
    { label: 'DASHBOARD.MY_DIET', subLabel: 'DASHBOARD.MY_DIET', icon: 'bi-apple', route: '/nutricion' },
    { label: 'DASHBOARD.REGISTER_WATER', subLabel: 'DASHBOARD.REGISTER_WATER', icon: 'bi-cup-straw', route: '/nutricion' },
    { label: 'DASHBOARD.WATCHLOCKER', subLabel: 'DASHBOARD.WATCHLOCKER', icon: 'bi-stopwatch', route: '/training' }
  ]);

  constructor() {
    // Recuperar sesión guardada al inicio
    const savedStartTime = localStorage.getItem('Kinetic_session_start');
    if (savedStartTime) {
      this.sessionStartTime.set(parseInt(savedStartTime, 10));
      this.resumeSession();
    }

    // EFECTO: Reacciona cuando el usuario entra o sale
    effect(() => {
      const user = this.authService.userSignal();
      if (user) {
        this.loadDailyDataFromFirebase();
      } else {
        this.dailyAccumulatedSeconds.set(0);
        this.currentSessionSeconds.set(0);
        if (this.sessionInterval) {
          clearInterval(this.sessionInterval);
          this.sessionInterval = null;
        }
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
    } catch (e) { console.error("Error cargando Firebase", e); }
  }

  private async syncSessionWithFirebase() {
    const docRef = this.getDayDocRef();
    const secondsToSave = this.currentSessionSeconds();
    if (!docRef || secondsToSave <= 0) return;

    try {
      // Guardamos usando increment para que Firebase sume solo
      await setDoc(docRef, {
        total_seconds: increment(secondsToSave),
        last_updated: Date.now()
      }, { merge: true });

      // Actualizamos el acumulado local y reseteamos el de la sesión actual
      this.dailyAccumulatedSeconds.update(v => v + secondsToSave);
      this.currentSessionSeconds.set(0);
    } catch (e) { console.error("Error guardando en Firebase", e); }
  }

  // --- CONTROL DE SESIÓN ---
  startSession() {
    if (this.sessionInterval) return;
    const now = Date.now();
    this.sessionStartTime.set(now);
    localStorage.setItem('Kinetic_session_start', now.toString());
    this.resumeSession();
  }

  private resumeSession() {
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    
    // Update time every 100ms for smooth updates
    this.sessionInterval = setInterval(() => {
      const start = this.sessionStartTime();
      if (start) {
        this.currentSessionSeconds.set(Math.floor((Date.now() - start) / 1000));
      }
    }, 100);
    
    // Set initial value immediately
    const start = this.sessionStartTime();
    if (start) {
      this.currentSessionSeconds.set(Math.floor((Date.now() - start) / 1000));
    }
  }

  async stopSession() {
    if (this.sessionInterval) clearInterval(this.sessionInterval);
    this.sessionInterval = null;

    // Antes de limpiar, guardamos en la nube
    await this.syncSessionWithFirebase();

    this.sessionStartTime.set(null);
    this.currentSessionSeconds.set(0);
    localStorage.removeItem('Kinetic_session_start');
  }

  // --- UI Y FORMATO ---
  public formattedTime = computed(() => {
    // SUMAMOS los dos: lo que ya había + lo de ahora
    const total = this.dailyAccumulatedSeconds() + this.currentSessionSeconds();
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
}