import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthStore } from '@core/auth/store/auth.store';
import { ERROR_CODE, ProblemDetail, isProblemDetail } from '@core/models/problem-detail.model';

/**
 * Turns every failure into a {@link ProblemDetail}, so nothing downstream ever
 * has to deal with an `HttpErrorResponse`.
 *
 * Because all four backend services emit the same RFC 7807 shape, the happy
 * path here is simply unwrapping `error.error`. The rest of this file exists
 * for the cases that are *not* the backend speaking: a dead network, an nginx
 * 502, a timeout. Those produce an HTML body or nothing at all, and a component
 * that assumed `error.errorCode` existed would crash while trying to display
 * the error.
 */
export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authStore = inject(AuthStore);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const problem = toProblemDetail(error, request.url);

      const tokenRejected =
        problem.errorCode === ERROR_CODE.expiredToken ||
        problem.errorCode === ERROR_CODE.invalidToken ||
        problem.errorCode === ERROR_CODE.unauthenticated;

      const isLoginAttempt = request.url.includes('/api/auth/login');

      if (tokenRejected && !isLoginAttempt && authStore.isAuthenticated()) {
        authStore.sessionExpired();
      }

      return throwError(() => problem);
    }),
  );
};

function toProblemDetail(error: HttpErrorResponse, url: string): ProblemDetail {
  if (isProblemDetail(error.error)) {
    return error.error;
  }

  if (error.status === 0) {
    return synthetic({
      status: 0,
      errorCode: 'NETWORK_UNREACHABLE',
      title: 'Cannot reach the server',
      detail:
        'The API did not respond. Check your connection, or that the backend is running on port 8080.',
      instance: url,
    });
  }

  return synthetic({
    status: error.status,
    errorCode: 'UNEXPECTED_ERROR',
    title: error.statusText || 'Unexpected error',
    detail:
      typeof error.error === 'string' && error.error.length < 200
        ? error.error
        : `The server answered ${error.status} without the expected error format.`,
    instance: url,
  });
}

function synthetic(
  base: Pick<ProblemDetail, 'status' | 'errorCode' | 'title' | 'detail' | 'instance'>,
): ProblemDetail {
  return {
    ...base,
    type: `https://social.dev/errors/${base.errorCode.toLowerCase().replace(/_/g, '-')}`,
    traceId: 'client-side',
    timestamp: new Date().toISOString(),
    service: 'frontend',
  };
}
