import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInput } from '@blueprint-platform/ui/input';
import { HlmSpinner } from '@blueprint-platform/ui/spinner';
import { mockSendResetCode } from '../../../../core/auth/auth-mock.data';

/**
 * Forgot-password step 1 of 3 (route: `<layout>/auth/forgot-password/email`).
 * Requests a reset code, then navigates to the code step carrying `email` as a
 * query param. The mock always reports success (it never reveals whether an
 * account exists).
 */
@Component({
  selector: 'app-forgot-password-email-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButtonImports,
    HlmFieldImports,
    HlmInput,
    HlmSpinner,
  ],
  templateUrl: './forgot-password-email-form.html',
  styleUrl: './forgot-password-email-form.scss',
})
export class ForgotPasswordEmailForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pending = signal(false);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);

    const { email } = this.form.getRawValue();
    mockSendResetCode({ email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pending.set(false);
          void this.router.navigate(['../code'], {
            relativeTo: this.route,
            queryParams: { email },
          });
        },
        error: () => this.pending.set(false),
      });
  }
}
