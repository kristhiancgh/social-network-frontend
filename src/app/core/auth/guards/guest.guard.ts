import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '@core/auth/store/auth.store';

/**
 * Keeps a logged-in user away from the login page.
 *
 * The mirror image of authGuard: without it, a signed-in user following an old
 * /login bookmark would be shown a form asking them to do what they have
 * already done.
 */
export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  return authStore.isAuthenticated() ? router.createUrlTree(['/posts']) : true;
};
