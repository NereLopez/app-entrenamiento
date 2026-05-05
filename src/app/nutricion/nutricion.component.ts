import { Component, inject, OnInit, signal, effect, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NutricionService } from '../services/nutricion.service';
import { FoodPreset } from '../models/nutricion.model';
import { FOOD_PRESETS } from '../data/food-presets';
import { Router } from '@angular/router';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-nutricion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nutricion.component.html',
  styleUrl: './nutricion.component.css'
})
export class NutricionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private injector = inject(Injector);
  private router = inject(Router);
  public nutricionSvc = inject(NutricionService);

  public isEditing = false;
  public isSaving = signal(false);
  public forceEditMode = signal(false); // Para forzar modo edición si no hay datos

  public isPresetMenuOpen = signal(false);
  public selectedPresetLabel = signal('Choose a meal...');
  public selectedPresetType = signal<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  public foodPresets = FOOD_PRESETS;
  public categories = ['breakfast', 'lunch', 'dinner', 'snack'];
  public activeCategory: string | null = null;

  public form = this.fb.group({
    age: [null as number | null, [Validators.required, Validators.min(10), Validators.max(100)]],
    weight: [null as number | null, [Validators.required, Validators.min(30), Validators.max(250)]],
    height: [null as number | null, [Validators.required, Validators.min(50), Validators.max(250)]],
    gender: ['female', Validators.required],
    goal: ['maintain', Validators.required]
  });

  navegar(ruta: string) {
    if (ruta === '/nutricion') {
      const gender = this.nutricionSvc.gender();
      if (!gender) {
        this.nutricionSvc.forceEditMode.set(true);
      }
    }
    this.router.navigateByUrl(ruta);
  }

  ngOnInit() {
    if (this.nutricionSvc.forceEditMode()) {
       this.isEditing = true;
       this.nutricionSvc.forceEditMode.set(false);
       console.log('Modo edicion activado por el dashboard y resteado');
     }
    
    this.syncFormWithService();

    effect(() => {
      this.nutricionSvc.age();
      this.nutricionSvc.weight();
      this.nutricionSvc.height();
      this.nutricionSvc.gender();
      this.nutricionSvc.goal();

      if (!this.isEditing) {
        this.syncFormWithService();
      }
    }, { injector: this.injector });
  }

  togglePresetMenu() {
    this.isPresetMenuOpen.set(!this.isPresetMenuOpen());
  }

  toggleCategory(category: string) {
    this.activeCategory = this.activeCategory === category ? null : category;
  }

  getFoodsByType(type: string) {
    return this.foodPresets.filter(f => f.type === type);
  }

  mealIconClass(type: 'breakfast' | 'lunch' | 'dinner' | 'snack') {
    if (type === 'breakfast') return 'bi bi-sunrise-fill text-warning';
    if (type === 'lunch') return 'bi bi-sun-fill text-danger';
    if (type === 'dinner') return 'bi bi-moon-stars-fill text-primary';
    return 'bi bi-cup-hot-fill text-secondary';
  }

  categoryIconClass(type: string) {
    if (type === 'breakfast') return 'bi bi-sunrise-fill text-warning';
    if (type === 'lunch') return 'bi bi-sun-fill text-danger';
    if (type === 'dinner') return 'bi bi-moon-stars-fill text-primary';
    return 'bi bi-cup-hot-fill text-secondary';
  }

  selectedMealIconClass() {
    const type = this.selectedPresetType();

    if (!type) {
      return 'bi bi-list-ul text-secondary';
    }

    return this.mealIconClass(type);
  }

  selectPreset(
    food: FoodPreset,
    foodNameInput: HTMLInputElement,
    caloriesInput: HTMLInputElement,
    proteinInput: HTMLInputElement,
    carbsInput: HTMLInputElement,
    fatsInput: HTMLInputElement,
    typeSelect: HTMLSelectElement
  ) {
    foodNameInput.value = food.name;
    caloriesInput.value = String(food.calories);
    proteinInput.value = String(food.protein);
    carbsInput.value = String(food.carbs);
    fatsInput.value = String(food.fats);
    typeSelect.value = food.type;
    this.selectedPresetLabel.set(food.name);
    this.selectedPresetType.set(food.type);
    this.activeCategory = null;
    this.isPresetMenuOpen.set(false);
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

  private normalizeFoodName(name: string): string {
    return name.trim().toLowerCase();
  }

  applyPreset(
    name: string,
    caloriesInput: HTMLInputElement,
    proteinInput: HTMLInputElement,
    carbsInput: HTMLInputElement,
    fatsInput: HTMLInputElement,
    typeSelect?: HTMLSelectElement
  ) {
    const preset = FOOD_PRESETS.find(
      (f: FoodPreset) => this.normalizeFoodName(f.name) === this.normalizeFoodName(name)
    );



    if (!preset) return;

    caloriesInput.value = String(preset.calories);
    proteinInput.value = String(preset.protein);
    carbsInput.value = String(preset.carbs);
    fatsInput.value = String(preset.fats);

    if (typeSelect && preset.type) {
      typeSelect.value = preset.type;
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

  onMealTypeChange(type: string) {
    this.selectedPresetType.set(type as 'breakfast' | 'lunch' | 'dinner' | 'snack');
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