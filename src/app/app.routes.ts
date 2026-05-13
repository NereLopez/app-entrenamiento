import { Routes } from '@angular/router';
import { TrainingSessionComponent } from './features/training-session/training-session.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { HistoryComponent } from './features/history/history.component';
import { LoginComponent } from './auth/login/login.component';
import { NutritionComponent } from './features/nutrition/nutrition.component';
import { authGuard } from './auth/auth.guard';


export const routes: Routes = [
{ path: '', redirectTo: 'login', pathMatch: 'full'},
{ path: 'dashboard',
  component: DashboardComponent, 
  canActivate: [authGuard]
},
{ path: 'training', 
  component: TrainingSessionComponent, 
  canActivate: [authGuard]
},
{ path: 'nutrition', 
  component: NutritionComponent, 
  canActivate: [authGuard]
},
{ path: 'history', 
 component: HistoryComponent,
 canActivate: [authGuard]
},
{ path: 'login', component: LoginComponent},
{ path: '**', redirectTo: 'login' }

];
