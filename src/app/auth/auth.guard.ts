import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EntrenamientoService } from './auth.service';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs';


export const authGuard = () => {
  const service = inject(EntrenamientoService);
  const router = inject(Router);
  const auth = inject(Auth);

 return authState(auth).pipe(
  take(1),
  map(user => {
    if (user) {
      return true;
    } else {
      return router.parseUrl('/login');
    }
  })
 );
};