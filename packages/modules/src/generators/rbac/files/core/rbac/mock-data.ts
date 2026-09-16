import type { Module, Permission, Role } from '../../features/rbac/models/models';

/**
 * Seed data for the RBAC preview / first run. `PermissionsService` and
 * `RolesService` write this into `RbacStorage` the first time nothing is
 * stored yet — after that, `localStorage` is the source of truth and this file
 * is never read again until the user clears storage.
 *
 * The dependency graph is deliberately non-trivial so `permission-graph.ts` has
 * something real to resolve: two independent 3-level chains
 * (`users.delete → users.edit → users.view`, `billing.refund → billing.manage →
 * billing.view`), and `users.view` depended on by two different permissions
 * (directly by `users.create` / `users.edit`, transitively by `users.delete`).
 */
export const MOCK_MODULES: Module[] = [
  { id: 'mod_users', name: 'User Management' },
  { id: 'mod_billing', name: 'Billing' },
  { id: 'mod_settings', name: 'Settings' },
];

export const MOCK_PERMISSIONS: Permission[] = [
  {
    id: 'p_users_view',
    moduleId: 'mod_users',
    key: 'users.view',
    label: 'View users',
    isModuleRoot: true,
    dependsOn: [],
  },
  {
    id: 'p_users_create',
    moduleId: 'mod_users',
    key: 'users.create',
    label: 'Create users',
    isModuleRoot: false,
    dependsOn: ['p_users_view'],
  },
  {
    id: 'p_users_edit',
    moduleId: 'mod_users',
    key: 'users.edit',
    label: 'Edit users',
    isModuleRoot: false,
    dependsOn: ['p_users_view'],
  },
  {
    id: 'p_users_delete',
    moduleId: 'mod_users',
    key: 'users.delete',
    label: 'Delete users',
    isModuleRoot: false,
    dependsOn: ['p_users_edit'],
  },
  {
    id: 'p_billing_view',
    moduleId: 'mod_billing',
    key: 'billing.view',
    label: 'View billing',
    isModuleRoot: true,
    dependsOn: [],
  },
  {
    id: 'p_billing_manage',
    moduleId: 'mod_billing',
    key: 'billing.manage',
    label: 'Manage invoices',
    isModuleRoot: false,
    dependsOn: ['p_billing_view'],
  },
  {
    id: 'p_billing_refund',
    moduleId: 'mod_billing',
    key: 'billing.refund',
    label: 'Issue refunds',
    isModuleRoot: false,
    dependsOn: ['p_billing_manage'],
  },
  {
    id: 'p_settings_view',
    moduleId: 'mod_settings',
    key: 'settings.view',
    label: 'View settings',
    isModuleRoot: true,
    dependsOn: [],
  },
  {
    id: 'p_settings_edit',
    moduleId: 'mod_settings',
    key: 'settings.edit',
    label: 'Edit settings',
    isModuleRoot: false,
    dependsOn: ['p_settings_view'],
  },
];

export const MOCK_ROLES: Role[] = [
  {
    id: 'role_admin',
    name: 'Administrator',
    description: 'Full access to every module.',
    active: true,
    permissionIds: MOCK_PERMISSIONS.map((p) => p.id),
  },
  {
    id: 'role_support',
    name: 'Support',
    description: 'Can manage users but not billing or settings.',
    active: true,
    permissionIds: ['p_users_view', 'p_users_create', 'p_users_edit', 'p_settings_view'],
  },
  {
    id: 'role_billing_viewer',
    name: 'Billing Viewer',
    description: 'Read-only access to billing.',
    active: true,
    permissionIds: ['p_billing_view'],
  },
  {
    id: 'role_legacy_ops',
    name: 'Legacy Ops',
    description: 'Retired role, kept for history.',
    active: false,
    permissionIds: ['p_users_view'],
  },
];
