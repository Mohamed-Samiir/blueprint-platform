/**
 * The one and only "fake backend" for the auth module.
 *
 * Both `JwtAuthService` and `SessionAuthService` call into these helpers — the
 * simulated latency, the credential checks, the success/failure branching all
 * live here so neither service re-implements them. Every helper returns a cold
 * `Observable` with an artificial `delay(...)` so the preview UI exercises real
 * async states (pending spinners, late-arriving errors), and each has a failure
 * path (wrong password, e-mail already taken, bad reset code) so error states
 * are demonstrable and not just happy paths.
 *
 * Nothing here touches `HttpClient` — it is a pure in-memory stand-in. Swap
 * these calls for real `HttpClient` requests against your backend when you're
 * ready; the request/response shapes in `models.ts` are designed to carry over.
 */
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import type {
  AuthUser,
  ChangePasswordRequest,
  ForgotPasswordCodeRequest,
  ForgotPasswordEmailRequest,
  ForgotPasswordNewPasswordRequest,
  LoginRequest,
  SignupRequest,
} from '../../features/auth/models/models';

/** Artificial round-trip latency, milliseconds. */
const LATENCY = 600;

/** The fixed reset code the mock "e-mails" you in the forgot-password flow. */
export const MOCK_RESET_CODE = '123456';

interface MockRecord extends AuthUser {
  password: string;
}

/**
 * Seed accounts. `demo@blueprint.dev` / `password` is the happy path; any other
 * combination fails, so the forms can show their error UI.
 */
const USERS: MockRecord[] = [
  { id: 'u_1', name: 'Demo User', email: 'demo@blueprint.dev', password: 'password' },
  { id: 'u_2', name: 'Ada Lovelace', email: 'ada@blueprint.dev', password: 'analytical-engine' },
];

let nextUserId = USERS.length + 1;

/** Strip the password before handing a record back to app code. */
function publicUser(record: MockRecord): AuthUser {
  return { id: record.id, name: record.name, email: record.email };
}

function findByEmail(email: string): MockRecord | undefined {
  const needle = email.trim().toLowerCase();
  return USERS.find((u) => u.email.toLowerCase() === needle);
}

/** `of(value)` delayed, so callers always see an async boundary. */
function ok<T>(value: T): Observable<T> {
  return of(value).pipe(delay(LATENCY));
}

/** A delayed error, so failure paths are async too. */
function fail<T>(message: string): Observable<T> {
  return new Observable<T>((subscriber) => {
    const handle = setTimeout(() => subscriber.error(new Error(message)), LATENCY);
    return () => clearTimeout(handle);
  });
}

/* --- Credentials --- */

/** Validate a login. Errors on unknown e-mail or wrong password. */
export function mockAuthenticate(req: LoginRequest): Observable<AuthUser> {
  const record = findByEmail(req.email);
  if (!record || record.password !== req.password) {
    return fail('Incorrect e-mail or password.');
  }
  return ok(publicUser(record));
}

/** Register a new account. Errors if the e-mail is taken or passwords differ. */
export function mockRegister(req: SignupRequest): Observable<AuthUser> {
  if (req.password !== req.confirmPassword) {
    return fail('Passwords do not match.');
  }
  if (findByEmail(req.email)) {
    return fail('An account with that e-mail already exists.');
  }
  const record: MockRecord = {
    id: `u_${nextUserId++}`,
    name: req.name.trim(),
    email: req.email.trim(),
    password: req.password,
  };
  USERS.push(record);
  return ok(publicUser(record));
}

/* --- Token / session minting --- */

export function mockMintJwtPair(
  user: AuthUser,
): Observable<{ accessToken: string; refreshToken: string }> {
  return ok({
    accessToken: `mock-access.${user.id}.${Date.now()}`,
    refreshToken: `mock-refresh.${user.id}.${Date.now()}`,
  });
}

/** Exchange a refresh token for a fresh access token. Errors if it looks invalid. */
export function mockExchangeRefreshToken(
  refreshToken: string | null,
): Observable<{ accessToken: string }> {
  if (!refreshToken || !refreshToken.startsWith('mock-refresh.')) {
    return fail('Refresh token is missing or invalid.');
  }
  const [, userId] = refreshToken.split('.');
  return ok({ accessToken: `mock-access.${userId}.${Date.now()}` });
}

export function mockMintSession(user: AuthUser): Observable<{ sessionId: string }> {
  return ok({ sessionId: `mock-session.${user.id}.${Date.now()}` });
}

/* --- Forgot-password flow --- */

/** Step 1: request a reset code. Succeeds even for unknown e-mails (no account enumeration). */
export function mockSendResetCode(req: ForgotPasswordEmailRequest): Observable<{ sent: true }> {
  void req;
  return ok({ sent: true });
}

/** Step 2: verify the code. Errors unless it matches {@link MOCK_RESET_CODE}. */
export function mockVerifyResetCode(
  req: ForgotPasswordCodeRequest,
): Observable<{ verified: true }> {
  if (req.code.trim() !== MOCK_RESET_CODE) {
    return fail('That code is not correct or has expired.');
  }
  return ok({ verified: true });
}

/** Step 3: set the new password. Re-checks the code and the confirmation match. */
export function mockResetPassword(
  req: ForgotPasswordNewPasswordRequest,
): Observable<{ reset: true }> {
  if (req.code.trim() !== MOCK_RESET_CODE) {
    return fail('That code is not correct or has expired.');
  }
  if (req.newPassword !== req.confirmPassword) {
    return fail('Passwords do not match.');
  }
  const record = findByEmail(req.email);
  if (record) {
    record.password = req.newPassword;
  }
  return ok({ reset: true });
}

/* --- Change password (authenticated) --- */

/**
 * Change the password of the currently signed-in user. The caller passes the
 * user's e-mail (from whichever auth service holds the session); the mock uses
 * it to check the current password.
 */
export function mockChangePassword(
  email: string,
  req: ChangePasswordRequest,
): Observable<{ changed: true }> {
  if (req.newPassword !== req.confirmPassword) {
    return fail('New passwords do not match.');
  }
  const record = findByEmail(email);
  if (!record || record.password !== req.currentPassword) {
    return fail('Your current password is not correct.');
  }
  record.password = req.newPassword;
  return ok({ changed: true });
}
