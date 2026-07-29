import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthStore } from '@core/auth/store/auth.store';

/**
 * Attaches the bearer token to outgoing API calls.
 *
 * Only to same-origin `/api/**` paths. Blindly stamping the token onto every
 * request would hand it to any third-party host the app ever calls - a CDN, an
 * analytics endpoint - which is how tokens leak to places nobody audited.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthStore).token();

  const isOwnApi = request.url.startsWith('/api/');
  if (!token || !isOwnApi) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
