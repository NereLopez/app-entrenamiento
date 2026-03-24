import { Injectable, signal, computed, inject } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class NutricionService {
  private firestore = inject(Firestore);

  // Datos del usuario (Signals para reactividad)
  public peso = signal<number>(75);
  public altura = signal<number>(180);
  public edad = signal<number>(30);
  public genero = signal<'hombre' | 'mujer'>('hombre');
  public nivelActividad = signal<number>(1.55); // 1.2: Sedentario, 1.55: Moderado, 1.9: Atleta
  public objetivo = signal<'perder' | 'mantener' | 'ganar'>('mantener');

  // Cálculos Automáticos usando 'computed'
  public tmb = computed(() => {
    if (this.genero() === 'hombre') {
      return (10 * this.peso()) + (6.25 * this.altura()) - (5 * this.edad()) + 5;
    } else {
      return (10 * this.peso()) + (6.25 * this.altura()) - (5 * this.edad()) - 161;
    }
  });

  public mantenimiento = computed(() => Math.round(this.tmb() * this.nivelActividad()));

  public caloriasObjetivo = computed(() => {
    const base = this.mantenimiento();
    if (this.objetivo() === 'perder') return base - 500;
    if (this.objetivo() === 'ganar') return base + 400;
    return base;
  });

  // Reparto de Macros (Proteína 30%, Carbos 40%, Grasas 30%)
  public macros = computed(() => {
    const total = this.caloriasObjetivo();
    return {
      proteinas: Math.round((total * 0.30) / 4),
      carbos: Math.round((total * 0.40) / 4),
      grasas: Math.round((total * 0.30) / 9)
    };
  });

  async saveToFirestore () {
    const colRef = collection(this.firestore, 'nutricion_usuarios');
    return addDoc(colRef, {
      peso: this.peso(),
      altura: this.altura(),
      edad: this.edad(),
      tmb: this.tmb(),
      caloriasObjetivo: this.caloriasObjetivo(),
      macrods: this.macros(),
      fecha: new Date()
    });
  }      
    }
  
