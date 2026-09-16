import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import {
  HlmAlertDialog,
  HlmAlertDialogImports,
} from '@blueprint-platform/ui/alert-dialog';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmNativeSelectImports } from '@blueprint-platform/ui/native-select';
import { ROLE_OPTIONS } from '../../../core/user-management/role-options.data';
import type { ManagedUser } from '../../../core/user-management/models';
import { UserService } from '../../../core/user-management/user.service';

/**
 * Change-role dialog (Task 3.7): a role select + confirm, invoked from
 * `users-list`'s row actions. Built on `hlm-alert-dialog` rather than the
 * plain `hlm-dialog` primitive — behaviourally this is just a modal with a
 * control and a confirm button, and reusing the alert-dialog composition this
 * reference already has proven (see `deactivate-confirm`) is the lower-risk
 * choice over `hlm-dialog`'s separate `NgComponentOutlet`-based content API.
 */
@Component({
  selector: 'app-change-role-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BrnAlertDialogContent,
    HlmAlertDialogImports,
    HlmFieldImports,
    HlmNativeSelectImports,
  ],
  templateUrl: './change-role-dialog.html',
  styleUrl: './change-role-dialog.scss',
})
export class ChangeRoleDialog {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly changed = output<void>();

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly pendingUser = signal<ManagedUser | null>(null);
  protected readonly selectedRole = signal<string>(ROLE_OPTIONS[0]);
  private readonly dialog = viewChild.required<HlmAlertDialog>('dialog');

  open(user: ManagedUser): void {
    this.pendingUser.set(user);
    this.selectedRole.set(user.accountRole);
    this.dialog().open();
  }

  protected confirm(): void {
    const user = this.pendingUser();
    if (!user) return;
    this.userService
      .changeRole(user.id, this.selectedRole())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.pendingUser.set(null);
        this.dialog().close();
        this.changed.emit();
      });
  }
}
