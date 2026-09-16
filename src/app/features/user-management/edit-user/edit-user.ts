import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { ManagedUser } from '../../../core/user-management/models';
import { UserService } from '../../../core/user-management/user.service';
import { UserForm, UserFormValue } from '../user-form/user-form';

/**
 * Thin host for `UserForm` in `edit` mode (Task 3.4), pre-populated via
 * `UserService.getById`. `<app-user-form>` only renders once `user()` resolves
 * (see its template) so the form's fields are seeded correctly on first
 * construction rather than racing the async fetch.
 */
@Component({
  selector: 'app-edit-user',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserForm],
  templateUrl: './edit-user.html',
  styleUrl: './edit-user.scss',
})
export class EditUser {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly userId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly user = signal<ManagedUser | null>(null);
  protected readonly notFound = signal(false);

  constructor() {
    this.userService
      .getById(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user) this.user.set(user);
        else this.notFound.set(true);
      });
  }

  protected onSubmitted(value: UserFormValue): void {
    this.userService
      .update(this.userId, value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        () =>
          void this.router.navigate(['..', '..'], { relativeTo: this.route }),
      );
  }
}
