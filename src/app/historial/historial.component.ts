import { Component, inject, effect, ElementRef, ViewChild } from '@angular/core';
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

  constructor() {
    effect(() => {
      const historyData = this.entrenamientoService.history();
      
      if (historyData.length > 0 && this.statsChart) {
        setTimeout(() => this.renderChart(historyData), 100);
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

  renderChart(data: any[]) {
    const ctx = this.statsChart.nativeElement.getContext('2d');
    if (this.chart) this.chart.destroy();

    const sorted = [...data].sort((a, b) => a.createdAt - b.createdAt);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map(w => new Date(w.createdAt).toLocaleDateString()),
        datasets: [{
          label: 'Volume (kg)',
          data: sorted.map(w => this.calculateVolume(w)),
          borderColor: '#4e73df',
          backgroundColor: 'rgba(78, 115, 223, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
}