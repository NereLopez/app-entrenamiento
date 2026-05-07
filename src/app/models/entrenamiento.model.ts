

export interface Serie {
    peso: number;
    repeticiones: number;
    completada: boolean;
}

export interface Ejercicio {
    nombre: string;
    grupoMuscular: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';
    series: Serie[];
    notas?: string;
}

export interface SesionEntrenamiento {
    id?: string;        
    userId: string;     
    fecha: number;    
    titulo: string;
    ejercicios: Ejercicio[];
    duracionMinutos?: number;
    caloriasQuemadas?: number;
}

export interface UserStats {
  userId: string;
  puntosXP: number;
  nivel: number;
  rachaActual: number;
  ultimaSesionFecha: any; 
  recordsPersonales: {
    [exerciseId: string]: number; 
  };
}