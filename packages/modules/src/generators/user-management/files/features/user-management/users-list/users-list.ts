import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsisVertical, lucidePlus } from '@ng-icons/lucide';
import { HlmAvatarImports } from '@blueprint-platform/ui/avatar';
import { HlmBadgeImports } from '@blueprint-platform/ui/badge';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmTableImports } from '@blueprint-platform/ui/table';
import type { ManagedUser } from '../../../core/user-management/models';
import { UserService } from '../../../core/user-management/user.service';
import { ChangeRoleDialog } from '../change-role-dialog/change-role-dialog';
import { DeactivateConfirm } from '../deactivate-confirm/deactivate-confirm';
import { DetailsUser } from '../details-user/details-user';

/**
 * Users table (Task 3.1): profile-image thumbnail (`hlm-avatar`, falls back to
 * initials), username, email, account role, status badge, and a row-actions
 * dropdown (same pattern as `user-menu` / RBAC's `roles-list`) — View details,
 * Edit, Change role, Deactivate/Activate (label swaps on current status).
 *
 * The three dialogs (details / deactivate-confirm / change-role) are each
 * their own component, opened imperatively via `viewChild(...).open(user)`.
 */
@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    HlmAvatarImports,
    HlmBadgeImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmTableImports,
    ChangeRoleDialog,
    DeactivateConfirm,
    DetailsUser,
  ],
  providers: [provideIcons({ lucideEllipsisVertical, lucidePlus })],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersList {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users = signal<ManagedUser[]>([]);

  private readonly detailsDialog = viewChild.required<DetailsUser>('detailsDialog');
  private readonly deactivateDialog = viewChild.required<DeactivateConfirm>('deactivateDialog');
  private readonly changeRoleDialog = viewChild.required<ChangeRoleDialog>('changeRoleDialog');

  constructor() {
    this.reload();
  }

  protected initials(username: string): string {
    return username.trim() ? username.trim().slice(0, 2).toUpperCase() : '?';
  }

  protected openDetails(user: ManagedUser): void {
    this.detailsDialog().open(user);
  }

  protected openDeactivate(user: ManagedUser): void {
    this.deactivateDialog().open(user);
  }

  protected openChangeRole(user: ManagedUser): void {
    this.changeRoleDialog().open(user);
  }

  protected reload(): void {
    this.userService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => this.users.set(users));
  }
}
