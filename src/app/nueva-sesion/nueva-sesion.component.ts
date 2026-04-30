import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EntrenamientoService } from '../services/entrenamiento.service';

@Component({
  selector: 'app-nueva-sesion',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './nueva-sesion.component.html',
  styleUrl: './nueva-sesion.component.css',
})
export class NuevaSesionComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  public entrenamientoService = inject(EntrenamientoService); 
  
  public showLibrary = false;
  public showManualGroupMenu = false;
  public selectedManualGroup = 'Chest';
  public manualGroupOptions = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
  public workoutForm: FormGroup; 
  
  // Lógica del Cronómetro
  public isResting = false;
  public restTime = 60;
  private timer: any;

  public exerciseLibrary = [
    { muscle: 'Chest', exercises: ['Bench Press', 'Incline Press', 'Chest Flys'] },
    { muscle: 'Back', exercises: ['Deadlift', 'Pull-ups', 'Rows'] },
    { muscle: 'Legs', exercises: ['Squat', 'Lunge', 'Leg Press'] },
    { muscle: 'Shoulders', exercises: ['Military Press', 'Lateral Raise'] },
    { muscle: 'Arms', exercises: ['Bicep Curl', 'Tricep Extension'] },
    { muscle: 'Core', exercises: ['Plank', 'Crunches', 'Leg Raises', 'Russian Twist'] }
  ];

  constructor() {
    this.workoutForm = this.fb.group({
      title: ["Today's Workout", Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      exercises: this.fb.array([]) 
    });
  }

  ngOnInit() {
    const exerciseName = this.entrenamientoService.selectedExercise();
    if (exerciseName) {
      this.addExercise(exerciseName);
      this.entrenamientoService.selectedExercise.set(null);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  getSets(index: number): FormArray {
    return this.exercises.at(index).get('sets') as FormArray;
  }

  getGroupColor(group: string): string {
    const colors: { [key: string]: string } = {
      'Chest': '#fb7185', 'Back': '#38bdf8', 'Legs': '#fbbf24',
      'Shoulders': '#a78bfa', 'Arms': '#2dd4bf', 'Core': '#064e3b',
      'Default': '#64748b'
    };
    return colors[group] || colors['Default'];
  }

  getMuscleIcon(group: string): string {
    const icons: {[key: string]: string } = {
      'Chest': '🏋️‍♂️', 'Back': '📐', 'Legs': '🍗', 'Shoulders': '🧥', 'Arms': '💪', 'Core': '🧩'
    };
    return icons[group] || '🔥';
  }

  chooseManualGroup(group: string) {
    this.selectedManualGroup = group;
    this.showManualGroupMenu = false;
  }

  addExercise(name: string, group: string = 'Default') {
    if (!name) return;
    /*let autoGroup = group;*/

    let finalGroup = group;
    if (group === 'Default' || !group) {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('abs') || lowerName.includes('core') || lowerName.includes('plank') || lowerName.includes('raise')) {
    finalGroup = 'Core';
  } else if (lowerName.includes('squat') || lowerName.includes('leg') || lowerName.includes('lunge')) {
    finalGroup = 'Legs';
  } else if (lowerName.includes('bench') || lowerName.includes('chest') || lowerName.includes('press')) {
    finalGroup = 'Chest';
  } else if (lowerName.includes('deadlift') || lowerName.includes('row') || lowerName.includes('pull')) {
    finalGroup = 'Back';
  } else if (lowerName.includes('curl') || lowerName.includes('tricep') || lowerName.includes('bicep') || lowerName.includes('arm')) {
    finalGroup = 'Arms';
  } else if (lowerName.includes('shoulder') || lowerName.includes('lateral')) {
    finalGroup = 'Shoulders';
  }
}

    const exerciseGroup = this.fb.group({
      name: [name, Validators.required],
      muscleGroup: [finalGroup],
      sets: this.fb.array([])
    });

    this.exercises.push(exerciseGroup);
    this.showLibrary = false;
  }

  addSet(index: number, weight: any, reps: any) {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    
    if (r > 0) {
      this.getSets(index).push(this.fb.group({
        weight: [w],
        reps: [r]
      }));
      // Lanzamos el cronómetro automáticamente al añadir la serie
      this.startRest(60);
    }
  }

  startRest(seconds: number) {
    this.isResting = true;
    this.restTime = seconds;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.restTime > 0) {
        this.restTime--;
      } else {
        this.stopRest();
      }
    }, 1000);
  }

  stopRest() {
    this.isResting = false;
    if (this.timer) clearInterval(this.timer);
  }

  async finishWorkout() {
    if (this.exercises.length === 0) return;
    if (!confirm('¿Terminar sesión?')) return;

    const sessionData = {
      title: this.workoutForm.value.title,
      date: this.workoutForm.value.date,
      exercises: this.workoutForm.value.exercises,
      createdAt: Date.now()
    };

    const success = await this.entrenamientoService.saveFromForm(sessionData);
    if (success) {
      this.exercises.clear();
      this.entrenamientoService.currentTab.set('dashboard');
    }
  }
}