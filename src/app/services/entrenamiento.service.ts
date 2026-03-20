import { Injectable, signal, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  collectionData 
} from '@angular/fire/firestore'; 
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  user 
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class EntrenamientoService {
  private firestore = inject(Firestore);
  private auth = inject (Auth);

  // Your original signals
  userSignal = signal<any>(null);
  history = signal<any[]>([]);

  constructor() {
    // Escucha cambios en el usuario (si entra o sale)
    user(this.auth).subscribe(u => {
      this.userSignal.set(u);
      if (u) {
        console.log("👤 Usuario detectado:", u.uid);
        this.fetchHistory(u.uid);
      } else {
        this.history.set([]);
      }
    });
  }

  // MÉTODOS DE AUTENTICACIÓN
  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

  // MÉTODOS DE BASE DE DATOS
  private fetchHistory(userId: string) {
    console.log("📡 Pidiendo datos a Firebase para el usuario:", userId);

    const ref = collection(this.firestore, 'workouts');
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    collectionData(q, { idField: 'id' }).subscribe(data => {
      console.log("✅ ¡Llegaron datos! Cantidad:", data.length);
      console.log("Contenido:", data);
      this.history.set(data);
    });
  }

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) {
      console.error("No hay usuario logueado para guardar");
      alert("Error: Debes estar logueado");
       return false;
        }

    try {
      const workoutsRef = collection(this.firestore as any, 'workouts');
      const newWorkout = {
        ...formData,
        userId: (currentUser as any).uid, // ASOCIAMOS EL USUARIO
        createdAt: Date.now()
      };
      console.log("Enviando a Firestore...", newWorkout);
      await addDoc(workoutsRef, newWorkout);
      return true;
    } catch (error) {
      console.error("Error crítico al guardar en Firebase", error);
      return false;
    }
  }
}