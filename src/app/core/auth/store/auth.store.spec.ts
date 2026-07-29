import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TOKEN_STORAGE_KEY } from '@core/config/api.config';
import { ProblemDetail } from '@core/models/problem-detail.model';
import { LoginResponse } from '@core/auth/models/auth.models';
import { AuthService } from '@core/auth/services/auth.service';
import { AuthStore } from './auth.store';

const LOGIN_RESPONSE: LoginResponse = {
  accessToken: 'header.payload.signature',
  tokenType: 'Bearer',
  expiresIn: 7200,
  expiresAt: '2026-07-27T14:00:00Z',
  user: {
    id: '11111111-1111-1111-1111-111111110101',
    username: 'jdoe',
    roles: ['ROLE_USER'],
  },
};

const INVALID_CREDENTIALS: ProblemDetail = {
  type: 'https://social.dev/errors/invalid-credentials',
  title: 'Invalid credentials',
  status: 401,
  detail: 'Invalid username or password',
  errorCode: 'INVALID_CREDENTIALS',
  traceId: 'trace-1',
  timestamp: '2026-07-27T12:00:00Z',
  service: 'auth-service',
};

describe('AuthStore', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();

    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'register',
      'currentUser',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  describe('login', () => {
    it('stores the user, the token and reports success', async () => {
      authService.login.and.returnValue(of(LOGIN_RESPONSE));
      const store = TestBed.inject(AuthStore);

      const result = await store.login({ username: 'jdoe', password: 'Password123!' });

      expect(result).toBeTrue();
      expect(store.isAuthenticated()).toBeTrue();
      expect(store.username()).toBe('jdoe');
      expect(store.userId()).toBe(LOGIN_RESPONSE.user.id);
      expect(store.loading()).toBeFalse();
      expect(store.error()).toBeNull();
    });

    it('persists the token so a refresh does not sign the user out', async () => {
      authService.login.and.returnValue(of(LOGIN_RESPONSE));
      const store = TestBed.inject(AuthStore);

      await store.login({ username: 'jdoe', password: 'Password123!' });

      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe(LOGIN_RESPONSE.accessToken);
    });

    it('keeps the error and stays unauthenticated when the credentials are wrong', async () => {
      authService.login.and.returnValue(throwError(() => INVALID_CREDENTIALS));
      const store = TestBed.inject(AuthStore);

      const result = await store.login({ username: 'jdoe', password: 'wrong' });

      expect(result).toBeFalse();
      expect(store.isAuthenticated()).toBeFalse();
      expect(store.error()?.errorCode).toBe('INVALID_CREDENTIALS');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    it('does not leave loading stuck on after a failure', async () => {
      authService.login.and.returnValue(throwError(() => INVALID_CREDENTIALS));
      const store = TestBed.inject(AuthStore);

      await store.login({ username: 'jdoe', password: 'wrong' });

      expect(store.loading()).toBeFalse();
    });
  });

  describe('isAdmin', () => {
    it('is false for an ordinary user', async () => {
      authService.login.and.returnValue(of(LOGIN_RESPONSE));
      const store = TestBed.inject(AuthStore);
      await store.login({ username: 'jdoe', password: 'Password123!' });

      expect(store.isAdmin()).toBeFalse();
    });

    it('is true when the token carries ROLE_ADMIN', async () => {
      authService.login.and.returnValue(
        of({
          ...LOGIN_RESPONSE,
          user: { ...LOGIN_RESPONSE.user, username: 'kcamilo', roles: ['ROLE_USER', 'ROLE_ADMIN'] },
        }),
      );
      const store = TestBed.inject(AuthStore);
      await store.login({ username: 'kcamilo', password: 'Password123!' });

      expect(store.isAdmin()).toBeTrue();
    });
  });

  describe('restoreSession', () => {
    it('does nothing when there is no stored token', async () => {
      const store = TestBed.inject(AuthStore);

      await store.restoreSession();

      expect(authService.currentUser).not.toHaveBeenCalled();
      expect(store.isAuthenticated()).toBeFalse();
    });

    it('rebuilds the user from a stored token', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'stored.token.value');
      authService.currentUser.and.returnValue(of(LOGIN_RESPONSE.user));
      const store = TestBed.inject(AuthStore);

      await store.restoreSession();

      expect(store.isAuthenticated()).toBeTrue();
      expect(store.username()).toBe('jdoe');
    });

    it('discards a token the server no longer accepts', async () => {
      localStorage.setItem(TOKEN_STORAGE_KEY, 'expired.token.value');
      authService.currentUser.and.returnValue(throwError(() => INVALID_CREDENTIALS));
      const store = TestBed.inject(AuthStore);

      await store.restoreSession();

      expect(store.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  describe('logout', () => {
    it('clears everything and navigates away', async () => {
      authService.login.and.returnValue(of(LOGIN_RESPONSE));
      const store = TestBed.inject(AuthStore);
      await store.login({ username: 'jdoe', password: 'Password123!' });

      store.logout();

      expect(store.isAuthenticated()).toBeFalse();
      expect(store.user()).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('sessionExpired', () => {
    it('clears the session and explains why on the login page', async () => {
      authService.login.and.returnValue(of(LOGIN_RESPONSE));
      const store = TestBed.inject(AuthStore);
      await store.login({ username: 'jdoe', password: 'Password123!' });

      store.sessionExpired();

      expect(store.isAuthenticated()).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { reason: 'expired' },
      });
    });
  });
});
