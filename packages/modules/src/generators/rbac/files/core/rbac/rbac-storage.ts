import { Injectable } from '@angular/core';

/**
 * `localStorage` wrapper shared by `PermissionsService` and `RolesService` —
 * neither talks to `localStorage` directly. JSON in, JSON out, a fixed
 * `bp-rbac-` key prefix, and every call is wrapped so a disabled/unavailable
 * store (private mode, SSR, quota) degrades to "no data" rather than throwing.
 *
 * **Mock-persistence choice: `localStorage`, not `json-server`.** `json-server`
 * needs a second process running alongside `ng serve` — real friction for
 * anyone opening this project just to look at the RBAC screens — while
 * `localStorage` needs nothing extra, persists across reloads (useful for
 * demoing the dependency-cascade behaviour without re-seeding every session),
 * and matches the pattern already used for the JWT/session auth work. See
 * `RBAC_MODULE_SYNC_SUMMARY.md` for the platform-sync implication of this
 * choice (unlike auth's `local`/`memory` split, this whole layer is a stand-in
 * for a real backend, not a parameterized production option).
 */
@Injectable({ providedIn: 'root' })
export class RbacStorage {
  private readonly prefix = 'bp-rbac-';

  read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  write<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      /* storage unavailable — no-op */
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      /* storage unavailable — no-op */
    }
  }
}
