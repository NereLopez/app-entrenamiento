import { Routes } from '@angular/router';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HistorialComponent } from './historial/historial.component';
import { LoginComponent } from './auth/login.component';
import { NutricionComponent } from './nutricion/nutricion.component';


export const routes: Routes = [
{ path: '', redirectTo: 'dashboard', pathMatch: 'full'},
{ path: 'dashboard', component: DashboardComponent},
{ path: 'training', component: NuevaSesionComponent },
{ path: 'nutricion', component: NutricionComponent},
{ path: 'historial', component: HistorialComponent },
{ path: 'login', component: LoginComponent},
{ path: '**', redirectTo: 'dashboard'}

];
