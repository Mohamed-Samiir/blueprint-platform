/**
 * Shared request / response shapes for the auth module.
 *
 * Where the two strategies (JWT, session) overlap — the login and signup
 * requests, the user object, the whole forgot-password / change-password flow —
 * the shape lives here once. Where they genuinely differ, only the login
 * *response* differs, so there are two of those.
 */

/** The authenticated user, as both strategies return it. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/** Credentials for either login strategy. */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** JWT strategy: server returns a token pair alongside the user. */
export interface JwtLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Session strategy: server returns an opaque session id alongside the user. */
export interface SessionLoginResponse {
  sessionId: string;
  user: AuthUser;
}

/* --- Forgot-password flow: three discrete steps, one request shape each. --- */

export interface ForgotPasswordEmailRequest {
  email: string;
}

export interface ForgotPasswordCodeRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordNewPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change password for an already-authenticated user. Distinct from the
 * forgot-password flow — it takes the *current* password, never an email + code.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
