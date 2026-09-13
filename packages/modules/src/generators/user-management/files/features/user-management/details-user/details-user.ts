import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import { HlmAlertDialog, HlmAlertDialogImports } from '@blueprint-platform/ui/alert-dialog';
import { HlmBadgeImports } from '@blueprint-platform/ui/badge';
import type { ManagedUser } from '../../../core/user-management/models';

/**
 * Read-only details view (Task 3.5) — a dialog, matching the list's own
 * action pattern (deactivate/change-role are also dialogs, not routes).
 * Shows every field, including the profile image at full preview size (not
 * just the list's thumbnail).
 */
@Component({
  selector: 'app-details-user',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrnAlertDialogContent, HlmAlertDialogImports, HlmBadgeImports],
  templateUrl: './details-user.html',
  styleUrl: './details-user.scss',
})
export class DetailsUser {
  protected readonly user = signal<ManagedUser | null>(null);
  private readonly dialog = viewChild.required<HlmAlertDialog>('dialog');

  open(user: ManagedUser): void {
    this.user.set(user);
    this.dialog().open();
  }
}
