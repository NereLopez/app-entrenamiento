import { Component, inject } from '@angular/core';
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
export class DashboardComponent {
  private router = inject(Router);
  public entrenamientoService = inject(EntrenamientoService);
  public nutricionService = inject(NutricionService);
  private dashboardService = inject(DashboardService);

  public quickActions = this.dashboardService.quickActions;

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


