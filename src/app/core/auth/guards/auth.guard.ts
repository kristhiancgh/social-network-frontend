import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '@core/auth/store/auth.store';

/**
 * Blocks a route when nobody is logged in.
 *
 * Remembers where the user was heading in `redirectTo`, so after logging in
 * they land on the page they asked for rather than being dumped on the
 * timeline - which matters for a bookmarked profile link.
 *
 * This is convenience, not security. Every guard in a browser is bypassable by
 * anyone willing to open the console; the actual enforcement is the JWT check
 * each service performs on every request.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectTo: state.url },
  });
};
