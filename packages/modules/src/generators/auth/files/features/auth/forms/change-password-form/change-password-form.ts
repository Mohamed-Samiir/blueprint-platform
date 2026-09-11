import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { HlmAlertImports } from '@blueprint-platform/ui/alert';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInputGroupImports } from '@blueprint-platform/ui/input-group';
import { HlmSpinner } from '@blueprint-platform/ui/spinner';
import { mockChangePassword } from '../../../../core/auth/auth-mock.data';
import { passwordsMatchValidator } from '../password-match.validator';

/** Signed-in user's email; a real app reads this from the active session. */
const CURRENT_USER_EMAIL = 'demo@blueprint.dev';

/**
 * Change password for an **already-authenticated** user (route:
 * `<layout>/auth/change-password`) — current + new + confirm. Not a step of
 * the anonymous forgot-password flow (that one uses email + code); the
 * `currentPassword` field and the naming keep the two distinct. All three
 * password fields use the same `hlm-input-group` markup as the rest of the module.
 */
@Component({
  selector: 'app-change-password-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmAlertImports,
    HlmButtonImports,
    HlmFieldImports,
    HlmInputGroupImports,
    HlmSpinner,
  ],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './change-password-form.html',
  styleUrl: './change-password-form.scss',
})
export class ChangePasswordForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly showCurrent = signal(false);
  protected readonly showNew = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly form = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatchValidator('newPassword', 'confirmPassword')] },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.serverError.set(null);
    this.done.set(false);

    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    mockChangePassword(CURRENT_USER_EMAIL, { currentPassword, newPassword, confirmPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pending.set(false);
          this.done.set(true);
          this.form.reset();
        },
        error: (err: Error) => {
          this.pending.set(false);
          this.serverError.set(err.message);
        },
      });
  }
}
