import { InjectionToken, inject } from '@angular/core';
import { RbacDemoSessionService } from './rbac-demo-session.service';

/**
 * RBAC's sole contract for "resolve the current user's permissions" — the
 * decoupling point from any auth mechanism (Task 6.2's `CurrentUserPermissionsService`
 * read straight from `TokenStore`/`core/auth`, exactly the coupling that must
 * not exist in the platform version). `permission.guard.ts` and anything else
 * that needs to know "can the current user do X" depends on this token, never
 * on a concrete service directly.
 *
 * Defaults to `RbacDemoSessionService` — a safe, fully self-contained
 * implementation with zero dependency on auth (see that file) — so RBAC works
 * out of the box with no auth setup at all.
 *
 * To integrate with real authentication (Blueprint's auth module or your own):
 * provide a real implementation of `CurrentUserPermissionsResolver` in
 * `app.config.ts`, e.g.:
 *   { provide: CURRENT_USER_PERMISSIONS, useClass: MyRealPermissionsService }
 */
export interface CurrentUserPermissionsResolver {
  hasPermission(key: string): boolean;
}

export const CURRENT_USER_PERMISSIONS = new InjectionToken<CurrentUserPermissionsResolver>(
  'CURRENT_USER_PERMISSIONS',
  { providedIn: 'root', factory: () => inject(RbacDemoSessionService) },
);
