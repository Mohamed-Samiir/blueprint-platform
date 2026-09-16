/** One permission module (e.g. "User Management"). Groups permissions in the UI. */
export interface Module {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  moduleId: string;
  /** Dotted key, e.g. `'users.create'`. */
  key: string;
  label: string;
  /** True for the module's own "can access this module at all" permission. */
  isModuleRoot: boolean;
  /** Ids of other permissions this one requires. */
  dependsOn: string[];
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  permissionIds: string[];
}

/**
 * Minimal user shape RBAC itself needs — deliberately its own type, not
 * `AuthUser` from `core/auth` (RBAC must never import anything from `core/auth`;
 * see `current-user-permissions.token.ts`). Any real project's actual user
 * shape will naturally satisfy this by structural typing as long as it has
 * these three fields.
 */
export interface RbacUser {
  id: string;
  name: string;
  email: string;
}
