import { Injectable, signal, inject, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, orderBy, where } from '@angular/fire/firestore';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private injector = inject(Injector);

  userSignal = signal<any>(null);
  history = signal<any[]>([]);

  constructor() {
    runInInjectionContext(this.injector, () => {  
    user(this.auth).subscribe(u => {
      if (u) {
      this.userSignal.set(u);
      if (u) this.fetchHistory(u.uid);
      } else {
        this.userSignal.set(null);
        this.history.set([]);
      }
    });
  });
}
  
  async signUp(email: string, pass: string) {
    return runInInjectionContext(this.injector, () => createUserWithEmailAndPassword(this.auth, email, pass));
  }

  async login(email: string, pass: string) {
    return runInInjectionContext(this.injector, () => signInWithEmailAndPassword(this.auth, email, pass));
  }

  async logout() {
    await runInInjectionContext(this.injector, () => signOut(this.auth));
    this.userSignal.set(null);
    this.history.set([]);
  }

private fetchHistory(userId: string) {
  if (!userId) return;

  runInInjectionContext(this.injector, () => {
    const ref = collection(this.firestore, 'workouts');
        const q = query(ref, where('userId', '==', userId));
    
    collectionData(q, { idField: 'id' }).subscribe({
      next: (data) => {
        console.log('✅ History loaded successfully:', data.length, 'workouts');
        this.history.set(data);
      },
      error: (err) => {
        console.error('❌ Persistent error in history:', err.message);    
        }
    });
  });
}

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) return false;

    try {
      // Put the reference and the save operation inside the context
      await runInInjectionContext(this.injector, () => {
        const workoutsRef = collection(this.firestore, 'workouts');
        const newWorkout = {
          ...formData,
          userId: currentUser.uid,
          createdAt: Date.now()
        };
        return addDoc(workoutsRef, newWorkout);
      });
      
      return true;
    } catch (error) {
      console.error('Error saving workout:', error);
      return false;
    }
    
  }
  // --- LOGIC OF XP DECAY ---

  getXPDecay(): number {
    const list = this.history();
    if (!list || list.length === 0) return 0;

    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    const lastWorkout = sorted[0].createdAt; 
    
    const hoy = Date.now();
    const unDiaMs = 24 * 60 * 60 * 1000;
    const diasInactivo = Math.floor((hoy - lastWorkout) / unDiaMs);

 
    if (diasInactivo > 4) {
      return (diasInactivo - 4) * 25;
    }
    return 0;
  }

  getDaysInactive(): number {
    const list = this.history();
    if (list.length === 0) return 0;
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    const dias = Math.floor((Date.now() - sorted[0].createdAt) / (24 * 60 * 60 * 1000));
    return dias;
  }
}