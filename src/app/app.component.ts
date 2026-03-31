import { Component, inject, effect, signal} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';
import { LoginComponent } from './auth/login.component';
import { EntrenamientoService } from './services/entrenamiento.service';
import { HistorialComponent } from './historial/historial.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,RouterLink,RouterLinkActive, CommonModule, NuevaSesionComponent, LoginComponent, HistorialComponent, DashboardComponent, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'app-entrenamiento';
  public entrenamientoService = inject(EntrenamientoService);
  tab: string = 'dashboard';
  darkMode = signal<boolean>(false);

  constructor() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
      this.darkMode.set(true);
    }

    effect(() => {
      if (this.darkMode()) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
        
      }
    });
  }
 
  toogleDarkMode() {
    const newMode = !this.darkMode();
    this.darkMode.set(newMode);
    // Guardamos el nuevo estado
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  }
}
