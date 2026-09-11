import { Injectable } from '@angular/core';
import { AuthTokenKey, TOKEN_STORAGE_KEYS, TokenStore } from './token-store';

/**
 * `localStorage`-backed {@link TokenStore} — the wired default.
 *
 * Tokens survive a page reload and browser restart, at the cost of being
 * readable by any script on the origin. See {@link TokenStore} for the
 * production trade-off. All access is wrapped so a disabled / unavailable
 * `localStorage` (private mode, SSR, storage quota) degrades to "no token"
 * rather than throwing.
 */
@Injectable()
export class LocalStorageTokenStore extends TokenStore {
  get(key: AuthTokenKey): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEYS[key]);
    } catch {
      return null;
    }
  }

  set(key: AuthTokenKey, value: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEYS[key], value);
    } catch {
      /* storage unavailable — no-op */
    }
  }

  remove(key: AuthTokenKey): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEYS[key]);
    } catch {
      /* storage unavailable — no-op */
    }
  }

  clear(): void {
    (Object.keys(TOKEN_STORAGE_KEYS) as AuthTokenKey[]).forEach((k) => this.remove(k));
  }
}
