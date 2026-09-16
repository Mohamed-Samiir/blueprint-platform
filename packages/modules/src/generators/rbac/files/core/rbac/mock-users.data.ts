import type { RbacUser } from '../../features/rbac/models/models';

/**
 * Mock "assigned users" — RBAC's own `RbacUser` shape (never `AuthUser` from
 * `core/auth` — see `current-user-permissions.token.ts` for why RBAC must stay
 * fully decoupled from any auth mechanism), plus the `roleId` RBAC needs.
 * Static, read-only fixture: nothing in this task list reassigns a user to a
 * different role, so this is a plain import, not a stateful service.
 *
 * `u_1` / `u_2` happen to share ids with the auth module's mock accounts
 * (`demo@blueprint.dev` / `ada@blueprint.dev`) purely as reference-app flavor —
 * RBAC's own demo session (`RbacDemoSessionService`) resolves permissions from
 * an *active role* selected directly, never from a signed-in user id, so this
 * overlap is cosmetic, not a real coupling.
 */
export interface MockRbacUser extends RbacUser {
  roleId: string;
}

export const MOCK_USERS: MockRbacUser[] = [
  { id: 'u_1', name: 'Demo User', email: 'demo@blueprint.dev', roleId: 'role_support' },
  { id: 'u_2', name: 'Ada Lovelace', email: 'ada@blueprint.dev', roleId: 'role_admin' },
  { id: 'u_3', name: 'Marcus Webb', email: 'marcus@blueprint.dev', roleId: 'role_support' },
  { id: 'u_4', name: 'Priya Shah', email: 'priya@blueprint.dev', roleId: 'role_admin' },
  { id: 'u_5', name: 'Owen Clarke', email: 'owen@blueprint.dev', roleId: 'role_billing_viewer' },
  { id: 'u_6', name: 'Nina Torres', email: 'nina@blueprint.dev', roleId: 'role_legacy_ops' },
];

/** Users currently assigned to `roleId`. */
export function usersForRole(roleId: string): MockRbacUser[] {
  return MOCK_USERS.filter((u) => u.roleId === roleId);
}
