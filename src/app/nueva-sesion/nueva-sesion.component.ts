import { Component, inject, OnInit } from '@angular/core';
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
export class NuevaSesionComponent implements OnInit {
  private fb = inject(FormBuilder);
  public entrenamientoService = inject(EntrenamientoService); 
  
  public showLibrary = false;
  public workoutForm: FormGroup; 
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
      title: ['New Workout Session', Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      exercises: this.fb.array([]) 
    });
  }

  selectFromLibrary(name: string, muscle: string) {
    this.addExercise(name, muscle); 
    this.showLibrary = false; 
  }

  ngOnInit() {
    console.log("!. He entrado en nueva sesion");
    const exerciseName = this.entrenamientoService.selectedExercise();
    if (exerciseName) {
      this.addExercise(exerciseName, 'General');
      this.entrenamientoService.selectedExercise.set(null);
    }
  }

  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  getSets(index: number): FormArray {
    return this.exercises.at(index).get('sets') as FormArray;
  }

  getGroupColor(group: string): string {
    const colors: { [key: string]: string } = {
      'Chest': '#4158D0', 'Back': '#198754', 'Legs': '#dc3545',
      'Shoulders': '#ffc107', 'Arms': '#0dcaf0', 'Core': '#212529',
      'Default': '#6c757d'
    };
    return colors[group] || colors['Default'];
  }

  getMuscleIcon(group: string): string {
    const icons: {[key: string]: string } = {
    'Chest': '🔥', 'Back': '📐', 'Legs': '🍗', 'Shoulders': '🧥', 'Arms': '💪', 'Core': '🧩'    };
    return icons[group] || '🏋️‍♂️';
  }

  addExercise(name: string, group: string = 'Default') {
    if (!name) return;

    let autoGroup = group;
    const lowerName = name.toLocaleLowerCase();

    if (lowerName.includes('bench') || lowerName.includes('press')) autoGroup = 'Chest';
    else if (lowerName.includes('squat') || lowerName.includes('leg')) autoGroup = 'Legs';
    else if (lowerName.includes('deadlift') || lowerName.includes('row')) autoGroup = 'Back';
    else if (lowerName.includes('bicep') || lowerName.includes('tricep')) autoGroup = 'Arms';
    else if (lowerName.includes('shoulder')) autoGroup = 'Shoulders';
    else if (lowerName.includes('abs') || lowerName.includes('core')) autoGroup = 'Core';
      
    const formattedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();

    const exerciseGroup = this.fb.group({
      name: [formattedName, Validators.required],
      muscleGroup: [autoGroup],
      sets: this.fb.array([])
    });

    this.exercises.push(exerciseGroup);
  }

  addSet(index: number, weight: any, reps: any) {
    const w = weight === '' || weight === null ? 0 : parseFloat(weight);
    const r = parseInt(reps) || 0;
    if (r > 0) {
      this.getSets(index).push(this.fb.group({
        weight: [w],
        reps: [r]
      }));
      this.startRest(60);
    }
  }

  async finishWorkout() {
 const hasExercises = this.exercises.length > 0;
  const hasSets = this.exercises.controls.some((_, idx) => this.getSets(idx).length > 0);
  
  if (!hasExercises || !hasSets) {
    alert('Please add at least one exercise with sets before finishing! 💪');
    return;
  }

  if (!confirm('Are you sure you have finished your training session?')) return;

  // 2. Prepare the data exactly as the Service expects it
  const sessionData = {
    title: this.workoutForm.value.title,
    date: this.workoutForm.value.date,
    // We map the form values to ensure the structure is clean for Firebase
    exercises: this.exercises.value.map((ex: any) => ({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: ex.sets.map((s: any) => ({
        weight: Number(s.weight || 0),
        reps: Number(s.reps || 0)
      }))
    })),
    createdAt: Date.now()
  };

  try {
    const success = await this.entrenamientoService.saveFromForm(sessionData);
    
    if (success) {
      // Logic for the Signal state is handled inside the service
      alert('Workout successfully saved! 🚀');
      
      // Reset the form
      this.exercises.clear();
      this.workoutForm.patchValue({
        title: 'New Workout Session',
        date: new Date().toISOString().substring(0, 10)
      });

      // Redirect to Dashboard
      this.entrenamientoService.currentTab.set('dashboard');
    }
  } catch (error) {
    console.error("Error in finishWorkout:", error);
    alert('There was an error saving your workout. Please try again.');
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
        // Opcional: Sonido o vibración aquí
      }
    }, 1000);
  }

  stopRest() {
    this.isResting = false;
    clearInterval(this.timer);
  }
}