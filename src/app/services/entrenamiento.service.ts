import { Injectable, signal, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, orderBy, where } from '@angular/fire/firestore';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user, User } from '@angular/fire/auth';

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
    const ref = collection(this.firestore, 'workouts');
    // Filtramos para que solo traiga lo del usuario actual
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    collectionData(q, { idField: 'id' }).subscribe(data => this.history.set(data));
  }

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) return false;

    try {
      const workoutsRef = collection(this.firestore, 'workouts');
      const newWorkout = {
        ...formData,
        userId: currentUser.uid, // ASOCIAMOS EL USUARIO
        createdAt: Date.now()
      };
      await addDoc(workoutsRef, newWorkout);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}