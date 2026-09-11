import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmAlertImports } from '@blueprint-platform/ui/alert';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInput } from '@blueprint-platform/ui/input';
import { HlmSpinner } from '@blueprint-platform/ui/spinner';
import { mockVerifyResetCode } from '../../../../core/auth/auth-mock.data';

/**
 * Forgot-password step 2 of 3 (route: `<layout>/auth/forgot-password/code`).
 * Verifies the 6-digit code, then navigates to the new-password step carrying
 * `email` and `code` as query params.
 *
 * Plain numeric field. Spartan's `input-otp` primitive (`@blueprint-platform/ui/input-otp`)
 * could be swapped in later; wiring brain's per-slot render template is left to you.
 */
@Component({
  selector: 'app-forgot-password-code-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    HlmAlertImports,
    HlmButtonImports,
    HlmFieldImports,
    HlmInput,
    HlmSpinner,
  ],
  templateUrl: './forgot-password-code-form.html',
  styleUrl: './forgot-password-code-form.scss',
})
export class ForgotPasswordCodeForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  protected readonly target = this.email ? `to ${this.email}` : 'to your email';

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.serverError.set(null);

    const { code } = this.form.getRawValue();
    mockVerifyResetCode({ email: this.email, code })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pending.set(false);
          void this.router.navigate(['../new'], {
            relativeTo: this.route,
            queryParams: { email: this.email, code },
          });
        },
        error: (err: Error) => {
          this.pending.set(false);
          this.serverError.set(err.message);
        },
      });
  }
}
