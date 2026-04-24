import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NutricionService } from '../services/nutricion.service';
import { FoodPreset } from '../models/nutricion.model';

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

  public isPresetMenuOpen = signal(false);
  public selectedPresetLabel = signal('Choose a meal...');
  public selectedPresetType = signal<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  public form = this.fb.group({
    age: [null as number | null, [Validators.required, Validators.min(10), Validators.max(100)]],
    weight: [null as number | null, [Validators.required, Validators.min(30), Validators.max(250)]],
    height: [null as number | null, [Validators.required, Validators.min(50), Validators.max(250)]],
    gender: ['female', Validators.required],
    goal: ['maintain', Validators.required]
  });
public foodPresets: FoodPreset[] = [
  { name: 'Oatmeal (1 serving)', calories: 154, protein: 6, carbs: 27, fats: 3, type: 'breakfast' },
  { name: 'Greek Yogurt + Berries', calories: 180, protein: 17, carbs: 18, fats: 4, type: 'breakfast' },
  { name: '2 Eggs + Toast', calories: 260, protein: 14, carbs: 18, fats: 13, type: 'breakfast' },
  { name: 'Protein Pancakes', calories: 320, protein: 24, carbs: 32, fats: 10, type: 'breakfast' },
  { name: 'Avocado Toast', calories: 290, protein: 8, carbs: 28, fats: 16, type: 'breakfast' },

  { name: 'Grilled Chicken Salad', calories: 450, protein: 40, carbs: 20, fats: 15, type: 'lunch' },
  { name: 'Turkey Sandwich', calories: 390, protein: 29, carbs: 36, fats: 12, type: 'lunch' },
  { name: 'Rice + Chicken Bowl', calories: 520, protein: 38, carbs: 58, fats: 14, type: 'lunch' },
  { name: 'Tuna Wrap', calories: 410, protein: 32, carbs: 34, fats: 14, type: 'lunch' },
  { name: 'Pasta + Lean Beef', calories: 610, protein: 35, carbs: 70, fats: 18, type: 'lunch' },

  { name: 'Salmon with Quinoa', calories: 500, protein: 45, carbs: 30, fats: 20, type: 'dinner' },
  { name: 'Steak + Potatoes', calories: 640, protein: 42, carbs: 48, fats: 28, type: 'dinner' },
  { name: 'Chicken Stir Fry', calories: 470, protein: 36, carbs: 40, fats: 16, type: 'dinner' },
  { name: 'Shrimp Rice Bowl', calories: 430, protein: 33, carbs: 45, fats: 11, type: 'dinner' },
  { name: 'Veggie Omelette + Salad', calories: 350, protein: 26, carbs: 14, fats: 20, type: 'dinner' },

  { name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, type: 'snack' },
  { name: 'Apple (1 medium)', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, type: 'snack' },
  { name: 'Almonds (1 oz)', calories: 160, protein: 6, carbs: 6, fats: 14, type: 'snack' },
  { name: 'Boiled Egg (1 large)', calories: 78, protein: 6, carbs: 0.6, fats: 5, type: 'snack' },
  { name: 'Greek Yogurt with Nuts', calories: 200, protein: 15, carbs: 10, fats: 10, type: 'snack' },
  { name: 'Protein Shake', calories: 180, protein: 25, carbs: 8, fats: 5, type: 'snack' },
  { name: 'Cottage Cheese (150g)', calories: 140, protein: 18, carbs: 5, fats: 5, type: 'snack' },
  { name: 'Peanut Butter Toast', calories: 220, protein: 8, carbs: 18, fats: 13, type: 'snack' }
];
  ngOnInit() {
    this.syncFormWithService();
  }

    togglePresetMenu() {
      this.isPresetMenuOpen.set(!this.isPresetMenuOpen());
    }

    mealIconClass(type: 'breakfast' | 'lunch' | 'dinner' | 'snack') {
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
  const preset = this.foodPresets.find(
    f => this.normalizeFoodName(f.name) === this.normalizeFoodName(name)
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