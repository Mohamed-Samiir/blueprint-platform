import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsisVertical, lucidePlus } from '@ng-icons/lucide';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import { HlmAlertDialog, HlmAlertDialogImports } from '@blueprint-platform/ui/alert-dialog';
import { HlmBadgeImports } from '@blueprint-platform/ui/badge';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInput } from '@blueprint-platform/ui/input';
import { HlmTableImports } from '@blueprint-platform/ui/table';
import type { Role } from '../../../../core/rbac/models';
import { usersForRole } from '../../../../core/rbac/mock-users.data';
import { RolesService } from '../../../../core/rbac/roles.service';

type DeleteOrDeactivate = 'delete' | 'deactivate';

/**
 * Roles table (Task 5.1): name, active/inactive (a read-only badge — the
 * actual toggle lives in the row actions dropdown, same pattern as
 * `user-menu`), assigned-user count (from `mock-users.data.ts`). Has its own
 * search box, independent of `permissions-list`'s and `role-form`'s.
 *
 * Delete and deactivate both warn *by name* when the role has assigned users
 * (5.5, 5.6) rather than a generic confirmation. "View assigned users" (5.7)
 * opens a plain list dialog — reusing `hlm-alert-dialog` rather than pulling in
 * `HlmDialogService`'s component-outlet API for a single read-only list.
 */
@Component({
  selector: 'app-roles-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    BrnAlertDialogContent,
    HlmAlertDialogImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmFieldImports,
    HlmInput,
    HlmTableImports,
  ],
  providers: [provideIcons({ lucideEllipsisVertical, lucidePlus })],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.scss',
})
export class RolesList {
  protected readonly rolesService = inject(RolesService);

  protected readonly query = signal('');
  protected readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.rolesService
      .roles()
      .filter(
        (r) =>
          !q || r.name.toLowerCase().includes(q) || (r.description ?? '').toLowerCase().includes(q),
      )
      .map((r) => ({ role: r, users: usersForRole(r.id) }));
  });

  /** Delete and deactivate share one dialog: same shape of warning, different verb/action. */
  protected readonly pendingAction = signal<{ role: Role; kind: DeleteOrDeactivate } | null>(null);
  private readonly actionDialog = viewChild.required<HlmAlertDialog>('actionDialog');

  protected readonly viewingUsersRole = signal<Role | null>(null);
  private readonly usersDialog = viewChild.required<HlmAlertDialog>('usersDialog');

  protected usersFor(role: Role) {
    return usersForRole(role.id);
  }

  protected openDelete(role: Role): void {
    this.pendingAction.set({ role, kind: 'delete' });
    this.actionDialog().open();
  }

  protected openDeactivate(role: Role): void {
    this.pendingAction.set({ role, kind: 'deactivate' });
    this.actionDialog().open();
  }

  protected activate(role: Role): void {
    // Re-activating hands permissions straight back — not destructive, no confirmation.
    this.rolesService.setActive(role.id, true);
  }

  protected confirmPendingAction(): void {
    const pending = this.pendingAction();
    if (!pending) return;
    if (pending.kind === 'delete') this.rolesService.deleteRole(pending.role.id);
    else this.rolesService.setActive(pending.role.id, false);
    this.pendingAction.set(null);
    this.actionDialog().close();
  }

  protected openUsers(role: Role): void {
    this.viewingUsersRole.set(role);
    this.usersDialog().open();
  }
}
