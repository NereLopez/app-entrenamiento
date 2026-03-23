import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EntrenamientoService } from './auth.service';


export const authGuard = () => {
  const service = inject(EntrenamientoService);
  const router = inject(Router);

  // If signal has a user, let them through
  if (service.userSignal()) {
    return true;
  }

  // Otherwise, send them to the login path (we'll add this path next)
  return router.parseUrl('/login');
};