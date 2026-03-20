import { Routes } from '@angular/router';
import { NuevaSesionComponent } from './nueva-sesion/nueva-sesion.component';

export const routes: Routes = [
{ path: '', component: NuevaSesionComponent },
{ path: '**', redirectTo: ''}

];
