import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API } from '@core/config/api.config';
import { Account, LoginRequest, LoginResponse, RegisterRequest } from '@core/auth/models/auth.models';

/**
 * Thin HTTP wrapper around auth-service.
 *
 * Holds no state - that belongs to `AuthStore`. Keeping the two apart means
 * this class can be swapped or mocked in a test without touching the state
 * machine, and the store never has to know an HTTP client exists.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API.auth.login, credentials);
  }

  register(request: RegisterRequest): Observable<Account> {
    return this.http.post<Account>(API.auth.register, request);
  }

  /** Echoes back what the current token claims. Used to revalidate on reload. */
  currentUser(): Observable<{ id: string; username: string; roles: string[] }> {
    return this.http.get<{ id: string; username: string; roles: string[] }>(API.auth.me);
  }
}
