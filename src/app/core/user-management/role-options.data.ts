/**
 * Fixed list of plain account-role labels for the role-select control and the
 * change-role dialog. Static demo data, not a service or dynamic lookup — and
 * deliberately unrelated to RBAC's `Role` entity (see `models.ts`).
 */
export const ROLE_OPTIONS = ['Admin', 'Manager', 'Staff', 'Viewer'] as const;
