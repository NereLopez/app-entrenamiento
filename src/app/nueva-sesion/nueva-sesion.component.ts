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
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    if (r > 0) {
      this.getSets(index).push(this.fb.group({
        weight: [w],
        reps: [r]
      }));
    }
  }

  async finishWorkout() {
    const hasSets = this.exercises.controls.some((ex, idx) => this.getSets(idx).length > 0);
    
    if (!hasSets) {
      alert('Add at least one exercise before finishing!💪');
      return;
    }

    if (!confirm('Have you finished your training?')) return;

    const fullData = {
      ...this.workoutForm.value,
      createdAt: Date.now()
    };

    try {
      const success = await this.entrenamientoService.saveFromForm(fullData);
      if (success) {
        alert('Workout successfully saved! 🚀');
        this.exercises.clear();
        this.workoutForm.patchValue({
          title: 'New Workout Session',
          date: new Date().toISOString().substring(0, 10)
        });
      }
    } catch (error) {
      console.error("Error en finishWorkout:", error);
    }
  }
}