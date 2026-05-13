

export interface Set {
    weight: number;
    reps: number;
    completed: boolean;
}

export interface Exercise {
    name: string;
    muscleGroup: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';
    sets: Set[];
    notes?: string;
}

export interface TrainingSession {
    id?: string;        
    userId: string;     
    date: number;    
    title: string;
    exercises: Exercise[];
    durationMinutes?: number;
    caloriesBurned?: number;
}

export interface UserStats {
  userId: string;
  xpPoints: number;
  level: number;
  currentStreak: number;
  lastSessionDate: any; 
  personalRecords: {
    [exerciseId: string]: number; 
  };
}