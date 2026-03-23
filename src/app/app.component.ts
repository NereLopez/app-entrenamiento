import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';
import { LoginComponent } from './auth/login.component';
import { EntrenamientoService } from './services/entrenamiento.service';
import { HistorialComponent } from './historial/historial.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,RouterLink,RouterLinkActive, CommonModule, NuevaSesionComponent, LoginComponent, HistorialComponent, DashboardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'app-entrenamiento';
  public entrenamientoService = inject(EntrenamientoService);
  tab: string = 'dashboard';
}
