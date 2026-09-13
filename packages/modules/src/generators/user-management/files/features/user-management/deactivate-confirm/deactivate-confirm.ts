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
import { HlmAlertDialog, HlmAlertDialogImports } from '@blueprint-platform/ui/alert-dialog';
import type { ManagedUser } from '../../../core/user-management/models';
import { UserService } from '../../../core/user-management/user.service';

/**
 * Deactivate/activate confirmation (Task 3.6). No generic confirm-dialog
 * utility exists outside `core/rbac` (whose delete/deactivate dialogs are
 * inline in `roles-list`, not a reusable component) — per this module's hard
 * rule, built fresh here rather than imported.
 *
 * Opened imperatively from `users-list` via `viewChild(...).open(user)`,
 * mirroring the pattern this reference settled on for RBAC's alert-dialogs
 * (`viewChild().open()`/`.close()` rather than a `[state]` binding, which can
 * desync from a backdrop/Escape dismiss).
 */
@Component({
  selector: 'app-deactivate-confirm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrnAlertDialogContent, HlmAlertDialogImports],
  templateUrl: './deactivate-confirm.html',
  styleUrl: './deactivate-confirm.scss',
})
export class DeactivateConfirm {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly changed = output<void>();

  protected readonly pendingUser = signal<ManagedUser | null>(null);
  private readonly dialog = viewChild.required<HlmAlertDialog>('dialog');

  open(user: ManagedUser): void {
    this.pendingUser.set(user);
    this.dialog().open();
  }

  protected confirm(): void {
    const user = this.pendingUser();
    if (!user) return;
    const action$ =
      user.status === 'active'
        ? this.userService.deactivate(user.id)
        : this.userService.activate(user.id);
    action$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pendingUser.set(null);
      this.dialog().close();
      this.changed.emit();
    });
  }
}
