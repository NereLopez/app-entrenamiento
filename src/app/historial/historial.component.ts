import { Component, inject, effect, ElementRef, ViewChild, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EntrenamientoService } from '../services/entrenamiento.service'; 
import { Chart, registerables } from 'chart.js';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

Chart.register(...registerables);

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class HistorialComponent {
  public entrenamientoService = inject(EntrenamientoService);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(Injector);
  private translate = inject(TranslateService);
  
  @ViewChild('statsChart') statsChart!: ElementRef;
  private chart: any;
  @ViewChild('muscleChart') muscleChart!: ElementRef;
  private doughnutChart: any;

  public expandedSessionId: string | null = null;
  public currentMetric: 'Volume' | 'Frequency' = 'Volume';
  public displayedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  public selectedDateKey: string | null = null;
  public nutritionDayMap = new Map<string, { calories: number; complete: boolean }>();
  public readonly calendarWeekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  constructor() {
    user(this.auth).subscribe(currentUser => {
      if (!currentUser) {
        this.nutritionDayMap = new Map();
        return;
      }

      const entriesRef = collection(this.firestore, 'food_entries');
      const entriesQuery = query(entriesRef, where('userId', '==', currentUser.uid));

      runInInjectionContext(this.injector, () => collectionData(entriesQuery, { idField: 'id' }))
        .subscribe(entries => {
        const groupedNutrition = new Map<string, { calories: number; complete: boolean }>();
        const calorieTarget = this.entrenamientoService.statsSignal().dailyCaloriesTarget || 2000;

        entries.forEach((entry: any) => {
          const dateKey = this.toDateKey(new Date(entry.date));
          const current = groupedNutrition.get(dateKey) ?? { calories: 0, complete: false };
          current.calories += Number(entry.calories) || 0;
          current.complete = current.calories >= calorieTarget * 0.8;
          groupedNutrition.set(dateKey, current);
        });

          this.nutritionDayMap = groupedNutrition;
        });
    });

    // Escucha cambios en el historial para redibujar gráficas automáticamente
    effect(() => {
      const historyData = this.entrenamientoService.history();

      if (historyData.length > 0 && !this.selectedDateKey) {
        this.selectedDateKey = this.groupedWorkouts[0]?.dateKey ?? null;
      }
      
      if (historyData.length > 0) {
        setTimeout(() => {
          if (this.statsChart) this.renderChart(historyData);
          if (this.muscleChart) this.renderMuscleChart(); 
        }, 150);
      }
    });
  }

     async deleteSession(workoutId: string) {
      if (!confirm(this.translate.instant('HISTORY.CONFIRMATIONS.DELETE_SESSION'))) return;
      await this.entrenamientoService.deleteWorkout(workoutId);
      // Después de eliminar, el efecto que escucha el historial se encargará de redibujar las gráficas automáticamente.
    }

    async deleteExercise(workoutId: string, exerciseIndex: number, exerciseName: string) {
      if (!confirm(this.translate.instant('HISTORY.CONFIRMATIONS.DELETE_EXERCISE', { exerciseName }))) return;
      await this.entrenamientoService.deleteExerciseFromWorkout(workoutId, exerciseIndex);
    }
  
  get groupedWorkouts() {
    const rawHistory = this.entrenamientoService.history();
    const grouped = new Map<string, any>();

    rawHistory.forEach(workout => {
      const workoutDate = new Date(workout.createdAt);
      const dateKey = this.toDateKey(workoutDate);
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          id: workout.id, // Usamos el ID original para el toggle
          dateKey,
          dateGroup: dateKey,
          displayDate: workoutDate,
          allExercises: (workout.exercises || []).map((exercise: any, exerciseIndex: number) => ({
            ...exercise,
            workoutId: workout.id,
            exerciseIndex
          })),
        });
      } else {
        // Si el día ya existe en el mapa, añadimos los ejercicios a la lista de ese día
        grouped.get(dateKey).allExercises.push(
          ...(workout.exercises || []).map((exercise: any, exerciseIndex: number) => ({
            ...exercise,
            workoutId: workout.id,
            exerciseIndex
          }))
        );
      }
    });

    // Devolvemos el array ordenado por fecha descendente (más reciente primero)
    return Array.from(grouped.values()).sort((a, b) => b.displayDate - a.displayDate);
  }

  get calendarTitle(): string {
    return this.displayedMonth.toLocaleDateString(this.currentDateLocale, {
      month: 'long',
      year: 'numeric'
    });
  }

  get currentStreak(): number {
    const history = this.entrenamientoService.history();
    if (!history.length) return 0;

    const trainedDays = new Set<string>();
    history.forEach(workout => {
      trainedDays.add(this.toDateKey(new Date(workout.createdAt)));
    });

    const today = new Date();
    const todayKey = this.toDateKey(today);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const yesterdayKey = this.toDateKey(yesterday);

    let startDate: Date | null = null;

    if (trainedDays.has(todayKey)) {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    } else if (trainedDays.has(yesterdayKey)) {
      startDate = yesterday;
    } else {
      return 0;
    }

    let streak = 0;
    const cursor = new Date(startDate);

    while (trainedDays.has(this.toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  get calendarDays() {
    const year = this.displayedMonth.getFullYear();
    const month = this.displayedMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDays = lastDayOfMonth.getDate();
    const groupedByDate = new Map(this.groupedWorkouts.map(session => [session.dateKey, session]));
    const days: Array<any> = [];

    for (let i = 0; i < firstWeekday; i++) {
      days.push({ inMonth: false });
    }

    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(year, month, day);
      const dateKey = this.toDateKey(currentDate);
      const session = groupedByDate.get(dateKey);

      days.push({
        inMonth: true,
        dayNumber: day,
        dateKey,
        session,
        nutrition: this.nutritionDayMap.get(dateKey),
        isToday: this.toDateKey(new Date()) === dateKey,
        isSelected: this.selectedCalendarDateKey === dateKey,
        volume: session ? this.calculateVolume(session) : 0,
        exerciseCount: session?.allExercises?.length ?? 0,
        muscleGroups: session ? this.getSessionMuscleGroups(session) : []
      });
    }

    while (days.length % 7 !== 0) {
      days.push({ inMonth: false });
    }

    return days;
  }

  get selectedCalendarDateKey(): string | null {
    const selectedExists = this.selectedDateKey && this.groupedWorkouts.some(session => session.dateKey === this.selectedDateKey);
    return selectedExists ? this.selectedDateKey : this.groupedWorkouts[0]?.dateKey ?? null;
  }

  get selectedCalendarSession() {
    const selectedKey = this.selectedCalendarDateKey;
    return this.groupedWorkouts.find(session => session.dateKey === selectedKey) ?? null;
  }

  get selectedCalendarNutrition() {
    const selectedKey = this.selectedCalendarDateKey;
    return selectedKey ? this.nutritionDayMap.get(selectedKey) ?? null : null;
  }

  get currentDateLocale(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  // --- MÉTODOS DE CÁLCULO ---

  private translateMuscleGroup(group: string): string {
    const key = `EXERCISES.MUSCLE.${group.toUpperCase()}`;
    return this.translate.instant(key);
  }

  private formatDateForChart(dateKey: string): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    return date.toLocaleDateString(currentLang, {
      day: '2-digit',
      month: 'short'
    });
  }

  getExerciseDisplayName(name: string): string {
    const key = 'EXERCISES.NAMES.' + name.split(' ').join('_').toUpperCase();
    const translated = this.translate.instant(key);
    return translated === key ? name : translated;
  }

  toggleSession(sessionId: string) {
    this.expandedSessionId = this.expandedSessionId === sessionId ? null : sessionId;
  }

  changeMonth(delta: number) {
    this.displayedMonth = new Date(this.displayedMonth.getFullYear(), this.displayedMonth.getMonth() + delta, 1);
  }

  selectCalendarDay(dateKey: string | undefined) {
    if (!dateKey) return;
    this.selectedDateKey = dateKey;
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
    const mesActual = this.displayedMonth.getMonth();
    const anioActual = this.displayedMonth.getFullYear();
    
    const diasUnicos = new Set<string>();

    this.entrenamientoService.history().forEach(workout => {
      const fecha = new Date(workout.createdAt);
      
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        // Formateamos a YYYY-MM-DD para contar días únicos
        const diaString = this.toDateKey(fecha);
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
        const group = ex.muscleGroup || ex.grupoMuscular || 'Default';
        counts[group] = (counts[group] || 0) + 1;
      });
    });

    const labels = Object.keys(counts);
    const translatedLabels = labels.map(group => this.translateMuscleGroup(group));
    const dynamycColors = labels.map(group => this.getGroupColor(group));

    return {
      labels: translatedLabels,
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
    const dateKey = this.toDateKey(new Date(w.createdAt));
    
    if (isVolume) {
      // Si es volumen, sumamos los kilos de ese día
      groupedData.set(dateKey, (groupedData.get(dateKey) || 0) + this.calculateVolume(w));
    } else {
      // Si es frecuencia, sumamos el total de ejercicios realizados ese día
      const exerciseCount = Array.isArray(w.exercises) ? w.exercises.length : 0;
      groupedData.set(dateKey, (groupedData.get(dateKey) || 0) + exerciseCount);
    }
  });

  // 2. Convertimos el Map a arrays ordenados por fecha ascendente
  const sortedEntries = Array.from(groupedData.entries()).sort(([dateA], [dateB]) => dateA.localeCompare(dateB));
  const labels = sortedEntries.map(([dateKey]) => this.formatDateForChart(dateKey));
  const chartData = sortedEntries.map(([, value]) => value);

  // 3. Renderizamos
  const chartLabel = isVolume 
    ? this.translate.instant('HISTORY.METRICS.VOLUME') + ' (kg)'
    : this.translate.instant('HISTORY.METRICS.FREQUENCY');
  
  this.chart = new Chart(ctx, {
    type: isVolume ? 'line' : 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: chartLabel,
        data: chartData,
        backgroundColor: isVolume
          ? (context: any) => {
              const chart = context.chart;
              const chartArea = chart.chartArea;

              if (!chartArea) {
                return 'rgba(13, 148, 136, 0.30)';
              }

              const gradient = chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(13, 148, 136, 0.65)');
              gradient.addColorStop(0.45, 'rgba(13, 148, 136, 0.28)');
              gradient.addColorStop(1, 'rgba(13, 148, 136, 0)');
              return gradient;
            }
          : '#0d9488',
        borderColor: '#0d9488',
        borderWidth: 2,
        cubicInterpolationMode: isVolume ? 'monotone' : undefined,
        tension: isVolume ? 0.4 : 0,
        fill: isVolume,
        pointRadius: isVolume ? 4 : 0,
        pointHoverRadius: isVolume ? 6 : 0,
        pointBackgroundColor: '#0d9488',
        pointBorderColor: '#ffffff',
        pointBorderWidth: isVolume ? 2 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: isVolume
            ? { stepSize: 5, autoSkip: false, precision: 0 }
            : { stepSize: 1 },
          grid: {
            color: 'rgba(15, 23, 42, 0.08)'
          }
        }
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

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

  getSessionMuscleGroups(session: any): string[] {
    const groups = new Set<string>();

    (session.allExercises || session.exercises || []).forEach((exercise: any) => {
      groups.add(exercise.muscleGroup || exercise.grupoMuscular || 'Default');
    });

    return Array.from(groups).slice(0, 4);
  }
}