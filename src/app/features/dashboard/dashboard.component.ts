import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { NutritionService } from '../../services/nutrition.service';
import { computed } from '@angular/core';
import { CalendarHeatmapComponent } from './components/calendar-heatmap/calendar-heatmap.component';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, CalendarHeatmapComponent, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnDestroy {
  private router = inject(Router);
  public trainingService = inject(TrainingService);
  public nutritionService = inject(NutritionService);
  public dashboardService = inject(DashboardService);
  public authService = inject(AuthService);
  public quickActions = this.dashboardService.quickActions;
  public waterJustAdded = signal(false);
  public periodMode = signal<'week' | 'month'>('week');
  private waterFlashTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.dashboardService.loadWeeklyStats();
    this.dashboardService.loadMonthlyStats();
  }

  navigateToWorkout() {
    this.router.navigate(['/training']);
  }
  navegar(ruta: string) {
    if (ruta === '/nutrition') {
      const gender = this.nutritionService.gender();
      if (!gender) {
      this.nutritionService.forceEditMode.set(true);
    } else {
      this.nutritionService.forceEditMode.set(false);
    }
  }
    this.router.navigate([ruta]);
  }

  ngOnDestroy() {
    this.dashboardService.stopWatchlockerCountdown();
    if (this.waterFlashTimer) clearTimeout(this.waterFlashTimer);
  }

  onQuickActionClick(item: { label: string; route: string }) {
    if (item.label === 'DASHBOARD.WATCHLOCKER') {
      this.dashboardService.startWatchlockerCountdown();
      return;
    }
    if (item.label === 'DASHBOARD.REGISTER_WATER') {
      this.nutritionService.addWater();
      this.waterJustAdded.set(true);
      if (this.waterFlashTimer) clearTimeout(this.waterFlashTimer);
      this.waterFlashTimer = setTimeout(() => this.waterJustAdded.set(false), 1800);
      return;
    }
    this.navegar(item.route);
  }

  getQuickActionLabel(item: { label: string }): string {
    if (item.label === 'DASHBOARD.WATCHLOCKER' && this.dashboardService.isWatchlockerRunning()) {
      return `${this.dashboardService.watchlockerRemaining()}s`;
    }
    return item.label;
  }

  readonly welcomeKey = computed(() => {
    const gender = this.nutritionService.gender();

    if (!gender) {
      return 'DASHBOARD.WELCOME_NEUTRAL';
    }
    return gender === 'female' ? 'DASHBOARD.WELCOME_FEMALE' : 'DASHBOARD.WELCOME_MALE';
  });

  showInstallCard: boolean = true;
  closeInstallCard() {
    this.showInstallCard = false;
    localStorage.setItem('installCardDismissed', 'true');
  }
  showInstall() {
    localStorage.removeItem('installCardDismissed');
    this.router.navigate(['/dashboard']).then(() => {
      window.location.reload();
    });
  }

  startWithExercise(exerciseName?: string) {
    this.trainingService.selectedExercise.set(exerciseName || null);
    this.router.navigate(['/training']);
  }

  getWorkoutsThisWeek(): number {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.trainingService.history().filter((w: any) => {
      const fecha = w.createdAt instanceof Date ? w.createdAt.getTime() : new Date(w.createdAt).getTime();
      return fecha >= oneWeekAgo;
    }).length;
  }

  getTrainingTime(): number {
    return this.periodMode() === 'week' ? this.dashboardService.weeklyTrainingSeconds() : this.dashboardService.monthlyTrainingSeconds();
  }

}


