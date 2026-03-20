import { Routes } from '@angular/router';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HistorialComponent } from './historial/historial.component';

export const routes: Routes = [
{ path: '', component: DashboardComponent },
{ path: 'dashboard', component: DashboardComponent},
{ path: 'training', component: NuevaSesionComponent },
{ path: 'historial', component: HistorialComponent },
{ path: '**', redirectTo: ''}

];
