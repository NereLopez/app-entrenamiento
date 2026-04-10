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

  readonly userKey = computed(() => this.entrenamientoSvc.userSignal()?.uid || 'anonymous');
  readonly shareArea = viewChild<ElementRef>('shareArea');
  isExporting = signal(false);
  weekOffset = signal(0);
  private readonly dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

    readonly todayIndex = computed(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; 
  });

   readonly weeklyActivity = computed(() => {
    this.activityVersion(); // Dependencia para forzar actualización
  const targetWeek = this.getWeekNumber(new Date()) + this.weekOffset();
  const year = new Date().getFullYear();
  const storageKey = `progress-${this.userKey()}-${year}-week-${targetWeek}`;
  const savedData = localStorage.getItem(storageKey);
  return savedData ? JSON.parse(savedData) : this.generateInitialActivity();
});

readonly totalWorkoutProgress = computed(() => {
  const completeCount = this.weeklyActivity().filter((day: DayActivity) => day.workout.completed).length;
  return (completeCount / 7) * 100; // Returns a percentage from 0 to 100
});

readonly totalNutritionProgress = computed(() => {
  const completeCount = this.weeklyActivity().filter((day: DayActivity) => day.nutrition.completed).length;
  return (completeCount / 7) * 100;
});

readonly completedGoals = computed(() => {
  return this.weeklyActivity().filter(
    (day: DayActivity) => day.workout.completed && day.nutrition.completed
  ).length;
});

readonly motivationMessage = computed(() => {
  const goals = this.completedGoals();

  if (goals === 0) return "Let's get started! 💪";
  if (goals >= 1 && goals <= 3) return 'Great start... keep it up! 🔥';
  if (goals >= 4 && goals <= 6) return "You're on fire! ⚡";
  return 'Unstoppable! Weekly goal crushed 🏆';
});

readonly isAllProgressComplete = computed(() => {
  return this.totalWorkoutProgress() === 100 && this.totalNutritionProgress() === 100;
});

private activityVersion = signal(0); // Para forzar actualización cuando se detecta cambio externo


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

private getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

  private getCurrentWeekId(): string {
    const targetWeek = this.getWeekNumber(new Date()) + this.weekOffset();
    const year = new Date().getFullYear();
    return `${year}-week-${targetWeek}`;
  }

  private async applyAutomaticMark(index: number, type: 'workout' | 'nutrition') {
    const currentDays = JSON.parse(JSON.stringify(this.weeklyActivity())); // Deep copy para evitar mutaciones directas
    currentDays[index][type] = { completed: true, intensity: 3 };
  
  const weekId = this.getCurrentWeekId();
  const year = new Date().getFullYear();
  const targetWeek = this.getWeekNumber(new Date()) + this.weekOffset();
  const storageKey = `progress-${this.userKey()}-${year}-week-${targetWeek}`;  
  
  localStorage.setItem(storageKey, JSON.stringify(currentDays));
  await this.entrenamientoSvc.syncWeeklyActivity(weekId, currentDays);
  this.activityVersion.update(v => v + 1);
}


private generateInitialActivity(): DayActivity[] {
  return this.dayLabels.map(label => ({
    label,
    workout: { completed: false, intensity: 0 },
    nutrition: { completed: false, intensity: 0 }
  }));
}
  async toggleDayActivity(index: number, type: 'workout' | 'nutrition') {
    const currentData =JSON.parse(JSON.stringify(this.weeklyActivity())); // Deep copy para evitar mutaciones directas
    const activity = currentData[index][type];
    activity.completed = !activity.completed;
    activity.intensity = activity.completed ? 3 : 0;

    if (index === this.todayIndex() && type === 'workout') {
      this.entrenamientoSvc.isWorkoutCompletedToday.set(activity.completed);
    }
    const targetWeek = this.getWeekNumber(new Date()) + this.weekOffset();
    const year = new Date().getFullYear();
    const weekId = this.getCurrentWeekId();
    const storageKey = `progress-${this.userKey()}-${year}-week-${targetWeek}`;

    localStorage.setItem(storageKey, JSON.stringify(currentData));
    await this.entrenamientoSvc.syncWeeklyActivity(weekId, currentData);
    this.activityVersion.update(v => v + 1); // Trigger immediate re-render after Firestore save
  }
      changeWeek(delta: number) {
        this.weekOffset.update(val => val + delta);
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