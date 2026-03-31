import { Component, signal, ElementRef, viewChild, computed, inject, OnInit, effect } from '@angular/core'; 
import html2canvas from 'html2canvas';
import { NutricionService } from '../../../services/nutricion.service';
import { EntrenamientoService } from '../../../services/entrenamiento.service';

interface DayActivity {
  label: string;
  workout: { completed: boolean; intensity: number };
  nutrition: { completed: boolean, intensity: number; };
}

@Component({
  selector: 'app-calendar-heatmap',
  standalone: true,
  imports: [], 
  templateUrl: './calendar-heatmap.component.html',
  styleUrl: './calendar-heatmap.component.css'
})
export class CalendarHeatmapComponent implements OnInit {
  private nutricionSvc = inject(NutricionService);
  private entrenamientoSvc = inject(EntrenamientoService);

  readonly shareArea = viewChild<ElementRef>('shareArea');
  isExporting = signal(false);

  constructor() {
    // 1. Escuchamos cambios en tiempo real
    effect(() => {
      if (this.entrenamientoSvc.isWorkoutCompletedToday()) {
        this.checkAndSyncActivity();
      }
      if (this.nutricionSvc.isNutritionCompleteToday()) {
        this.checkAndSyncActivity();
      }
    });
  }

  ngOnInit() {
    this.checkAndSyncActivity();
  }

  private checkAndSyncActivity() {
    const todayIdx = this.todayIndex();
    const currentData = this.weeklyActivity();
    
  
    if (this.entrenamientoSvc.isWorkoutCompletedToday() && !currentData[todayIdx].workout.completed) {
      this.applyAutomaticMark(todayIdx, 'workout');
    }
        if (this.nutricionSvc.isNutritionCompleteToday() && !currentData[todayIdx].nutrition.completed) {
          this.applyAutomaticMark(todayIdx, 'nutrition');
  }
}

  private applyAutomaticMark(index: number, type: 'workout' | 'nutrition') {
    this.weeklyActivity.update(days => {
      const newDays = [...days]; 
      newDays[index] = {
        ...newDays[index],
        [type]: { completed: true, intensity: 3 } // 'completed' con D al final
      };
      
      localStorage.setItem('workoutNutritionProgress', JSON.stringify(newDays));
      return newDays;
    });
  }

  // --- Lógica de datos y calendario ---
  private savedData = localStorage.getItem('workoutNutritionProgress');

  readonly todayIndex = computed(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; // Ajuste para que Lunes sea 0
  });

  private readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly weeklyActivity = signal<DayActivity[]>(
    this.savedData ? JSON.parse(this.savedData) : this.generateInitialActivity()
  );

  private generateInitialActivity(): DayActivity[] {
    return this.dayLabels.map(label => ({
      label,
      workout: { completed: false, intensity: 0 },
      nutrition: { completed: false, intensity: 0}
    }));
  }

  toggleDayActivity(index: number, type: 'workout' | 'nutrition') {
    this.weeklyActivity.update(days => {
      const newDays = JSON.parse(JSON.stringify(days));
      const activity = newDays[index][type];

      activity.completed = !activity.completed;
      activity.intensity = activity.completed ? 3 : 0;

      // Si marcamos manualmente el workout de hoy, avisamos al servicio
      if (index === this.todayIndex() && type === 'workout') {
        this.entrenamientoSvc.isWorkoutCompletedToday.set(activity.completed);
      }

      localStorage.setItem('workoutNutritionProgress', JSON.stringify(newDays));
      return newDays;
    });
  }

  async exportAsImage(event: Event) {
    event.stopPropagation();
    const element = this.shareArea()?.nativeElement;
    if (!element) return;

    this.isExporting.set(true);
    setTimeout(async () => {
      try {
        const canvas = await (html2canvas as any)(element, {
          backgroundColor: '#ffffff',
          scale: 3,
          logging: false,
          useCORS: true
        });
        const link = document.createElement('a');
        link.download = `Kinetic-Progress-${new Date().toLocaleDateString()}.png`;         
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Error capturando imagen", err);
      } finally {
        this.isExporting.set(false);
      }
    }, 150);
  }
}