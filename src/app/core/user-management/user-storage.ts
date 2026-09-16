import { Injectable } from '@angular/core';

/**
 * `localStorage` wrapper for this module. Same *pattern* as `core/rbac`'s
 * `RbacStorage` — a fixed key prefix, JSON in/out, every call wrapped so a
 * disabled/unavailable store degrades to "no data" rather than throwing — but
 * a fresh, independent implementation. This module must not import
 * `core/rbac/rbac-storage.ts` (or anything else from `core/rbac`/`core/auth`):
 * an accidental dependency edge is worse here than a few duplicated lines.
 */
@Injectable({ providedIn: 'root' })
export class UserStorage {
  private readonly prefix = 'bp-user-mgmt-';

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
}
