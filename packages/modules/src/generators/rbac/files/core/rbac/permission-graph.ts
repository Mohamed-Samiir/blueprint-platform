import type { Permission } from './models';

/**
 * Everything `permissionId` requires — transitively. If A depends on B and B
 * depends on C, resolving A's dependencies returns both B and C, not just B.
 * A permission absent from `all`, or a dependency id that doesn't resolve, is
 * silently skipped rather than throwing — mock data can be edited by hand.
 */
export function resolveDependencies(permissionId: string, all: Permission[]): Permission[] {
  const byId = new Map(all.map((p) => [p.id, p]));
  const result = new Map<string, Permission>();

  const visit = (id: string): void => {
    const permission = byId.get(id);
    if (!permission) return;
    for (const depId of permission.dependsOn) {
      if (result.has(depId)) continue; // already resolved — also guards against cycles
      const dep = byId.get(depId);
      if (!dep) continue;
      result.set(depId, dep);
      visit(depId);
    }
  };

  visit(permissionId);
  return [...result.values()];
}

/**
 * The inverse of {@link resolveDependencies}: everything that would break —
 * directly or transitively — if `permissionId` were removed.
 */
export function resolveDependents(permissionId: string, all: Permission[]): Permission[] {
  const result = new Map<string, Permission>();

  const visit = (id: string): void => {
    for (const permission of all) {
      if (result.has(permission.id)) continue;
      if (permission.dependsOn.includes(id)) {
        result.set(permission.id, permission);
        visit(permission.id);
      }
    }
  };

  visit(permissionId);
  return [...result.values()];
}

/**
 * Would adding a `permissionId → dependsOnId` edge create a cycle? True if
 * they're the same permission, or if `dependsOnId` already (transitively)
 * depends on `permissionId`. Used by `permission-form` before it lets a new
 * `dependsOn` entry be added.
 */
export function wouldCreateCycle(
  permissionId: string,
  dependsOnId: string,
  all: Permission[],
): boolean {
  if (permissionId === dependsOnId) return true;
  return resolveDependencies(dependsOnId, all).some((p) => p.id === permissionId);
}
