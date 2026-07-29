/** Mirrors `LoginRequest` in auth-service. */
export interface LoginRequest {
  username: string;
  password: string;
}

/** Mirrors `RegisterRequest` in auth-service. */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** Mirrors `LoginResponse.AuthenticatedUserSummary`. */
export interface AuthenticatedUser {
  id: string;
  username: string;
  roles: string[];
}

/** Mirrors `LoginResponse`. */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  /** Lifetime in seconds. */
  expiresIn: number;
  expiresAt: string;
  user: AuthenticatedUser;
}

/** Mirrors `AccountResponse`. */
export interface Account {
  id: string;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
  createdAt: string;
}

export const ROLE_ADMIN = 'ROLE_ADMIN';
