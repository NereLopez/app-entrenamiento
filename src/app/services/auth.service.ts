import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Inyectamos el módulo de Auth de Firebase
  private auth = inject(Auth);

  // Observable para saber en tiempo real si el usuario está logueado o no
  user$: Observable<any> = user(this.auth);

  // Función para registrar nuevos usuarios
  async register(email: string, pass: string) {
    return createUserWithEmailAndPassword(this.auth, email, pass);
  }

  // Función para iniciar sesión
  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(this.auth, email, pass);
  }

  // Función para cerrar sesión
  async logout() {
    return signOut(this.auth);
  }
}