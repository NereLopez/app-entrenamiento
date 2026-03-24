import { Component, inject, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntrenamientoService } from '../services/entrenamiento.service'; 
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class HistorialComponent {
  public entrenamientoService = inject(EntrenamientoService);
  
  @ViewChild('statsChart') statsChart!: ElementRef;
  private chart: any;
  @ViewChild('muscleChart') muscleChart!: ElementRef;
  private doughnutChart: any;

  public expandedSessionId: string | null = null;
  public currentMetric: 'Volume' | 'Frequency' = 'Volume';

  constructor() {
    // Escucha cambios en el historial para redibujar gráficas automáticamente
    effect(() => {
      const historyData = this.entrenamientoService.history();
      
      if (historyData.length > 0) {
        setTimeout(() => {
          if (this.statsChart) this.renderChart(historyData);
          if (this.muscleChart) this.renderMuscleChart(); 
        }, 150);
      }
    });
  }

  // --- LÓGICA DE AGRUPACIÓN (LA CLAVE DEL ORDEN) ---
  
  get groupedWorkouts() {
    const rawHistory = this.entrenamientoService.history();
    const grouped = new Map<string, any>();

    rawHistory.forEach(workout => {
      // Agrupamos por fecha (DD/MM/YYYY) para que varias entradas del mismo día sean una sola tarjeta
      const dateKey = new Date(workout.createdAt).toLocaleDateString();
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          id: workout.id, // Usamos el ID original para el toggle
          dateGroup: dateKey,
          displayDate: workout.createdAt,
          allExercises: [...workout.exercises],
        });
      } else {
        // Si el día ya existe en el mapa, añadimos los ejercicios a la lista de ese día
        grouped.get(dateKey).allExercises.push(...workout.exercises);
      }
    });

    // Devolvemos el array ordenado por fecha descendente (más reciente primero)
    return Array.from(grouped.values()).sort((a, b) => b.displayDate - a.displayDate);
  }

  // --- MÉTODOS DE CÁLCULO ---

  toggleSession(sessionId: string) {
    this.expandedSessionId = this.expandedSessionId === sessionId ? null : sessionId;
  }

  setMetric(metric: 'Volume' | 'Frequency') {
    this.currentMetric = metric;
    const historyData = this.entrenamientoService.history();
    if (historyData.length > 0) {
      this.renderChart(historyData);
    }
  }

  calculateVolume(session: any): number {
    let total = 0;
    // Sumamos sobre 'allExercises' que contiene todos los ejercicios del día agrupado
    const exercisesToSum = session.allExercises || session.exercises;
    
    exercisesToSum?.forEach((ex: any) => {
      ex.sets?.forEach((s: any) => {
        total += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      });
    });
    return total;
  }

  getPersonalRecord(): number {
    let max = 0;
    this.entrenamientoService.history().forEach(w => {
      w.exercises?.forEach((ex: any) => {
        ex.sets?.forEach((s: any) => {
          if (Number(s.weight) > max) max = Number(s.weight);
        });
      });
    });
    return max;
  }

  // --- GRÁFICAS ---

  getMuscleData() {
    const counts: { [key: string]: number } = {};
    this.entrenamientoService.history().forEach(w => {
      w.exercises?.forEach((ex: any) => {
        const group = ex.muscleGroup || 'Other';
        counts[group] = (counts[group] || 0) + 1;
      });
    });

    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        // Colores vibrantes y diferenciados (Sincronizados con Nueva Sesión)
        backgroundColor: ['#fbbf24', '#fb7185', '#a78bfa', '#38bdf8', '#064e3b', '#2dd4bf', '#64748b'],
        borderWidth: 2,
        hoverOffset: 15,
        borderColor: '#ffffff'
      }]
    };
  }

  renderChart(data: any[]) {
    const ctx = this.statsChart.nativeElement.getContext('2d');
    if (this.chart) this.chart.destroy();

    const sorted = [...data].sort((a, b) => a.createdAt - b.createdAt);
    const isVolume = this.currentMetric === 'Volume';

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(13, 148, 136, 0.4)');
    gradient.addColorStop(1, 'transparent');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map(w => new Date(w.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
        datasets: [{
          label: isVolume ? 'Volume (kg)' : 'Workouts',
          data: sorted.map(w => isVolume ? this.calculateVolume(w) : 1),
          borderColor: '#0d9488',
          borderWidth: 3,
          fill: true,
          backgroundColor: gradient,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#0d9488'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true }
        }
      }
    });  
  }

  renderMuscleChart() {
    const ctx = this.muscleChart.nativeElement.getContext('2d');
    if (this.doughnutChart) this.doughnutChart.destroy();

    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: this.getMuscleData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 20 }
          }
        }
      }
    });
  }
}