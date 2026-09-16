import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MOCK_MANAGED_USERS } from '../../../core/user-management/user-mock.data';
import type { ManagedUser } from '../models/models';
import { userManagementId } from '../../../core/user-management/user-id';
import { UserStorage } from '../../../core/user-management/user-storage';

const USERS_KEY = 'users';
/** Artificial round-trip latency, matching the auth/RBAC mock pattern. */
const LATENCY = 400;

function ok<T>(value: T): Observable<T> {
  return of(value).pipe(delay(LATENCY));
}

function fail<T>(message: string): Observable<T> {
  return new Observable<T>((subscriber) => {
    const handle = setTimeout(() => subscriber.error(new Error(message)), LATENCY);
    return () => clearTimeout(handle);
  });
}

/**
 * Mock-backed CRUD for `ManagedUser`, over `UserStorage`. Seeds
 * `user-mock.data.ts` into storage on first run. Zero dependency on
 * `core/auth` / `core/rbac` — this module's hard rule.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly storage = inject(UserStorage);

  private readonly _users = signal<ManagedUser[]>(
    this.storage.read<ManagedUser[]>(USERS_KEY) ?? MOCK_MANAGED_USERS,
  );

  constructor() {
    if (this.storage.read(USERS_KEY) === null) {
      this.storage.write(USERS_KEY, this._users());
    }
  }

  list(): Observable<ManagedUser[]> {
    return ok([...this._users()]);
  }

  getById(id: string): Observable<ManagedUser | undefined> {
    return ok(this._users().find((u) => u.id === id));
  }

  create(input: Omit<ManagedUser, 'id'>): Observable<ManagedUser> {
    const user: ManagedUser = { ...input, id: userManagementId('um') };
    this._users.update((all) => [...all, user]);
    this.persist();
    return ok(user);
  }

  update(id: string, changes: Partial<ManagedUser>): Observable<ManagedUser> {
    const existing = this._users().find((u) => u.id === id);
    if (!existing) return fail(`No user with id "${id}".`);
    const updated: ManagedUser = { ...existing, ...changes, id };
    this._users.update((all) => all.map((u) => (u.id === id ? updated : u)));
    this.persist();
    return ok(updated);
  }

  /** Sets status to `'inactive'`. */
  deactivate(id: string): Observable<void> {
    return this.setStatus(id, 'inactive');
  }

  /** Sets status to `'active'` — the deactivate action's natural inverse. */
  activate(id: string): Observable<void> {
    return this.setStatus(id, 'active');
  }

  changeRole(id: string, newRole: string): Observable<void> {
    const existing = this._users().find((u) => u.id === id);
    if (!existing) return fail(`No user with id "${id}".`);
    this._users.update((all) => all.map((u) => (u.id === id ? { ...u, accountRole: newRole } : u)));
    this.persist();
    return ok(undefined);
  }

  private setStatus(id: string, status: ManagedUser['status']): Observable<void> {
    const existing = this._users().find((u) => u.id === id);
    if (!existing) return fail(`No user with id "${id}".`);
    this._users.update((all) => all.map((u) => (u.id === id ? { ...u, status } : u)));
    this.persist();
    return ok(undefined);
  }

  private persist(): void {
    this.storage.write(USERS_KEY, this._users());
  }
}
