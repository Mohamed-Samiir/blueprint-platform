/**
 * Deliberately zero-dependency on `core/auth` / `core/rbac` (this module's hard
 * rule). `accountRole` is a plain descriptive label ("Admin", "Manager", …) —
 * no relation whatsoever to RBAC's `Role` entity, hence the different field
 * name (not `role`) to avoid even a naming echo of that concept.
 */
export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  /**
   * Base64 data URL, or `null` for no image. Mock-only convenience — see
   * `USER_MANAGEMENT_SYNC_SUMMARY.md` for why a real backend needs actual file
   * upload instead, not just a swapped-in service.
   */
  profileImage: string | null;
  accountRole: string;
  status: 'active' | 'inactive';
}
