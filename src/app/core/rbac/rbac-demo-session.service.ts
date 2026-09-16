import { Injectable, computed, inject, signal } from '@angular/core';
import type { CurrentUserPermissionsResolver } from './current-user-permissions.token';
import { PermissionsService } from './permissions.service';
import { RolesService } from './roles.service';

/**
 * RBAC's *own* lightweight "active role" concept — the default
 * `CurrentUserPermissionsResolver` behind `CURRENT_USER_PERMISSIONS`, with zero
 * dependency on any auth mechanism (no `TokenStore`, no `AuthUser`, nothing
 * from `core/auth`). This is genuinely useful on its own, not just a
 * placeholder: it's what lets the RBAC preview demo permission-gated content by
 * switching "active role" with no sign-in step at all.
 *
 * Seeded with the *first* role in the (possibly already-persisted) roles list
 * — not `null` — so a freshly generated project isn't locked out of every
 * permission-gated route by default; the role-switcher then lets a developer
 * pick a more restricted (or inactive) role to see the deny path.
 */
@Injectable({ providedIn: 'root' })
export class RbacDemoSessionService implements CurrentUserPermissionsResolver {
  private readonly roles = inject(RolesService);
  private readonly permissions = inject(PermissionsService);

  private readonly activeRoleId = signal<string | null>(
    this.roles.roles()[0]?.id ?? null,
  );

  readonly activeRole = computed(
    () => this.roles.roles().find((r) => r.id === this.activeRoleId()) ?? null,
  );

  setActiveRole(roleId: string): void {
    this.activeRoleId.set(roleId);
  }

  /** Permission keys the active role currently grants. Empty if no active role, or the role is inactive. */
  currentPermissionKeys(): string[] {
    const role = this.activeRole();
    if (!role || !role.active) return [];

    const byId = new Map(
      this.permissions.permissions().map((p) => [p.id, p.key]),
    );
    return role.permissionIds
      .map((id) => byId.get(id))
      .filter((key): key is string => !!key);
  }

  hasPermission(key: string): boolean {
    return this.currentPermissionKeys().includes(key);
  }
}
