import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { HlmAlertImports } from '@blueprint-platform/ui/alert';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInputGroupImports } from '@blueprint-platform/ui/input-group';
import { HlmSpinner } from '@blueprint-platform/ui/spinner';
import { mockResetPassword } from '../../../../core/auth/auth-mock.data';
import { passwordsMatchValidator } from '../password-match.validator';

/**
 * Forgot-password step 3 of 3 (route: `<layout>/auth/forgot-password/new`).
 * `email` and `code` arrive as query params from the earlier steps; opened
 * directly the mock rejects the blank code, which is a fine way to see the
 * error state. Same `mismatch` validation and password-field markup as
 * signup / change-password.
 */
@Component({
  selector: 'app-forgot-password-new-password-form',
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
  templateUrl: './forgot-password-new-password-form.html',
  styleUrl: './forgot-password-new-password-form.scss',
})
export class ForgotPasswordNewPasswordForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  private readonly code = this.route.snapshot.queryParamMap.get('code') ?? '';

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly showNew = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly form = this.fb.group(
    {
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

    const { newPassword, confirmPassword } = this.form.getRawValue();
    mockResetPassword({ email: this.email, code: this.code, newPassword, confirmPassword })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pending.set(false);
          this.done.set(true);
        },
        error: (err: Error) => {
          this.pending.set(false);
          this.serverError.set(err.message);
        },
      });
  }
}
