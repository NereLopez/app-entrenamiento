import { Injectable, signal, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, orderBy, where } from '@angular/fire/firestore';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EntrenamientoService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  userSignal = signal<any>(null);
  history = signal<any[]>([]);

  constructor() {
    user(this.auth).subscribe(u => {
      if (u) {
      this.userSignal.set(u);
      if (u) this.fetchHistory(u.uid);
      } else {
        this.userSignal.set(null);
        this.history.set([]);
      }
    });
  }
  
  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  async logout() {
    await signOut(this.auth);
    this.userSignal.set(null);
    this.history.set([]);
  }

  private fetchHistory(userId: string) {
    const ref = collection(this.firestore, 'workouts');
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