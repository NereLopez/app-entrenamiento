import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TrainingService } from '../../services/training.service';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';
import { ExerciseType } from '../../models/training.model';

@Component({
  selector: 'app-training-session',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, TranslateModule],
  templateUrl: './training-session.component.html',
  styleUrls: ['./training-session.component.css'],
})
export class TrainingSessionComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  public trainingService = inject(TrainingService); 
  
  public showLibrary = false;
  public showManualGroupMenu = false;
  public selectedManualGroup = 'Chest';
  public manualGroupOptions = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
  public intensityOptions: Array<{ value: 'light' | 'moderate' | 'intense'; label: string }> = [
    { value: 'light', label: 'EXERCISES.INTENSITY.LIGHT' },
    { value: 'moderate', label: 'EXERCISES.INTENSITY.MODERATE' },
    { value: 'intense', label: 'EXERCISES.INTENSITY.INTENSE' }
  ];
  public workoutForm: FormGroup; 
  
  // Stopwatch logic
  public isResting = false;
  public restTime = 60;
  private timer: any;
  private audioContext: AudioContext | null = null;
  

  public exerciseLibrary: Array<{ muscle: string; exercises: Array<{ name: string; type: ExerciseType }> }> = [
    { muscle: 'Chest', exercises: [{name: 'Bench Press', type: 'weight'}, {name: 'Push-ups', type: 'bodyweight'}, {name: 'Chest Flys', type: 'weight'} ] },
    { muscle: 'Back', exercises: [{name: 'Deadlift', type: 'weight'}, {name: 'Pull-ups', type: 'bodyweight'}, {name: 'Rows', type: 'weight'}] },
    { muscle: 'Legs', exercises: [{name: 'Squat', type: 'weight'}, {name: 'Lunge', type: 'bodyweight'}, {name: 'Step-ups', type: 'bodyweight'}] },
    { muscle: 'Shoulders', exercises: [{name: 'Military Press', type: 'weight'}, {name: 'Lateral Raise', type: 'weight'}, {name: 'Upright Row', type: 'weight'}] },
    { muscle: 'Arms', exercises: [{name: 'Bicep Curl', type: 'weight'}, {name: 'Tricep Extension', type: 'weight'}, {name: 'Hammer Curl', type: 'weight'}] },
    { muscle: 'Core', exercises: [{name: 'Plank', type: 'time'}, {name: 'Crunches', type: 'bodyweight'}, {name: 'Russian Twist', type: 'bodyweight'}] }
  ];

  constructor() {
    const defaultTitle = this.translate.instant('EXERCISES.TITLES.TODAY');
    this.workoutForm = this.fb.group({
      title: [defaultTitle, Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      intensity: ['moderate', Validators.required],
      exercises: this.fb.array([]) 
    });
  }

  ngOnInit() {
    const exerciseName = this.trainingService.selectedExercise();
    if (exerciseName) {
      this.addExercise(exerciseName);
      this.trainingService.selectedExercise.set(null);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  getSets(index: number): FormArray {
    return this.exercises.at(index).get('sets') as FormArray;
  }

  get currentDateLocale(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'en';
  }

  get dateFormat(): string {
    return this.currentDateLocale === 'es' ? 'EEEE, d MMMM yyyy' : 'EEEE, MMM d, yyyy';
  }

  getGroupColor(group: string): string {
    const colors: { [key: string]: string } = {
      'Chest': '#fb7185', 'Back': '#38bdf8', 'Legs': '#fbbf24',
      'Shoulders': '#a78bfa', 'Arms': '#2dd4bf', 'Core': '#064e3b',
      'Default': '#64748b'
    };
    return colors[group] || colors['Default'];
  }

  getMuscleIcon(group: string): string {
    const icons: {[key: string]: string } = {
      'Chest': '🏋️‍♂️', 'Back': '📐', 'Legs': '🍗', 'Shoulders': '🧥', 'Arms': '💪', 'Core': '🧩'
    };
    return icons[group] || '🔥';
  }

  chooseManualGroup(group: string) {
    this.selectedManualGroup = group;
    this.showManualGroupMenu = false;
  }

  toggleLibrary() {
    this.showLibrary = !this.showLibrary;
    if (this.showLibrary) {
      this.showManualGroupMenu = false;
    }
  }

  toggleManualGroupMenu() {
    this.showManualGroupMenu = !this.showManualGroupMenu;
    if (this.showManualGroupMenu) {
      this.showLibrary = false;
    }
  }

  get currentIntensity(): 'light' | 'moderate' | 'intense' {
    return this.workoutForm.get('intensity')?.value || 'moderate';
  }

  setIntensity(level: 'light' | 'moderate' | 'intense') {
    this.workoutForm.patchValue({ intensity: level });
  }

  private inferExerciseType(name: string, group: string): ExerciseType {
    const lowerName = name.toLowerCase();

    if (
      lowerName.includes('plank') ||
      lowerName.includes('plancha') ||
      lowerName.includes('wall sit') ||
      lowerName.includes('hold') ||
      lowerName.includes('isometric')
    ) {
      return 'time';
    }

    if (
      lowerName.includes('push-up') ||
      lowerName.includes('push up') ||
      lowerName.includes('flexion') ||
      lowerName.includes('dominada') ||
      lowerName.includes('pull-up') ||
      lowerName.includes('pull up') ||
      lowerName.includes('crunch') ||
      lowerName.includes('abdominal') ||
      lowerName.includes('burpee') ||
      lowerName.includes('mountain climber') ||
      lowerName.includes('russian twist')
    ) {
      return 'bodyweight';
    }

    if (group.toLowerCase() === 'core') {
      return 'bodyweight';
    }

    return 'weight';
  }

  addExercise(name: string, group: string = 'Default', type?: ExerciseType) {
    if (!name) return;
    /*let autoGroup = group;*/

    let finalGroup = group;
    if (group === 'Default' || !group) {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('abs') || lowerName.includes('core') || lowerName.includes('plank') || lowerName.includes('raise')) {
    finalGroup = 'Core';
  } else if (lowerName.includes('squat') || lowerName.includes('leg') || lowerName.includes('lunge')) {
    finalGroup = 'Legs';
  } else if (lowerName.includes('bench') || lowerName.includes('chest') || lowerName.includes('press')) {
    finalGroup = 'Chest';
  } else if (lowerName.includes('deadlift') || lowerName.includes('row') || lowerName.includes('pull')) {
    finalGroup = 'Back';
  } else if (lowerName.includes('curl') || lowerName.includes('tricep') || lowerName.includes('bicep') || lowerName.includes('arm')) {
    finalGroup = 'Arms';
  } else if (lowerName.includes('shoulder') || lowerName.includes('lateral')) {
    finalGroup = 'Shoulders';
  }
}

    const resolvedType = type ?? this.inferExerciseType(name, finalGroup);

    const exerciseGroup = this.fb.group({
      name: [name, Validators.required],
      muscleGroup: [finalGroup],
      exerciseType: [resolvedType],
      sets: this.fb.array([])
    });

    this.exercises.push(exerciseGroup);
    this.showLibrary = false;
  }

  getExerciseDisplayName(name: string): string {
    const key = 'EXERCISES.NAMES.' + name.replace(' ', '_').toUpperCase();
    const translated = this.translate.instant(key);
    return translated === key ? name : translated;
  }

addSet(index: number) {
  // 1. Get the group of exercises to determine its type
  const exerciseGroup = this.exercises.at(index);
  const type = exerciseGroup.get('exerciseType')?.value || 'weight';
  
  let setGroup: FormGroup;

  // 2. Create the set group based on the type
  if (type === 'time') {
    setGroup = this.fb.group({
      durationSeconds: [null, [Validators.required, Validators.min(1)]],
      completed: [false]
    });
  } else if (type === 'bodyweight') {
    setGroup = this.fb.group({
      reps: [null, [Validators.required, Validators.min(1)]],
      completed: [false]
    });
  } else {
    // By default: weight
    setGroup = this.fb.group({
      weight: [null, [Validators.required, Validators.min(0)]],
      reps: [null, [Validators.required, Validators.min(1)]],
      completed: [false]
    });
  }

  // 3. Add it to the FormArray of that exercise
  this.getSets(index).push(setGroup);
  
  // 4. Start the timer
  this.startRest(60);
}

  startRest(seconds: number) {
    this.isResting = true;
    this.restTime = seconds;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.restTime > 0) {
        this.restTime--;

        if (this.restTime > 0 && this.restTime <= 5) {
          this.playCountdownBeep();
        }
    
      } else {
        this.stopRest();
      }
    }, 1000);
  }

  private playCountdownBeep() {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, this.audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.18);

      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.18);
    } catch {
      // Ignore audio initialization errors.
    }
  }
    

  stopRest() {
    this.isResting = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async finishWorkout() {
    if (this.isResting) this.stopRest();

    if (this.exercises.length === 0) return;
    if (!confirm(this.translate.instant('EXERCISES.CONFIRM_FINISH'))) return;

    const sessionData = {
      title: this.workoutForm.value.title,
      date: this.workoutForm.value.date,
      intensity: this.workoutForm.value.intensity || 'moderate',
      exercises: this.workoutForm.value.exercises,
      createdAt: Date.now()
    };

    const success = await this.trainingService.saveFromForm(sessionData);
    if (success) {
      this.exercises.clear();
      this.restTime = 60;
      this.trainingService.currentTab.set('dashboard');
    }
  }
}