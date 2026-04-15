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

     async deleteSession(workoutId: string) {
      if (!confirm('¿Are you sure? This action cannot be undone.')) return;
      await this.entrenamientoService.deleteWorkout(workoutId);
      // Después de eliminar, el efecto que escucha el historial se encargará de redibujar las gráficas automáticamente.
    }
  
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
  getDaysTrainedThisMonth(): number {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    
    const diasUnicos = new Set<string>();

    this.entrenamientoService.history().forEach(workout => {
      const fecha = new Date(workout.createdAt);
      
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        // Formateamos a YYYY-MM-DD para contar días únicos
        const diaString = fecha.toISOString().split('T')[0];
        diasUnicos.add(diaString);
      }
    });

    return diasUnicos.size;
  }

  // --- GRÁFICAS ---

  getMuscleData() {
    const counts: { [key: string]: number } = {};
    this.entrenamientoService.history().forEach(w => {
      w.exercises?.forEach((ex: any) => {
        const group = ex.muscleGroup || 'Default';
        counts[group] = (counts[group] || 0) + 1;
      });
    });

    const labels = Object.keys(counts);
    const dynamycColors = labels.map(group => this.getGroupColor(group));

    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        // Colores vibrantes y diferenciados (Sincronizados con Nueva Sesión)
        backgroundColor: dynamycColors,
        borderWidth: 2,
        hoverOffset: 15,
        borderColor: '#ffffff'
      }]
    };
  }

renderChart(data: any[]) {
  const ctx = this.statsChart.nativeElement.getContext('2d');
  if (this.chart) this.chart.destroy();

  const isVolume = this.currentMetric === 'Volume';
  
  // 1. Agrupamos los datos por FECHA (Día)
  const groupedData = new Map<string, number>();
  
  data.forEach(w => {
    const dateKey = new Date(w.createdAt).toLocaleDateString();
    
    if (isVolume) {
      // Si es volumen, sumamos los kilos de ese día
      groupedData.set(dateKey, (groupedData.get(dateKey) || 0) + this.calculateVolume(w));
    } else {
      // Si es frecuencia, solo contamos 1 por cada sesión (no por ejercicio)
      groupedData.set(dateKey, (groupedData.get(dateKey) || 0) + 1);
    }
  });

  // 2. Convertimos el Map a arrays ordenados
  const labels = Array.from(groupedData.keys());
  const chartData = Array.from(groupedData.values());

  // 3. Renderizamos
  this.chart = new Chart(ctx, {
    type: isVolume ? 'line' : 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: isVolume ? 'Volumen (kg)' : 'Sesiones',
        data: chartData,
        backgroundColor: isVolume ? 'rgba(13, 148, 136, 0.4)' : '#0d9488',
        borderColor: '#0d9488',
        borderWidth: 2,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
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
 getGroupColor(group: string): string {
    const colors: { [key: string]: string } = {
      'Chest': '#fb7185', 
      'Back': '#38bdf8', 
      'Legs': '#fbbf24',
      'Shoulders': '#a78bfa', 
      'Arms': '#2dd4bf', 
      'Core': '#064e3b',
      'Default': '#64748b'
    };
    return colors[group] || colors['Default'];
  }
}