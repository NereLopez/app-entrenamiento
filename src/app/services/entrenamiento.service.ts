import { Injectable, signal, inject, computed } from '@angular/core';
import { 
  Firestore, collection, addDoc, query, where, orderBy, 
  collectionData, doc, getDoc, setDoc, updateDoc 
} from '@angular/fire/firestore'; 
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user } from '@angular/fire/auth';


export interface UserStats {
  experiencePoints: number;
  personalRecords: { [key: string]: number };
  currentStreak: number;
  lastSessionDate: number;
}

@Injectable({ providedIn: 'root' })
export class EntrenamientoService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  public selectedExercise = signal<string | null>(null);
  public currentTab = signal<string>('dashboard');
  public userSignal = signal<any>(null);
  public history = signal<any[]>([]);
  public userLevel = signal<string>('Intermediate');
  
  
  public statsSignal = signal<UserStats>({
    experiencePoints: 0,
    personalRecords: {},
    currentStreak: 0,
    lastSessionDate: 0
  });

  constructor() {
    user(this.auth).subscribe(u => {
      this.userSignal.set(u);
      if (u) {
        this.fetchHistory(u.uid);
        this.fetchUserStats(u.uid); 
      } else {
        this.history.set([]);
      }
    });
  }

  public userName = computed(() => {
    const u = this.userSignal();
    let name = u?.displayName || u?.email?.split('@')[0] || 'User';
    name = name.replace(/\./g, ' ').trim();
    return name.length > 0 ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : 'User';
  });

  
  async signUp(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  logout() {
    return signOut(this.auth);
  }

  
  private async fetchUserStats(userId: string) {
    const docRef = doc(this.firestore, `stats/${userId}`);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      this.statsSignal.set(snap.data() as UserStats);
    }
  }

  private fetchHistory(userId: string) {
    const ref = collection(this.firestore, 'workouts');
    const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    collectionData(q, { idField: 'id' }).subscribe(data => {
      this.history.set(data);
    });
  }

  
  async finalizeSession(workoutExercises: any[]) {
    const currentUser = this.userSignal();
    if (!currentUser) return;

    const userId = currentUser.uid;
    const statsRef = doc(this.firestore, `stats/${userId}`);
    
    
    let currentStats = { ...this.statsSignal() };

    let newXP = 50; 
    let brokeRecord = false;

    
    workoutExercises.forEach(exercise => {
      if (exercise.sets && exercise.sets.length > 0) {
        
        const weights = exercise.sets.map((s: any) => Number(s.weight || 0));
        const sessionMaxWeight = Math.max(...weights);
        const exerciseKey = exercise.name.toLowerCase();

        if (sessionMaxWeight > (currentStats.personalRecords[exerciseKey] || 0)) {
          currentStats.personalRecords[exerciseKey] = sessionMaxWeight;
          newXP += 25; 
          brokeRecord = true;
        }
      }
    });

    const today = new Date().setHours(0, 0, 0, 0);
    const lastSession = new Date(currentStats.lastSessionDate || 0).setHours(0, 0, 0, 0);
    const oneDayInMs = 86400000;

    if (today > lastSession) {
      if (today - lastSession <= oneDayInMs) {
        currentStats.currentStreak += 1;
      } else {
        currentStats.currentStreak = 1;
      }
      currentStats.lastSessionDate = today;
    }

    currentStats.experiencePoints += newXP;

    await setDoc(statsRef, currentStats, { merge: true });
    this.statsSignal.set(currentStats);

    return { brokeRecord, earnedXP: newXP };
  }

  async saveFromForm(formData: any) {
    const currentUser = this.userSignal();
    if (!currentUser) return false;
        
    try {
      const workoutsRef = collection(this.firestore, 'workouts');
      const newWorkout = {
        ...formData,
        userId: currentUser.uid,
        createdAt: Date.now()
      };
      
      await addDoc(workoutsRef, newWorkout);
      
      await this.finalizeSession(formData.exercises || []);
      
      return true;
    } catch (error) {
      console.error("Error saving workout:", error);
      return false;
    }
  }
}