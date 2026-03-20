import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';
import { LoginComponent } from './auth/login.component';
import { EntrenamientoService } from './services/entrenamiento.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, NuevaSesionComponent, LoginComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'app-entrenamiento';
  public entrenamientoService = inject(EntrenamientoService);
}
