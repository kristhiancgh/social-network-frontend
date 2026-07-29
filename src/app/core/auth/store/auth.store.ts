import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { TOKEN_STORAGE_KEY } from '@core/config/api.config';
import { ProblemDetail, isProblemDetail } from '@core/models/problem-detail.model';
import { AuthenticatedUser, LoginRequest, ROLE_ADMIN } from '@core/auth/models/auth.models';
import { AuthService } from '@core/auth/services/auth.service';

interface AuthState {
  user: AuthenticatedUser | null;
  token: string | null;
  loading: boolean;
  error: ProblemDetail | null;
}

/**
 * Reads the token written by a previous session.
 *
 * localStorage is a deliberate trade-off, not an oversight. It survives a
 * refresh - the alternative is asking the user to log in every time they hit
 * F5 - but it is readable by any script running on this origin, so an XSS
 * becomes a token theft. The genuinely safe option is an httpOnly cookie, which
 * this API does not use because it is stateless and cookie-free by design (see
 * the CSRF note in ResourceServerSecurity).
 *
 * What limits the damage instead: the token carries no personal data, it
 * expires in two hours, and it is the only thing stored.
 */
function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * A factory, not a constant.
 *
 * As a plain object it would be built once when this module is first evaluated,
 * so the stored token would be read at import time - before anything could have
 * written one, and impossible to vary between tests. A factory runs when the
 * store is created.
 */
function initialState(): AuthState {
  return {
    user: null,
    token: readStoredToken(),
    loading: false,
    error: null,
  };
}

/**
 * The single source of truth for "who is logged in".
 *
 * A root-provided SignalStore, so it is a true singleton: the header, the
 * guard, the interceptor and every feature read the same signals, and a login
 * anywhere updates all of them with no event bus and no manual subscription.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  // The function is passed, not called. `withState(initialState())` would
  // evaluate it once at module load - reading localStorage before anything
  // could have written to it - which is the exact bug the factory exists to
  // avoid. NgRx invokes it when the store is created.
  withState(initialState),

  withComputed(({ user, token }) => ({
    isAuthenticated: computed(() => token() !== null),
    username: computed(() => user()?.username ?? ''),
    userId: computed(() => user()?.id ?? null),
    isAdmin: computed(() => user()?.roles.includes(ROLE_ADMIN) ?? false),
  })),

  withMethods((store, authService = inject(AuthService), router = inject(Router)) => ({
    async login(credentials: LoginRequest): Promise<boolean> {
      patchState(store, { loading: true, error: null });

      try {
        const response = await firstValueFrom(authService.login(credentials));

        localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
        patchState(store, {
          user: response.user,
          token: response.accessToken,
          loading: false,
          error: null,
        });
        return true;
      } catch (error) {
        patchState(store, {
          loading: false,
          error: isProblemDetail(error) ? error : null,
          user: null,
          token: null,
        });
        return false;
      }
    },

    /**
     * Rebuilds the session from a token found in storage.
     *
     * The token alone is not enough: it could have expired while the tab was
     * closed, or been revoked. Asking the server settles it, and a failure
     * clears the stale token rather than letting the UI render a logged-in
     * shell that 401s on its first real request.
     */
    async restoreSession(): Promise<void> {
      const token = store.token();
      if (!token) {
        return;
      }

      patchState(store, { loading: true });
      try {
        const user = await firstValueFrom(authService.currentUser());
        patchState(store, { user, loading: false });
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        patchState(store, { user: null, token: null, loading: false });
      }
    },

    logout(redirectTo: string = '/login'): void {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      patchState(store, { user: null, token: null, error: null });
      void router.navigate([redirectTo]);
    },

    /** Called by the error interceptor when the server rejects the token. */
    sessionExpired(): void {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      patchState(store, { user: null, token: null });
      void router.navigate(['/login'], { queryParams: { reason: 'expired' } });
    },

    clearError(): void {
      patchState(store, { error: null });
    },
  })),
);
