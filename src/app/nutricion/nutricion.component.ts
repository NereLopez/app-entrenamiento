import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NutricionService } from '../services/nutricion.service';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

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
    gender: ['', Validators.required],
    goal: ['', Validators.required]
  });

  ngOnInit() {
    this.syncFormWithService();
  
    this.form.get('weight')?.valueChanges.subscribe(val => {
      if (val) this.nutricionSvc.peso.set(val);
    })
  }


  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.syncFormWithService();
    }
  }

  private syncFormWithService() {
    const currentGoal = this.nutricionSvc.objetivo();
    const goalMapInv: Record<string, string> = {
       'perder': 'lose',
       'mantener': 'maintain',
       'ganar': 'gain' };

    this.form.patchValue({
      age: this.nutricionSvc.edad(),
      weight: this.nutricionSvc.peso(),
      height: this.nutricionSvc.altura(),
      gender: this.nutricionSvc.genero() === 'hombre' ? 'male' : 'female',
      goal: goalMapInv[currentGoal] || 'maintain'
    });
  }

  adjust(field: string, delta: number) {
    const control = this.form.get(field);
    if (control) {
      const newVal = (Number(control.value) || 0) + delta;
      
      const limits: any = {
        age: { min: 10, max: 100 },
        height: { min: 50, max: 250 },
        weight: { min: 30, max: 250 }
      };

      const limit = limits[field];
      if (limit && newVal >= limit.min && newVal <= limit.max) {
        control.setValue(newVal);
       
        this.syncSidebarToService(field, newVal);
      }
    }
  }

  private syncSidebarToService(field: string, value: number) {
    if (field === 'weight') this.nutricionSvc.peso.set(value);
    if (field === 'height') this.nutricionSvc.altura.set(value);
    if (field === 'age') this.nutricionSvc.edad.set(value);
  }

  async saveProfile() {
    if (this.form.valid && !this.isSaving ()) {
      this.isSaving.set(true);

      const val = this.form.value;

      // Actualizamos los Sinals del servicio
      this.nutricionSvc.peso.set(val.weight!);
      this.nutricionSvc.altura.set(val.height!);
      this.nutricionSvc.edad.set(val.age!);
      this.nutricionSvc.genero.set(val.gender === 'male' ? 'hombre' : 'mujer');

      const goalMapping: Record<string, 'perder' | 'mantener' | 'ganar'> = {
        'lose': 'perder',
        'maintain': 'mantener',
        'gain': 'ganar'
      };

      this.nutricionSvc.objetivo.set(goalMapping[val.goal as string] || 'mantener');

      try {
        await this.nutricionSvc.saveToFirestore();
        this.isEditing = false;
        console.log('Profile saved successfully!');
      } catch (err) {
        console.error('Firestore error:', err);
        alert('Error saving to database.');
      } finally {
        this.isSaving.set(false);
      }
    }
  }
}