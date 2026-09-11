import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { HlmAlertImports } from '@blueprint-platform/ui/alert';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInput } from '@blueprint-platform/ui/input';
import { HlmInputGroupImports } from '@blueprint-platform/ui/input-group';
import { HlmSpinner } from '@blueprint-platform/ui/spinner';
import { mockRegister } from '../../../../core/auth/auth-mock.data';
import { passwordsMatchValidator } from '../password-match.validator';

type SocialProvider = 'google' | 'microsoft';

/**
 * Create-account form (route: `<layout>/signup`). Registration has no
 * token/session side effect, so it calls the mock backend directly (login is the
 * only flow that owns persisted state). `confirmPassword` carries a `mismatch`
 * error from the group validator whenever it diverges from `password`. Password
 * fields use the same `hlm-input-group` markup as every other form.
 */
@Component({
  selector: 'app-signup-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmAlertImports,
    HlmButtonImports,
    HlmFieldImports,
    HlmInput,
    HlmInputGroupImports,
    HlmSpinner,
  ],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './signup-form.html',
  styleUrl: './signup-form.scss',
})
export class SignupForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordsMatchValidator('password', 'confirmPassword')] },
  );

  protected socialLogin(provider: SocialProvider): void {
    console.info(`[auth] mock social login: ${provider}`);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.serverError.set(null);
    this.done.set(false);

    mockRegister(this.form.getRawValue())
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
