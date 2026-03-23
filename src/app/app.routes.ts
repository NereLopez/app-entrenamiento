import { Routes } from '@angular/router';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HistorialComponent } from './historial/historial.component';
import { LoginComponent } from './auth/login.component';


export const routes: Routes = [
{ path: '', component: DashboardComponent },
{ path: 'login', component: LoginComponent},
{ path: 'dashboard', component: DashboardComponent},
{ path: 'training', component: NuevaSesionComponent },
{ path: 'historial', component: HistorialComponent },
{ path: '', redirectTo: 'dashboard', pathMatch: 'full'},
{ path: '**', redirectTo: ''}

];
