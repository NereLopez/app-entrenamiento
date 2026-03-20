import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EntrenamientoService } from '../services/entrenamiento.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container d-flex justify-content-center align-items-center" style="min-height: 80vh;">
      <div class="card p-4 shadow-lg border-0 rounded-4" style="max-width: 400px; width: 100%;">
        <div class="text-center mb-4">
          <h2 class="fw-bold" style="color: #4158D0;">Workout Master</h2>
          <p class="text-muted">Login to save your progress</p>
        </div>

        <div class="mb-3">
          <label class="form-label small fw-bold text-secondary">EMAIL</label>
          <input [(ngModel)]="email" type="email" class="form-control rounded-3 p-2" placeholder="email@example.com">
        </div>

        <div class="mb-4">
          <label class="form-label small fw-bold text-secondary">PASSWORD</label>
          <input [(ngModel)]="pass" type="password" class="form-control rounded-3 p-2" placeholder="Password">
        </div>

        <button (click)="onLogin()" class="btn btn-primary w-100 fw-bold py-2 mb-3 shadow-sm" style="border-radius: 12px; background: #4158D0;">
          Login
        </button>
        
        <button (click)="onRegister()" class="btn btn-outline-secondary w-100 fw-bold py-2" style="border-radius: 12px;">
          Create Account
        </button>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  pass = '';
  private trainingService = inject(EntrenamientoService);

  async onLogin() {
    try {
      await this.trainingService.login(this.email, this.pass);
    } catch (e) {
      alert('Login failed. Please check your credentials.');
    }
  }

  async onRegister() {

    const cleanEmail = this.email.trim();
    const cleanPass = this.pass.trim();

    if (cleanPass.length < 6) {
    alert('Escribe una contraseña más larga (mínimo 6 caracteres)');
    return;
  }
    try {
      await this.trainingService.signUp(cleanEmail, cleanPass);
      alert('Account created! Now you can login.');
    } catch (e: any) {
      alert('Error de Firebase:' + e.message);
    }
  }
}