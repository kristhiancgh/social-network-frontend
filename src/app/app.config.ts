import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { AuthStore } from '@core/auth/store/auth.store';
import { authInterceptor } from '@core/http/interceptors/auth.interceptor';
import { errorInterceptor } from '@core/http/interceptors/error.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(routes, withComponentInputBinding()),

    // Order matters. authInterceptor runs first on the way out (attaching the
    // token) and errorInterceptor last on the way back, so it sees the response
    // to a request that already carried the header - which is what lets it tell
    // "expired token" apart from "never sent one".
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),

    /**
     * Rebuilds the session before the first route is resolved.
     *
     * Without this, a page refresh would hit `authGuard` while the store still
     * had no user, bouncing a perfectly valid session to the login screen.
     * Returning the promise makes Angular wait for it.
     *
     * `restoreSession` swallows its own failures - an expired token clears
     * itself and the app boots as anonymous, rather than refusing to start.
     */
    provideAppInitializer(() => inject(AuthStore).restoreSession()),
  ],
};
