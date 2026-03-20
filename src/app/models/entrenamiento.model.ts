// src/app/models/entrenamiento.model.ts

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
    id?: string;        // Opcional porque Firebase lo genera al guardar
    userId: string;     // ¡IMPORTANTE! Para saber de quién es el entreno
    fecha: number;      // Usar 'number' (Timestamp) es mejor para ordenar fechas en Firebase
    titulo: string;
    ejercicios: Ejercicio[];
}