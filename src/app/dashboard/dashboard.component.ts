import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterModule } from '@angular/router';
import { EntrenamientoService } from '../services/entrenamiento.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public entrenamientoService = inject(EntrenamientoService);
  private router = inject(Router);

  startWithExercise(exerciseName?: string){
    this.entrenamientoService.selectedExercise.set(exerciseName || null);
    this.router.navigate(['/training']);
  }

  getWorkoutsThisWeek(): number {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
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

  }


