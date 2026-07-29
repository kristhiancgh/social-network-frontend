/**
 * The error shape every backend service returns - RFC 7807 plus the extensions
 * this project adds. Mirrors `dev.social.shared.error.ProblemDetailFactory`.
 *
 * Because all four services emit exactly this, the frontend needs one error
 * parser rather than one per API.
 */
export interface ProblemDetail {
  /** URI identifying the problem type, e.g. https://social.dev/errors/post-not-found */
  type: string;
  /** Short summary, stable for a given errorCode. */
  title: string;
  status: number;
  /** The varying part - safe to show to a user. */
  detail: string;
  /** Path that produced it. */
  instance?: string;

  /** Stable machine-readable code. Branch on this, never on `title`. */
  errorCode: string;
  /** Correlation id, echoed in the X-Trace-Id header. Quote it in bug reports. */
  traceId: string;
  timestamp: string;
  /** Which microservice answered. */
  service: string;
  /** Present only on validation failures. */
  errors?: FieldViolation[];
}

export interface FieldViolation {
  field: string;
  message: string;
}

/**
 * Error codes the UI reacts to differently. Everything else is shown as-is
 * using `detail`, which is written to be readable by a person.
 */
export const ERROR_CODE = {
  invalidCredentials: 'INVALID_CREDENTIALS',
  accountLocked: 'ACCOUNT_LOCKED',
  accountDisabled: 'ACCOUNT_DISABLED',
  expiredToken: 'EXPIRED_TOKEN',
  invalidToken: 'INVALID_TOKEN',
  unauthenticated: 'UNAUTHENTICATED',
  profileNotFound: 'PROFILE_NOT_FOUND',
  aliasAlreadyExists: 'ALIAS_ALREADY_EXISTS',
  usernameAlreadyExists: 'USERNAME_ALREADY_EXISTS',
  emailAlreadyExists: 'EMAIL_ALREADY_EXISTS',
  duplicatePost: 'DUPLICATE_POST',
  validationError: 'VALIDATION_ERROR',
} as const;

/** Narrows an unknown thrown value to a ProblemDetail. */
export function isProblemDetail(value: unknown): value is ProblemDetail {
  return (
    typeof value === 'object' &&
    value !== null &&
    'errorCode' in value &&
    'status' in value &&
    'title' in value
  );
}
