import { Component, inject, Output, EventEmitter, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, RouterModule } from '@angular/router';
import { EntrenamientoService } from '../services/entrenamiento.service';
import { Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CalendarHeatmapComponent } from './components/calendar-heatmap/calendar-heatmap.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule, CalendarHeatmapComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  public entrenamientoService = inject(EntrenamientoService);
  private router = inject(Router);

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

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  currentMetric: 'Volume' | 'Frequency' = 'Volume';

  public lineChartData: any = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [15, 10, 22, 18, 25, 15, 30], 
        label: 'Volume (kg)',
        fill: true,
        tension: 0.4,
        borderColor: '#4158D0',
        backgroundColor: 'rgba(65, 88, 208, 0.2)',
        pointBackgroundColor: '#4158D0',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4158D0',
      }
    ]
  };

  public lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
    };
    

  setMetric(metric: 'Volume' | 'Frequency') {
    this.currentMetric = metric;
    
    if (metric === 'Volume') {
      this.lineChartData.datasets[0].data = [15, 10, 22, 18, 25, 15, 30]; 
      this.lineChartData.datasets[0].label = 'Volume (kg)';
      this.lineChartData.datasets[0].borderColor = '#4158D0';
      this.lineChartData.datasets[0].backgroundColor = 'rgba(65, 88, 208, 0.2)';
    } else {
      this.lineChartData.datasets[0].data = [1, 0, 1, 1, 0, 1, 0]; 
      this.lineChartData.datasets[0].label = 'Workouts';
      this.lineChartData.datasets[0].borderColor = '#C850C0';
      this.lineChartData.datasets[0].backgroundColor = 'rgba(200, 80, 192, 0.2)';
    }
    
    this.chart?.update(); 
  }

  startWithExercise(exerciseName?: string){
    this.entrenamientoService.selectedExercise.set(exerciseName || null);
    this.router.navigate(['/training']);
  }

  getWorkoutsThisWeek(): number {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return this.entrenamientoService.history().filter((w: any) => w.createdAt > oneWeekAgo).length;
  }

 }


