import { Injectable, inject, signal } from '@angular/core';
import { MOCK_ROLES } from './mock-data';
import type { Role } from './models';
import { rbacId } from './rbac-id';
import { RbacStorage } from './rbac-storage';

const ROLES_KEY = 'roles';

export type RoleInput = Omit<Role, 'id'>;

/** Roles, backed by `RbacStorage`. Seeds from `mock-data.ts` on first run. */
@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly storage = inject(RbacStorage);

  private readonly _roles = signal<Role[]>(
    this.storage.read(ROLES_KEY) ?? MOCK_ROLES,
  );
  readonly roles = this._roles.asReadonly();

  constructor() {
    if (this.storage.read(ROLES_KEY) === null)
      this.storage.write(ROLES_KEY, this._roles());
  }

  /** Create (`id` omitted) or update (`id` present) a role. */
  saveRole(input: RoleInput, id?: string): Role {
    const role: Role = { ...input, id: id ?? rbacId('role') };
    this._roles.update((all) =>
      id ? all.map((r) => (r.id === id ? role : r)) : [...all, role],
    );
    this.persist();
    return role;
  }

  deleteRole(id: string): void {
    this._roles.update((all) => all.filter((r) => r.id !== id));
    this.persist();
  }

  setActive(id: string, active: boolean): void {
    this._roles.update((all) =>
      all.map((r) => (r.id === id ? { ...r, active } : r)),
    );
    this.persist();
  }

  /** Strip the given permission ids out of every role's `permissionIds` — called after a permission cascade-delete. */
  removePermissionIds(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const removed = new Set(ids);
    this._roles.update((all) =>
      all.map((r) => ({
        ...r,
        permissionIds: r.permissionIds.filter((p) => !removed.has(p)),
      })),
    );
    this.persist();
  }

  private persist(): void {
    this.storage.write(ROLES_KEY, this._roles());
  }
}
