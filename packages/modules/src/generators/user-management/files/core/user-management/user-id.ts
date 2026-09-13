/** Short, prefixed id for users created in the UI. Same idea as `core/rbac/rbac-id.ts`, duplicated on purpose. */
export function userManagementId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
