import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionAuthService } from '../../features/auth/services/session-auth.service';

/**
 * Echoes the stored session id back on every outgoing request as an
 * `X-Session-Id` header. Inert when no session id is stored.
 */
export const sessionAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionId = inject(SessionAuthService).sessionId;
  if (!sessionId) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Session-Id': sessionId } }));
};
