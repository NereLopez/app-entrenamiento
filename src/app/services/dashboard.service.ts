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
      route: '/training'
    });

    // Acción 2: Basada en el estado del perfil
    if (!gender) {
      actions.push({
        label: 'DASHBOARD.COMPLETE_PROFILE',
        subLabel: 'DASHBOARD.SET_GOALS',
        icon: 'bi-person-plus-fill',
        route: '/nutricion'
      });
    } else {
      actions.push({
        label: 'DASHBOARD.MY_DIET',
        subLabel: 'DASHBOARD.TRACK_PROGRESS',
        icon: 'bi-apple',
        route: '/nutricion'
      });
    }

    return actions;
  });
}