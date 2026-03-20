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
  private trainingService = inject(EntrenamientoService);
  public entrenamientoService = inject(EntrenamientoService);

  workoutForm: FormGroup;

  constructor() {
    this.workoutForm = this.fb.group({
      title: ['New Workout Session', Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      exercises: this.fb.array([]) 
    });
  }

  ngOnInit() {
    const exerciseName = this.entrenamientoService.selectedExercise();
    if (exerciseName) {
      this.addExercise(exerciseName, 'Custom');
      // Importante: lo reseteamos para que no se añada cada vez que entres
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

  addExercise(name: string, group: string) {
    if (!name) {
      alert("Please enter an exercise name");
      return;
    }
    const formattedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();

    this.exercises.push(this.fb.group({
      name: [formattedName],
      muscleGroup: [group],
      sets: this.fb.array([])
    }));
    console.log("Ejercicio añadido:", formattedName);
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
    console.log("Intentando guardar sesión...");
    
    // Si no hay ejercicios, avisamos
    if (this.exercises.length === 0) {
      alert('Add at least one exercise before finishing!');
      return;
    }

    const fullData = {
      ...this.workoutForm.value,
      createdAt: Date.now()
    };

    try {
      const success = await this.trainingService.saveFromForm(fullData);
      if (success) {
        alert('Workout successfully saved! 🚀');
        this.exercises.clear();
        this.workoutForm.patchValue({
          title: 'New Workout Session',
          date: new Date().toISOString().substring(0, 10)
        });
      } else {
        alert('Could not save to Firebase. Check console.');
      }
    } catch (error) {
      console.error("Error en finishWorkout:", error);
    }
  }
}