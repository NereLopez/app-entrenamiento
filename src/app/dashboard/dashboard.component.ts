import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterModule } from '@angular/router';
import { EntrenamientoService } from '../services/entrenamiento.service';
import { NutricionService } from '../services/nutricion.service';
import { computed } from '@angular/core';
import { CalendarHeatmapComponent } from './components/calendar-heatmap/calendar-heatmap.component';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardService } from '../services/dashboard.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, CalendarHeatmapComponent, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnDestroy {
  private router = inject(Router);
  public entrenamientoService = inject(EntrenamientoService);
  public nutricionService = inject(NutricionService);
  public dashboardService = inject(DashboardService);

  public quickActions = this.dashboardService.quickActions;
  public waterJustAdded = signal(false);
  private waterFlashTimer: ReturnType<typeof setTimeout> | null = null;

  navegar(ruta: string) {
    if (ruta === '/nutricion') {
      const gender = this.nutricionService.gender();
      if (!gender) {
      this.nutricionService.forceEditMode.set(true);
    } else {
      this.nutricionService.forceEditMode.set(false);
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
      this.nutricionService.addWater();
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
    const gender = this.nutricionService.gender();

    if (!gender) {
      return 'DASHBOARD.WELCOME_NEUTRAL';
    }
    return gender === 'female' ? 'DASHBOARD.WELCOME_FEMALE' : 'DASHBOARD.WELCOME_MALE';
  });

  showModal: boolean = false;
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
    this.entrenamientoService.selectedExercise.set(exerciseName || null);
    this.router.navigate(['/training']);
  }

  getWorkoutsThisWeek(): number {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.entrenamientoService.history().filter((w: any) => {
      const fecha = w.createdAt instanceof Date ? w.createdAt.getTime() : new Date(w.createdAt).getTime();
      return fecha >= oneWeekAgo;
    }).length;
  }

}


