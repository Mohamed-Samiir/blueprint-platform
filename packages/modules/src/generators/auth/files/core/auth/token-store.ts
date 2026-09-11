/**
 * Storage seam for the auth tokens. Both `JwtAuthService` and
 * `SessionAuthService` read and write through this — they never touch a concrete
 * storage API directly — so the persistence strategy is a one-line swap
 * (`provideAuth({ tokenStore: 'memory' })`).
 *
 * The wired default is {@link LocalStorageTokenStore}: it survives a reload, but
 * any script that runs on the origin (i.e. any XSS) can read every token
 * synchronously. The production-grade choice is {@link InMemoryTokenStore} for
 * the short-lived access token, paired with a server that issues the refresh
 * token as an `HttpOnly; Secure; SameSite` cookie so JavaScript can never read
 * it; `JwtAuthService.refreshAccessToken()` then becomes a credentialed request
 * that carries no client-held secret.
 */
export type AuthTokenKey = 'access' | 'refresh' | 'session';

export abstract class TokenStore {
  /** The stored value for `key`, or `null` if absent / unavailable. */
  abstract get(key: AuthTokenKey): string | null;
  abstract set(key: AuthTokenKey, value: string): void;
  abstract remove(key: AuthTokenKey): void;
  /** Drop every auth token (used on logout / global sign-out). */
  abstract clear(): void;
}

/** Concrete `localStorage` keys, kept out of the services. */
export const TOKEN_STORAGE_KEYS: Record<AuthTokenKey, string> = {
  access: 'bp-auth-access-token',
  refresh: 'bp-auth-refresh-token',
  session: 'bp-auth-session-id',
};
