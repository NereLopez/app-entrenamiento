import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NutricionService } from '../services/nutricion.service';

@Component({
  selector: 'app-nutricion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nutricion.component.html',
  styleUrl: './nutricion.component.css'
})
export class NutricionComponent implements OnInit {
  private fb = inject(FormBuilder);
  public nutricionSvc = inject(NutricionService);
  
  public isEditing = false;
  public isSaving = signal(false);

  public form = this.fb.group({
    age: [null as number | null, [Validators.required, Validators.min(10), Validators.max(100)]],
    weight: [null as number | null, [Validators.required, Validators.min(30), Validators.max(250)]],
    height: [null as number | null, [Validators.required, Validators.min(50), Validators.max(250)]],
    gender: ['female', Validators.required],
    goal: ['maintain', Validators.required]
  });

  ngOnInit() {
    this.syncFormWithService();
  }

  private syncFormWithService() {
    this.form.patchValue({
      age: this.nutricionSvc.age(),
      weight: this.nutricionSvc.weight(),
      height: this.nutricionSvc.height(),
      gender: this.nutricionSvc.gender(),
      goal: this.nutricionSvc.goal()
    }, { emitEvent: false });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.syncFormWithService();
    }
  }

  adjust(field: string, delta: number) {
    const control = this.form.get(field);
    if (control) {
      const newVal = (Number(control.value) || 0) + delta;
      control.setValue(newVal);
      if (!this.isEditing) {
        this.updateServiceFromForm();
      }
    }
  }

  onWeightSliderChange(event: any) {
    const value = Number(event.target.value);
    this.form.get('weight')?.setValue(value);
    if (!this.isEditing) {
      this.updateServiceFromForm();
    }
  }

  private updateServiceFromForm() {
    const val = this.form.value;
    if (val.age) this.nutricionSvc.age.set(val.age);
    if (val.weight) this.nutricionSvc.weight.set(val.weight);
    if (val.height) this.nutricionSvc.height.set(val.height);
    if (val.gender) this.nutricionSvc.gender.set(val.gender as 'male' | 'female');
    if (val.goal) this.nutricionSvc.goal.set(val.goal as 'lose' | 'maintain' | 'gain');
  }

  async saveProfile() {
    if (this.form.valid && !this.isSaving()) {
      this.isSaving.set(true);
      this.updateServiceFromForm();
      try {
        await this.nutricionSvc.saveToFirestore();
        this.isEditing = false;
      } catch (err) {
        console.error('Error al guardar:', err);
        alert('Could not save profile.');
      } finally {
        this.isSaving.set(false);
      }
    }
  }

  addMeal(name: string, calories: number, type: any, p: number = 0, c: number = 0, f: number = 0) {
    if (!name || calories <= 0) {
      alert('Please enter a name and calories');
      return;
    }
    this.nutricionSvc.addFoodEntry(name, calories, type, p, c, f);
  }

  async deleteMeal(id: string) {
    if (confirm('Are you sure you want to delete this entry?')) {
      await this.nutricionSvc.deleteFoodEntry(id);
    }
  }
}