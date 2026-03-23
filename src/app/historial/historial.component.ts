import { Component, inject, effect, ElementRef, ViewChild, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntrenamientoService } from '../services/entrenamiento.service'; // Check this path!
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
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
        borderWidth: 2,
        hoverOffset: 15,
        borderColor: '#ffffff'
      }]
    };
  }

  renderChart(data: any[]) {
    const ctx = this.statsChart.nativeElement.getContext('2d');
    if (this.chart) this.chart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.5)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    
    const sorted = [...data].sort((a, b) => a.createdAt - b.createdAt);

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
          grid: { color: '#f3f4f6'},
          ticks: { color: '#9ca3af'}
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
