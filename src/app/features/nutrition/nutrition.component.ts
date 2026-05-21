import { Component, inject, OnInit, signal, effect, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NutritionService } from '../../services/nutrition.service';
import { FoodPreset } from '../../models/nutrition.model';
import { FOOD_PRESETS } from '../../data/food-presets';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-nutrition',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './nutrition.component.html',
  styleUrl: './nutrition.component.css'
})
export class NutritionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private injector = inject(Injector);
  private router = inject(Router);
  private translate = inject(TranslateService);
  public nutritionService = inject(NutritionService);

  public isEditing = false;
  public isSaving = signal(false);
  public forceEditMode = signal(false); //  force edit mode if no data

  public isPresetMenuOpen = signal(false);
  public isMealTypeDropdownOpen = signal(false);
  public selectedPresetLabel = signal('Choose a meal...');
  public selectedPresetType = signal<'breakfast' | 'lunch' | 'snack' | 'dinner' | null>('breakfast');
  public foodPresets = FOOD_PRESETS;
  public categories = ['breakfast', 'lunch', 'snack', 'dinner'];
  public activeCategory: string | null = null;

  public form = this.fb.group({
    age: [null as number | null, [Validators.required, Validators.min(10), Validators.max(100)]],
    weight: [null as number | null, [Validators.required, Validators.min(30), Validators.max(250)]],
    height: [null as number | null, [Validators.required, Validators.min(50), Validators.max(250)]],
    gender: ['female', Validators.required],
    goal: ['maintain', Validators.required]
  });

  public mealForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    calories: [0, [Validators.required, Validators.min(1)]],
    protein: [0, [Validators.min(0)]],
    carbs: [0, [Validators.min(0)]],
    fats: [0, [Validators.min(0)]],
    type: ['breakfast', Validators.required]
  });

  navegar(ruta: string) {
    if (ruta === '/nutrition') {
      const gender = this.nutritionService.gender();
      if (!gender) {
        this.nutritionService.forceEditMode.set(true);
      }
    }
    this.router.navigateByUrl(ruta);
  }

  ngOnInit() {
    if (this.nutritionService.forceEditMode()) {
      this.isEditing = true;
      this.nutritionService.forceEditMode.set(false);
      console.log('Modo edicion activado por el dashboard y resteado');
    }

    this.syncFormWithService();

    effect(() => {
      this.nutritionService.age();
      this.nutritionService.weight();
      this.nutritionService.height();
      this.nutritionService.gender();
      this.nutritionService.goal();

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

  mealIconClass(type: 'breakfast' | 'lunch' | 'snack' | 'dinner') {
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

  selectPreset(food: FoodPreset) {
    const displayName = this.getFoodDisplayName(food.name);
    this.mealForm.patchValue({
      name: displayName,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      type: food.type
    });
    this.selectedPresetLabel.set(displayName);
    this.selectedPresetType.set(food.type as 'breakfast' | 'lunch' | 'snack' | 'dinner');
    this.activeCategory = null;
    this.isPresetMenuOpen.set(false);
  }

  onMealTypeChange(type: string) {
    if (type) {
      const mealType = type as 'breakfast' | 'lunch' | 'dinner' | 'snack';
      this.selectedPresetType.set(mealType);
      this.mealForm.get('type')?.setValue(mealType);
    }
  }

  addMeal() {
    if (this.mealForm.invalid) {
      alert('Please fill out all required fields (Name and Calories)');
      return;
    }
    const val = this.mealForm.value;
    const rawName = (val.name || '').trim();

    const matchedPreset = FOOD_PRESETS.find((preset) => {
      const presetKey = preset.name;
      const presetBaseName = preset.name.replace('NUTRITION.PRESET.', '');
      const presetTranslated = this.getFoodDisplayName(preset.name);
      const normalizedRaw = this.normalizeFoodName(rawName);

      return (
        this.normalizeFoodName(presetKey) === normalizedRaw ||
        this.normalizeFoodName(presetBaseName) === normalizedRaw ||
        this.normalizeFoodName(presetTranslated) === normalizedRaw
      );
    });

    const nameToSave = matchedPreset
      ? matchedPreset.name
      : rawName.charAt(0).toUpperCase() + rawName.slice(1);

 this.nutritionService.addFoodEntry(
  nameToSave,
  Number(val.calories),
  val.type || 'breakfast',
  val.protein ?? undefined,
  val.carbs ?? undefined,
  val.fats ?? undefined
);

this.mealForm.reset({
  name: '',
  type: val.type || 'breakfast',
  calories: null,
  protein: null,
  carbs: null,
  fats: null
});
  }

  private syncFormWithService() {
    this.form.patchValue({
      age: this.nutritionService.age(),
      weight: this.nutritionService.weight(),
      height: this.nutritionService.height(),
      gender: this.nutritionService.gender(),
      goal: this.nutritionService.goal()
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

  getFoodDisplayName(name: string): string {
    const key = name.startsWith('NUTRITION.PRESET.') ? name : `NUTRITION.PRESET.${name}`;
    const translated = this.translate.instant(key);
    return translated === key ? name : translated;
  }

  private updateServiceFromForm() {
    const val = this.form.value;
    if (val.age) this.nutritionService.age.set(val.age);
    if (val.weight) this.nutritionService.weight.set(val.weight);
    if (val.height) this.nutritionService.height.set(val.height);
    if (val.gender) this.nutritionService.gender.set(val.gender as 'male' | 'female');
    if (val.goal) this.nutritionService.goal.set(val.goal as 'lose' | 'maintain' | 'gain');
  }

  async saveProfile() {
    if (this.form.valid && !this.isSaving()) {
      this.isSaving.set(true);
      this.updateServiceFromForm();
      try {
        await this.nutritionService.saveToFirestore();
        this.isEditing = false;
      } catch (err) {
        console.error('Error al guardar:', err);
        alert('Could not save profile.');
      } finally {
        this.isSaving.set(false);
      }
    }
  }


  async deleteMeal(id: string) {
    if (confirm(this.translate.instant('NUTRITION.FORM.DELETE_CONFIRM'))) {
      await this.nutritionService.deleteFoodEntry(id);
    }
  }
}