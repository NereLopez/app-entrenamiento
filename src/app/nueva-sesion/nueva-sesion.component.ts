import { Component, inject } from '@angular/core';
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
export class NuevaSesionComponent {
  private fb = inject(FormBuilder);
  private trainingService = inject(EntrenamientoService);
  
  workoutForm: FormGroup;

  getGroupColor(group: string): string {
    const colors: { [key: string]: string } = {
      'Chest': '#4158D0',
      'Back': '#198754',      
      'Legs': '#dc3545',     
      'Shoulders': '#ffc107',
      'Arms': '#0dcaf0',      
      'Core': '#212529',      
      'Default': '#6c757d'
    };
    return colors[group] || colors['Default'];
    
  }

  constructor() {
    this.workoutForm = this.fb.group({
      title: ['New Workout Session', Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      exercises: this.fb.array([]) 
    });
  }

  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  getSets(index: number): FormArray {
    return this.exercises.at(index).get('sets') as FormArray;
  }

  addExercise(name: string, group: string) {
    if (!name) return;

    // LÓGICA DE MAYÚSCULA: "bench press" -> "Bench press"
    const formattedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();

    this.exercises.push(this.fb.group({
      name: [formattedName], // Aquí guardamos el nombre con la mayúscula
      muscleGroup: [group],
      sets: this.fb.array([])
    }));
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
    if (this.workoutForm.valid && this.exercises.length > 0) {
      const success = await this.trainingService.saveFromForm(this.workoutForm.value);
      if (success) {
        alert('Workout successfully saved to cloud! 🚀');
      }
    }
  }
}