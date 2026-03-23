import { Injectable, signal, inject, computed } from '@angular/core';
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

  public selectedExercise = signal<string | null>(null);
  public currentTab = signal<string>('dashboard');
  public userSignal = signal<any>(null);
  public history = signal<any[]>([]);

  public userName = computed(() => {
    const u = this.userSignal();
    let name = u?.displayName || u?.email?.split('@') [0] || 'User';
    name = name.replace(/\./g, ' ').trim();
    if (name.length > 0) {
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }

    return 'User';
  });
public userLevel = signal<string>('Intermediate');

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

    const ref = collection(this.firestore, 'workouts');
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    collectionData(q, { idField: 'id' }).subscribe(data => {
      this.history.set(data);
    });
  }

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) return false;
        
    try {
      const workoutsRef = collection(this.firestore as any, 'workouts');
      const newWorkout = {
        ...formData,
        userId: (currentUser as any).uid, // ASOCIAMOS EL USUARIO
        createdAt: Date.now()
      };
      
      await addDoc(workoutsRef, newWorkout);
      return true;
    } catch (error) {
      console.error("Erroral guardar", error);
      return false;
    }
  }
}