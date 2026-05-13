import { Component, signal, ElementRef, viewChild, computed, inject, OnInit, effect, DestroyRef } from '@angular/core'; 
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import html2canvas from 'html2canvas';
import { NutritionService } from '../../../../services/nutrition.service';
import { TrainingService } from '../../../../services/training.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface DayActivity {
  label: string;
  workout: { completed: boolean; intensity: number };
  nutrition: { completed: boolean, intensity: number; };
}

@Component({
  selector: 'app-calendar-heatmap',
  standalone: true,
  imports: [TranslateModule], 
  templateUrl: './calendar-heatmap.component.html',
  styleUrl: './calendar-heatmap.component.css'
})
export class CalendarHeatmapComponent implements OnInit {
  private nutritionService = inject(NutritionService);
  private translate = inject(TranslateService);
  private trainingService = inject(TrainingService);
  private destroyRef = inject(DestroyRef);

  readonly userKey = computed(() => this.trainingService.userSignal()?.uid || 'anonymous');
  readonly shareArea = viewChild<ElementRef>('shareArea');
  isExporting = signal(false);
  weekOffset = signal(0);
  private activityVersion = signal(0); // Para forzar actualización cuando se detecta cambio externo
  private languageVersion = signal(0);

  constructor() {
    // 1. Escuchamos cambios en tiempo real
    effect(() => {
      if (this.trainingService.isWorkoutCompletedToday()) {
        this.checkAndSyncActivity();
      }
      if (this.nutritionService.isNutritionCompleteToday()) {
        this.checkAndSyncActivity();
      }
    });

    // Re-render labels when language changes
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.languageVersion.update(v => v + 1));
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
    this.languageVersion(); // Dependencia para relocalizar etiquetas al cambiar idioma
  const targetWeek = this.getWeekNumber(new Date()) + this.weekOffset();
  const year = new Date().getFullYear();
  const storageKey = `progress-${this.userKey()}-${year}-week-${targetWeek}`;
  const savedData = localStorage.getItem(storageKey);
  const baseData = savedData ? JSON.parse(savedData) as DayActivity[] : this.generateInitialActivity();
  return this.withLocalizedLabels(baseData);
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
  this.languageVersion();
  const goals = this.completedGoals();
  let key = '';
  if (goals === 0) key = 'LET_S_GET_STARTED 💪';
  else if (goals >= 1 && goals <= 2) key = 'GREAT_START 🔥';
  else if (goals >= 3 && goals <= 5) key = 'YOU_RE_ON_FIRE ⚡';
  else key = 'UNSTOPPABLE 🏆';
  return this.translate.instant('CALENDAR.MOTIVATION.' + key);
});

readonly isAllProgressComplete = computed(() => {
  return this.totalWorkoutProgress() === 100 && this.totalNutritionProgress() === 100;
});

  private checkAndSyncActivity() {
    const todayIdx = this.todayIndex();
    const currentData = this.weeklyActivity();
    
    if (this.trainingService.isWorkoutCompletedToday() && !currentData[todayIdx].workout.completed) {
      this.applyAutomaticMark(todayIdx, 'workout');
    }
        if (this.nutritionService.isNutritionCompleteToday() && !currentData[todayIdx].nutrition.completed) {
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
  await this.trainingService.syncWeeklyActivity(weekId, currentDays);
  this.activityVersion.update(v => v + 1);
}


private generateInitialActivity(): DayActivity[] {
    const days: DayActivity[] = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const locale = this.getLocaleForWeekdays();
    
    for (let i = 0; i < 7; i++) {
      const tempDate = new Date(monday);
      tempDate.setDate(monday.getDate() + i);
      const label = tempDate
        .toLocaleDateString(locale, { weekday: 'short' })
        .replace('.', '');
      
      days.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        workout: { completed: false, intensity: 0 },
        nutrition: { completed: false, intensity: 0 }
      });
    }
    return days;
  }

  private withLocalizedLabels(data: DayActivity[]): DayActivity[] {
    const labels = this.generateInitialActivity().map(day => day.label);
    return data.map((day, index) => ({
      ...day,
      label: labels[index] ?? day.label
    }));
  }

  private getLocaleForWeekdays(): string {
    const lang = this.translate.currentLang || this.translate.getDefaultLang() || 'es';
    if (lang.toLowerCase().startsWith('es')) return 'es-ES';
    if (lang.toLowerCase().startsWith('en')) return 'en-US';
    return lang;
  }
  async toggleDayActivity(index: number, type: 'workout' | 'nutrition') {
    const currentData =JSON.parse(JSON.stringify(this.weeklyActivity())); // Deep copy para evitar mutaciones directas
    const activity = currentData[index][type];
    activity.completed = !activity.completed;
    activity.intensity = activity.completed ? 3 : 0;

    if (index === this.todayIndex() && type === 'workout') {
      this.trainingService.isWorkoutCompletedToday.set(activity.completed);
    }
    const targetWeek = this.getWeekNumber(new Date()) + this.weekOffset();
    const year = new Date().getFullYear();
    const weekId = this.getCurrentWeekId();
    const storageKey = `progress-${this.userKey()}-${year}-week-${targetWeek}`;

    localStorage.setItem(storageKey, JSON.stringify(currentData));
    await this.trainingService.syncWeeklyActivity(weekId, currentData);
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