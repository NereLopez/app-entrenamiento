import { Component, signal, ElementRef, viewChild } from '@angular/core'; 
import html2canvas from 'html2canvas';

interface DayActivity {
  label: string;
  workout: {
  completed: boolean;
  intensity: number;
};

nutrition: {
  completed: boolean;
  intensity: number;
};
}

@Component({
  selector: 'app-calendar-heatmap',
  standalone: true,
  imports: [], 
  templateUrl: './calendar-heatmap.component.html',
  styleUrl: './calendar-heatmap.component.css'
})

export class CalendarHeatmapComponent {
  readonly shareArea = viewChild<ElementRef>('shareArea');
  isExporting = signal(false);

  private savedData = localStorage.getItem('workoutNutritionProgress');

  readonly weeklyActivity = signal<DayActivity[]>(
    this.savedData ? JSON.parse(this.savedData) : [

    { label: 'M', workout: { completed: true, intensity: 3 }, nutrition: { completed: true, intensity: 3 } },
    { label: 'T', workout: { completed: true, intensity: 2 }, nutrition: { completed: true, intensity: 2 } },
    { label: 'W', workout: { completed: true, intensity: 1 }, nutrition: { completed: true, intensity: 1 } },
    { label: 'T', workout: { completed: true, intensity: 2 }, nutrition: { completed: false, intensity: 0 } },
    { label: 'F', workout: { completed: false, intensity: 0 }, nutrition: { completed: false, intensity: 0 } },
    { label: 'S', workout: { completed: false, intensity: 0 }, nutrition: { completed: false, intensity: 0 } },
    { label: 'S', workout: { completed: false, intensity: 0 }, nutrition: { completed: false, intensity: 0 } }
  ]);

  toggleDayActivity(index: number, type: 'workout' | 'nutrition') {
    this.weeklyActivity.update(days => {
      const newDays = [...days];
      const activity = newDays[index][type];

      if (!activity.completed) {
        activity.completed = true;
        activity.intensity = Math.floor(Math.random() * 3) + 1;
      } else {
        activity.completed = false;
        activity.intensity = 0;
      }
      localStorage.setItem('workoutNutritionProgress', JSON.stringify(newDays));

      return newDays;
    });
  }

  // 4. Método de exportación
  async exportAsImage(event: Event) {
    event.stopPropagation();
    const element = this.shareArea()?.nativeElement;

    if (element) {
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
}