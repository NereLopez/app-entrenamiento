import { Injectable, signal, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, orderBy, where } from '@angular/fire/firestore';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EntrenamientoService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // Signal para saber quién está logueado
  userSignal = signal<any>(null);
  history = signal<any[]>([]);

  constructor() {
    // Escuchar si el usuario entra o sale
    user(this.auth).subscribe(u => {
      this.userSignal.set(u);
      if (u) this.fetchHistory(u.uid);
    });
  }

  // --- AUTH METHODS ---
  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

  // --- DATABASE METHODS ---
  private fetchHistory(userId: string) {
    const ref = collection(this.firestore, 'workouts');
    // Solo traemos los entrenamientos que pertenecen a este usuario (where)
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
        userId: currentUser.uid, // Guardamos el ID del usuario
        createdAt: Date.now()
      };
      await addDoc(workoutsRef, newWorkout);
      return true;
    } catch (error) {
      return false;
    }
  }
}