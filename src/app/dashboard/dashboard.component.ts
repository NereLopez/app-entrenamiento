import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { EntrenamientoService } from '../services/entrenamiento.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public entrenamientoService = inject(EntrenamientoService);

  @Output() changeTab = new EventEmitter<string>();
  goToTab(tabName: string, exerciseName?: string) {
    console.log("IUntentando guardar ejercicio:0, exerciseName");
      this.entrenamientoService.selectedExercise.set(exerciseName || null);
      this.entrenamientoService.currentTab.set(tabName);
    }

  getWorkoutsThisWeek(): number {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    return this.entrenamientoService.history().filter((w:any) => w.createdAt > oneWeekAgo).length;
  }

  getTotalVolume(): number {
    let total = 0;
    this.entrenamientoService.history().forEach((w:any) => {
      w.exercises?.forEach((ex: any) => {
        ex.sets?.forEach((s: any) => {
          const weight= Number(s.weight) || 0;
          const reps = Number(s.reps) || 0;
          total += weight * reps;
        });
      });
    });
    return total;
  }

  startWithExercise(name: string) {
    // Aquí podrías redirigir a la página de entreno 
    // y pre-cargar el ejercicio (lógica avanzada para luego)
    console.log("Starting session with:", name);
  }
}

