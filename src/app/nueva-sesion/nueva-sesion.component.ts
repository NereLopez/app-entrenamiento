import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-nueva-sesion',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './nueva-sesion.component.html',
  styleUrl: './nueva-sesion.component.css',
})
export class NuevaSesionComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  
  workoutForm: FormGroup;

  constructor() {
    this.workoutForm = this.fb.group({
      title: ['New Workout Session', Validators.required],
      date: [new Date().toISOString().substring(0, 10)],
      exercises: this.fb.array([]) 
    });
    this.addExercise('Bench Press', 'Chest');
  }

  // Getters
  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  getSets(exerciseIndex: number): FormArray {
    return this.exercises.at(exerciseIndex).get('sets') as FormArray;
  }

  // Methods
  addExercise(name: string, group: string) {
    const exerciseForm = this.fb.group({
      name: [name],
      muscleGroup: [group],
      sets: this.fb.array([this.createSet()])
    });
    this.exercises.push(exerciseForm);
  }

  createSet() {
    return this.fb.group({
      weight: [0, [Validators.required, Validators.min(0)]],
      reps: [0, [Validators.required, Validators.min(1)]],
      completed: [false]
    });
  }

  addSet(exerciseIndex: number) {
    this.getSets(exerciseIndex).push(this.createSet());
  }

  // Functión unificada para guardar
  async saveWorkout() {
    if (this.workoutForm.valid) {
      try {
        const workoutData = {
          ...this.workoutForm.value,
          date: new Date(this.workoutForm.value.date).getTime(),
          // userId: this.authService.getCurrentUserId() // For later
        };

        const workoutsRef = collection(this.firestore, 'workouts');
        const docRef = await addDoc(workoutsRef, workoutData);
        
        console.log('Saved!', docRef.id);
        alert('Workout saved successfully! 🚀');
        
        // Reset form
        this.workoutForm.reset({
          title: 'New Workout Session',
          date: new Date().toISOString().substring(0, 10),
          exercises: []
        });
        
        // Importante: Después del reset, hay que vaciar el FormArray manualmente
        while (this.exercises.length !== 0) {
          this.exercises.removeAt(0);
        }
        this.addExercise('Becnh Press', 'Chest');

      } catch (error) {
        console.error('Error saving workout:', error);
        alert('Error saving to Firebase');
      }
    }
  }
}