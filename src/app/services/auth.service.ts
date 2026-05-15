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
    
    // Simplificamos la query al máximo (quitamos el orderBy de momento)
    const q = query(ref, where('userId', '==', userId));
    
    collectionData(q, { idField: 'id' }).subscribe({
      next: (data) => {
        console.log('✅ Historial cargado con éxito:', data.length, 'ejercicios');
        this.history.set(data);
      },
      error: (err) => {
        console.error('❌ Error persistente en history:', err.message);
        // SI AQUÍ SIGUE DANDO ERROR, revisa que la colección se llame 'workouts'
      }
    });
  });
}

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) return false;

    try {
      // Metemos la referencia y el guardado dentro del contexto
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
}