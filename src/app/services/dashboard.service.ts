import { Injectable, inject, computed } from '@angular/core';
import { NutricionService } from './nutricion.service';
import { QuickAction } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private nutricionSvc = inject(NutricionService);

  // Esta señal computada centraliza la lógica de negocio
  readonly quickActions = computed<QuickAction[]>(() => {
    const gender = this.nutricionSvc.gender();
    const actions: QuickAction[] = [];

    // Acción 1: Siempre disponible
    actions.push({
      label: 'DASHBOARD.NEW_SESSION',
      subLabel: 'DASHBOARD.GO_FOR_IT',
      icon: 'bi-play-fill',
      cssClass: 'bg-primary-subtle text-primary',
      route: '/training'
    });

    // Acción 2: Basada en el estado del perfil
    if (!gender) {
      actions.push({
        label: 'DASHBOARD.COMPLETE_PROFILE',
        subLabel: 'DASHBOARD.SET_GOALS',
        icon: 'bi-person-plus-fill',
        cssClass: 'bg-warning-subtle text-warning',
        route: '/nutrition'
      });
    } else {
      actions.push({
        label: 'DASHBOARD.LOG_WEIGHT',
        subLabel: 'DASHBOARD.TRACK_PROGRESS',
        icon: 'bi-speedometer2',
        cssClass: 'bg-info-subtle text-info',
        route: '/nutrition'
      });
    }

    return actions;
  });
}