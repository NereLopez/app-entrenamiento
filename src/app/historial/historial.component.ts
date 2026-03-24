import { Component, inject, effect, ElementRef, ViewChild, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntrenamientoService } from '../services/entrenamiento.service'; // Check this path!
import { Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

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

  toggleSession(sessionId: string) {
    if (this.expandedSessionId === sessionId) {
      this.expandedSessionId = null;
    } else {
      this.expandedSessionId = sessionId;
    }
    }
  

  setMetric(metric: 'Volume' | 'Frequency') {
    this.currentMetric = metric;
    const historyData = this.entrenamientoService.history();
    if (historyData.length >0) {
      this.renderChart(historyData);
    }

  }
  calculateVolume(workout: any): number {
    let total = 0;
    workout.exercises?.forEach((ex: any) => {
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

  getMuscleData() {
    const counts: { [key: string]: number } ={};
    this.entrenamientoService.history(). forEach(w => {
      w.exercises?.forEach((ex: any) => {
        const group = ex.muscleGroup || 'Other';
        counts [group] = (counts[group] || 0) + 1;
      });
    });
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ['#4158D0', '#198754', '#dc3545', '#ffc107', '#0dcaf0', '#6c757d'],
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

    const chartData = sorted.map(w => isVolume ? this.calculateVolume(w) : 1);
    const label = isVolume ? 'Total Volume (kg)' : 'Workouts';
    const mainColor = isVolume ? '#6366f1' : '#C850C0'; // Morado para Vol, Rosa para Freq

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, isVolume ? 'rgba(59, 113, 202, 0.4)' : 'rgba(45, 147, 16, 0.4)');
    gradient.addColorStop(1, 'transparent');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map(w => new Date(w.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})),
        datasets: [{
          data: sorted.map(w => this.calculateVolume(w)),
          borderColor: '#6366f1',
          borderWidth: 3,
          fill: true,
          backgroundColor: gradient,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
           legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          padding: 12
        }  
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af'}},
        y : {
          beginAtZero: true,
          ticks: { stepSize: isVolume ? undefined : 1}
        } }
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
        cutout: '75%', // Makes it a thinner, more elegant ring
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { size: 11 }
            }
          }
        }
      }
    });
  }
}
