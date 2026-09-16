/** Short, prefixed, collision-safe-enough id for mock records created in the UI. */
export function rbacId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
