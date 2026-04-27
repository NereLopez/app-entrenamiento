import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EntrenamientoService } from '../services/entrenamiento.service';
import { Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { take } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html', 
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  email = '';
  pass = '';
  isPending = false; 

  private auth = inject(Auth);
  private trainingService = inject(EntrenamientoService);
  private router = inject(Router);

  ngOnInit() {
    authState(this.auth).pipe(take(1)).subscribe(user => {
      if (user) this.router.navigate(['/dashboard']);
    });
  }

  async onLogin() {
    if (!this.email || !this.pass) return;
    this.isPending = true;
    
    try {
      await this.trainingService.login(this.email, this.pass);
      this.router.navigate(['/dashboard']);
    } catch (e) {
      alert('Login failed. Please check your credentials.');
      this.pass = ''; 
    } finally {
      this.isPending = false;
    }
  }

  async onRegister() {
    const cleanEmail = this.email.trim();
    const cleanPass = this.pass.trim();

    if (cleanPass.length < 6) {
      alert('Write a longer password (minimun 6 characteres)');
      return;
    }

    this.isPending = true;
    try {
      await this.trainingService.signUp(cleanEmail, cleanPass);
      alert('¡Cuenta creada con éxito! Ya puedes entrar.');
     
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      this.isPending = false;
    }
  }
}