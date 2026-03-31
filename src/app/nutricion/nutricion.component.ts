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
    // Sincronización inteligente: solo actualiza el servicio si el formulario es válido
    // Esto permite que el dashboard reaccione mientras editas
    this.form.valueChanges.subscribe(val => {
      if (this.form.valid) {
        if (val.weight) this.nutricionSvc.weight.set(val.weight);
        if (val.height) this.nutricionSvc.height.set(val.height);
        if (val.age) this.nutricionSvc.age.set(val.age);
        if (val.gender) this.nutricionSvc.gender.set(val.gender as 'male' | 'female');
        if (val.goal) this.nutricionSvc.goal.set(val.goal as 'lose' | 'maintain' | 'gain');
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      // Al entrar en modo edición, cargamos los datos del servicio en el form
      // Usamos emitEvent: false para no disparar el subscribe y evitar bucles
      this.form.patchValue({
        age: this.nutricionSvc.age(),
        weight: this.nutricionSvc.weight(),
        height: this.nutricionSvc.height(),
        gender: this.nutricionSvc.gender(),
        goal: this.nutricionSvc.goal()
      }, { emitEvent: false });
    }
  }

  // Función para los botones + y -
  adjust(field: string, delta: number) {
    const control = this.form.get(field);
    if (control) {
      const newVal = (Number(control.value) || 0) + delta;
      control.setValue(newVal); 
    }
  }

  // Función para el Slider de peso
  onWeightSliderChange(event: any) {
    const value = Number(event.target.value);
    this.form.get('weight')?.setValue(value);
  }

  async saveProfile() {
    if (this.form.valid && !this.isSaving()) {
      this.isSaving.set(true);
      try {
        // Los signals ya están actualizados gracias al valueChanges
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
}