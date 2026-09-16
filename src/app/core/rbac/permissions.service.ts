import { Injectable, computed, inject, signal } from '@angular/core';
import { MOCK_MODULES, MOCK_PERMISSIONS } from './mock-data';
import type { Module, Permission } from './models';
import { resolveDependents } from './permission-graph';
import { rbacId } from './rbac-id';
import { RbacStorage } from './rbac-storage';

const MODULES_KEY = 'modules';
const PERMISSIONS_KEY = 'permissions';

export type PermissionInput = Omit<Permission, 'id'>;

/**
 * Modules + permissions, backed by `RbacStorage`. Seeds from `mock-data.ts` the
 * first time nothing is stored; every mutation re-persists the full arrays
 * (small dataset, simplest correct approach for a mock layer — see
 * `RBAC_MODULE_SYNC_SUMMARY.md` on why this whole service is a stand-in for a
 * real backend rather than a parameterized storage choice).
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly storage = inject(RbacStorage);

  private readonly _modules = signal<Module[]>(
    this.storage.read(MODULES_KEY) ?? MOCK_MODULES,
  );
  private readonly _permissions = signal<Permission[]>(
    this.storage.read(PERMISSIONS_KEY) ?? MOCK_PERMISSIONS,
  );

  readonly modules = this._modules.asReadonly();
  readonly permissions = this._permissions.asReadonly();

  /** All permissions grouped by their module, in module order. */
  readonly groupedByModule = computed(() =>
    this._modules().map((module) => ({
      module,
      permissions: this._permissions().filter((p) => p.moduleId === module.id),
    })),
  );

  constructor() {
    // Persist the seed on first run so a reload doesn't silently re-seed on
    // top of user edits (only `read() === null` — never-stored — reseeds).
    if (this.storage.read(MODULES_KEY) === null)
      this.storage.write(MODULES_KEY, this._modules());
    if (this.storage.read(PERMISSIONS_KEY) === null) {
      this.storage.write(PERMISSIONS_KEY, this._permissions());
    }
  }

  addModule(name: string): Module {
    const module: Module = { id: rbacId('mod'), name: name.trim() };
    this._modules.update((modules) => [...modules, module]);
    this.persist();
    return module;
  }

  /** Create (`id` omitted) or update (`id` present) a permission. */
  savePermission(input: PermissionInput, id?: string): Permission {
    const permission: Permission = { ...input, id: id ?? rbacId('p') };
    this._permissions.update((all) =>
      id
        ? all.map((p) => (p.id === id ? permission : p))
        : [...all, permission],
    );
    this.persist();
    return permission;
  }

  /**
   * Delete `id` and everything that (transitively) depends on it. Returns
   * every permission actually removed (the target plus its dependents) so the
   * caller can show what happened and tell `RolesService` to prune the same
   * ids out of every role's `permissionIds`.
   */
  deletePermissionCascade(id: string): Permission[] {
    const all = this._permissions();
    const target = all.find((p) => p.id === id);
    if (!target) return [];

    const dependents = resolveDependents(id, all);
    const removedIds = new Set([id, ...dependents.map((p) => p.id)]);

    this._permissions.set(
      all
        .filter((p) => !removedIds.has(p.id))
        .map((p) => ({
          ...p,
          dependsOn: p.dependsOn.filter((dep) => !removedIds.has(dep)),
        })),
    );
    this.persist();
    return [target, ...dependents];
  }

  private persist(): void {
    this.storage.write(MODULES_KEY, this._modules());
    this.storage.write(PERMISSIONS_KEY, this._permissions());
  }
}
