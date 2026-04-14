import { Routes } from '@angular/router';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HistorialComponent } from './historial/historial.component';
import { LoginComponent } from './auth/login.component';
import { NutricionComponent } from './nutricion/nutricion.component';
import { authGuard } from './auth/auth.guard';


export const routes: Routes = [
{ path: '', redirectTo: 'login', pathMatch: 'full'},
{ path: 'dashboard',
  component: DashboardComponent, 
  canActivate: [authGuard]
},
{ path: 'training', 
  component: NuevaSesionComponent, 
  canActivate: [authGuard]
},
{ path: 'nutricion', 
  component: NutricionComponent, 
  canActivate: [authGuard]
},
{ path: 'historial', 
 component: HistorialComponent,
 canActivate: [authGuard]
},
{ path: 'login', component: LoginComponent},
{ path: '**', redirectTo: 'login' }

];
