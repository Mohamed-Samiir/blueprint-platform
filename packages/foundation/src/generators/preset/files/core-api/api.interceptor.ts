import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_URL } from '../../environments/api-url.token';

/**
 * Prefixes root-relative requests with the environment's API origin.
 *
 * Orval-generated services call paths like `/api/Auth/Login` — the `/api`
 * segment comes from the backend's own route templates, so `API_URL` must be
 * the **origin only** (no `/api` suffix) or the segment doubles up. Absolute
 * URLs (assets, third-party APIs) are left untouched.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_URL);
  if (!apiUrl || !req.url.startsWith('/')) {
    return next(req);
  }
  return next(req.clone({ url: `${apiUrl}${req.url}` }));
};
