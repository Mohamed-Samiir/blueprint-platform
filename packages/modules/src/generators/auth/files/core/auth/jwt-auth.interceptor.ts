import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { JwtAuthService } from './jwt-auth.service';

/**
 * Attaches `Authorization: Bearer <accessToken>` whenever the JWT strategy has a
 * token stored. With no token it passes the request straight through.
 *
 * **401 handling — one-shot refresh-and-retry.** On a 401 it calls
 * `JwtAuthService.refreshAccessToken()` and replays the original request once
 * with the new access token.
 *
 * What it intentionally does NOT do (a production interceptor needs all three):
 *   - queue other requests that 401 while a refresh is already in flight and
 *     replay them all against the single new token;
 *   - rotate / re-store the refresh token;
 *   - force a logout + redirect to the login route when the refresh itself fails.
 */
export const jwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(JwtAuthService);

  const withToken = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  const token = auth.accessToken;
  if (!token) {
    return next(req);
  }

  let retried = false;
  return next(withToken(token)).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !retried) {
        retried = true;
        return auth
          .refreshAccessToken()
          .pipe(switchMap(({ accessToken }) => next(withToken(accessToken))));
      }
      return throwError(() => err);
    }),
  );
};
