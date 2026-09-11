import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { mockAuthenticate, mockMintSession } from './auth-mock.data';
import type { LoginRequest, SessionLoginResponse } from './models';
import { TokenStore } from './token-store';

/**
 * Session auth strategy: login mints an opaque session id which
 * `sessionAuthInterceptor` echoes back on every request as `X-Session-Id`.
 * There is no refresh concept — the id is valid until logout.
 *
 * Persistence goes through the injected {@link TokenStore} (default
 * `LocalStorageTokenStore`). Same XSS trade-off as `JwtAuthService`; a
 * server-set `HttpOnly` cookie is the stronger production choice, in which case
 * this service just tracks `isAuthenticated` and stores nothing.
 */
@Injectable({ providedIn: 'root' })
export class SessionAuthService {
  private readonly store = inject(TokenStore);

  private readonly _sessionId = signal<string | null>(this.store.get('session'));

  private readonly _isAuthenticated = computed(() => this._sessionId() !== null);

  /** Reactive: `true` while a session id is stored. */
  isAuthenticated(): Signal<boolean> {
    return this._isAuthenticated;
  }

  /** Current session id, or `null`. Used by `sessionAuthInterceptor`. */
  get sessionId(): string | null {
    return this._sessionId();
  }

  login(req: LoginRequest): Observable<SessionLoginResponse> {
    return mockAuthenticate(req).pipe(
      switchMap((user) =>
        mockMintSession(user).pipe(
          tap(({ sessionId }) => {
            this.store.set('session', sessionId);
            this._sessionId.set(sessionId);
          }),
          map(({ sessionId }) => ({ sessionId, user })),
        ),
      ),
    );
  }

  logout(): void {
    this.store.remove('session');
    this._sessionId.set(null);
  }
}
