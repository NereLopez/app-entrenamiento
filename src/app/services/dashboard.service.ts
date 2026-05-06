import { Injectable, computed, signal } from '@angular/core';
import { QuickAction } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  public isWatchlockerRunning = signal(false);
  public watchlockerRemaining = signal(60);
  private watchlockerTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;

  readonly quickActions = computed<QuickAction[]>(() => {
    return [
      {
        label: 'DASHBOARD.MY_DIET',
        subLabel: 'DASHBOARD.MY_DIET',
        icon: 'bi-apple',
        route: '/nutricion'
      },
      {
        label: 'DASHBOARD.REGISTER_WATER',
        subLabel: 'DASHBOARD.REGISTER_WATER',
        icon: 'bi-cup-straw',
        route: '/nutricion'
      },
      {
        label: 'DASHBOARD.WATCHLOCKER',
        subLabel: 'DASHBOARD.WATCHLOCKER',
        icon: 'bi-stopwatch',
        route: '/training'
      }
    ];
  });

  startWatchlockerCountdown() {
    if (this.isWatchlockerRunning()) return;

    this.isWatchlockerRunning.set(true);
    this.watchlockerRemaining.set(60);

    this.watchlockerTimer = setInterval(() => {
      const next = this.watchlockerRemaining() - 1;
      this.watchlockerRemaining.set(next);

      if (next === 3) {
        this.playBeep(880, 0.2);
      }

      if (next <= 0) {
        this.stopWatchlockerCountdown();
        this.playBeep(1200, 0.35);
      }
    }, 1000);
  }

  stopWatchlockerCountdown() {
    if (this.watchlockerTimer) {
      clearInterval(this.watchlockerTimer);
      this.watchlockerTimer = null;
    }
    this.isWatchlockerRunning.set(false);
  }

  private playBeep(frequency: number, duration: number) {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, this.audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch {
      // Ignore audio initialization errors.
    }
  }
}