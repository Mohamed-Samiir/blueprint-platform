import { Injectable } from '@angular/core';
import { AuthTokenKey, TokenStore } from './token-store';

/**
 * In-memory {@link TokenStore} — nothing is persisted, so tokens are gone on
 * reload and are never exposed to another tab or to `localStorage`/`indexedDB`
 * where an XSS could scrape them at rest.
 *
 * This is the recommended production store for the access token. It assumes the
 * server keeps the refresh token in an `HttpOnly` cookie: on a fresh load the
 * app calls `JwtAuthService.refreshAccessToken()` once (a credentialed request)
 * to mint a new access token, so the session rehydrates without any client-held
 * secret. Select it with `provideAuth({ tokenStore: 'memory' })`.
 */
@Injectable()
export class InMemoryTokenStore extends TokenStore {
  private readonly tokens = new Map<AuthTokenKey, string>();

  get(key: AuthTokenKey): string | null {
    return this.tokens.get(key) ?? null;
  }

  set(key: AuthTokenKey, value: string): void {
    this.tokens.set(key, value);
  }

  remove(key: AuthTokenKey): void {
    this.tokens.delete(key);
  }

  clear(): void {
    this.tokens.clear();
  }
}
