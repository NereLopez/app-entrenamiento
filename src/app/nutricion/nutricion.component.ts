import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
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

  public form = this.fb.group({
    age: [null as number | null, [Validators.required, Validators.min(10), Validators.max(100)]],
    weight: [null as number | null, [Validators.required, Validators.min(30)]],
    height: [null as number | null, [Validators.required, Validators.min(50)]],
    gender: ['', Validators.required],
    goal: ['', Validators.required]
  });

  ngOnInit() {
    // Si ya existen datos en el servicio (por ejemplo, cargados de Firebase),
    // rellenamos el formulario para que no aparezca vacío al editar.
    this.syncFormWithService();
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.syncFormWithService();
    }
  }

  private syncFormWithService() {
    const currentGoal = this.nutricionSvc.objetivo();
    const goalMapInv: any = { 'perder': 'lose', 'mantener': 'maintain', 'ganar': 'gain' };

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
        // Esto permite que las calorías y macros del Dashboard cambien 
        // mientras el usuario pulsa los botones, ¡efecto instantáneo!
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
    if (this.form.valid) {
      const val = this.form.value;

      // Actualizamos los Signals del servicio
      this.nutricionSvc.peso.set(val.weight!);
      this.nutricionSvc.altura.set(val.height!);
      this.nutricionSvc.edad.set(val.age!);
      this.nutricionSvc.genero.set(val.gender === 'male' ? 'hombre' : 'mujer');

      const goalMapping: Record<string, 'perder' | 'mantener' | 'ganar'> = {
        'lose': 'perder',
        'maintain': 'mantener',
        'gain': 'ganar'
      };

      const translatedGoal = goalMapping[val.goal as string] || 'mantener';
      this.nutricionSvc.objetivo.set(translatedGoal);

      try {
        await this.nutricionSvc.saveToFirestore();
        this.isEditing = false;
        // Cambiamos el alert por un log o algo más discreto si prefieres
        console.log('Profile saved successfully!');
      } catch (err) {
        console.error('Firestore error:', err);
        alert('Error saving to database.');
      }
    }
  }
}