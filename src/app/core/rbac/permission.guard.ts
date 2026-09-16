import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CURRENT_USER_PERMISSIONS } from './current-user-permissions.token';

/**
 * Route guard factory, parameterized by the required permission key:
 * `{ path: 'users', canActivate: [permissionGuard('users.view')] }`.
 *
 * Injects `CURRENT_USER_PERMISSIONS` — the token, never a concrete service —
 * so this guard works identically whether the default `RbacDemoSessionService`
 * is active or a real project has overridden the token with its own
 * auth-backed resolver. This is RBAC's only guard; it has zero knowledge of
 * *how* "current user's permissions" gets resolved.
 *
 * Redirects to `/forbidden` (a real, minimal, styled page — see
 * `features/rbac/forbidden/`) rather than a placeholder, since the RBAC
 * preview needs somewhere real to land when demoing the deny path.
 */
export const permissionGuard = (requiredKey: string): CanActivateFn => {
  return () => {
    const hasPermission = inject(CURRENT_USER_PERMISSIONS).hasPermission(
      requiredKey,
    );
    const router = inject(Router);
    return hasPermission || router.parseUrl('/forbidden');
  };
};
