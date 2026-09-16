import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../core/user-management/user.service';
import { UserForm, UserFormValue } from '../user-form/user-form';

/** Thin host for `UserForm` in `add` mode (Task 3.3). */
@Component({
  selector: 'app-add-user',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserForm],
  templateUrl: './add-user.html',
  styleUrl: './add-user.scss',
})
export class AddUser {
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected onSubmitted(value: UserFormValue): void {
    this.userService
      .create(value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        () => void this.router.navigate(['..'], { relativeTo: this.route }),
      );
  }
}
