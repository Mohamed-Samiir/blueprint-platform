import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCamera,
  lucideCircleAlert,
  lucideMail,
  lucideUser,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmCardImports } from '@blueprint-platform/ui/card';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInputGroupImports } from '@blueprint-platform/ui/input-group';
import { HlmNativeSelectImports } from '@blueprint-platform/ui/native-select';
import { HlmSwitchImports } from '@blueprint-platform/ui/switch';
import { ROLE_OPTIONS } from '../../../core/user-management/role-options.data';
import type { ManagedUser } from '../../../core/user-management/models';

export interface UserFormValue {
  username: string;
  email: string;
  profileImage: string | null;
  accountRole: string;
  status: ManagedUser['status'];
}

/**
 * Shared add/edit field markup (Task 3.2) — `add-user` and `edit-user` are
 * thin hosts around this, so the field set exists exactly once. Status is only
 * rendered as an editable toggle in `edit` mode; a brand-new user's default
 * status is a product decision this reference made — `'active'` — since
 * nothing in the task list specified one.
 *
 * The profile-photo editor is a big (`size-28`) circular preview with the
 * upload/remove actions overlaid directly on the image, and the real
 * `<input type="file">` is visually hidden — triggered via a template
 * reference (`#fileInput`), not spartan's small `hlm-avatar` (which has no
 * upload/edit behaviour to begin with, so building this presentation around a
 * plain image isn't duplicating anything spartan already provides). The file
 * is read client-side via `FileReader` into a base64 data URL for the preview,
 * and that's exactly what gets persisted — a mock-only convenience (see
 * `USER_MANAGEMENT_SYNC_SUMMARY.md` for the real-backend caveat).
 */
@Component({
  selector: 'app-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    HlmButtonImports,
    HlmCardImports,
    HlmFieldImports,
    HlmInputGroupImports,
    HlmNativeSelectImports,
    HlmSwitchImports,
  ],
  providers: [
    provideIcons({
      lucideCamera,
      lucideCircleAlert,
      lucideMail,
      lucideUser,
      lucideX,
    }),
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly mode = input.required<'add' | 'edit'>();
  readonly initialUser = input<ManagedUser | null>(null);
  readonly submitted = output<UserFormValue>();

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly profileImage = signal<string | null>(
    this.initialUser()?.profileImage ?? null,
  );

  protected readonly form = this.fb.group({
    username: [this.initialUser()?.username ?? '', [Validators.required]],
    email: [
      this.initialUser()?.email ?? '',
      [Validators.required, Validators.email],
    ],
    accountRole: [
      this.initialUser()?.accountRole ?? ROLE_OPTIONS[0],
      [Validators.required],
    ],
    // `hlm-switch` is boolean; translated to/from ManagedUser['status'] at the edges.
    active: [this.initialUser()?.status !== 'inactive'],
  });

  protected readonly initials = computed(() => {
    const name = this.form.controls.username.value.trim();
    return name ? name.slice(0, 2).toUpperCase() : '?';
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.profileImage.set(
        typeof reader.result === 'string' ? reader.result : null,
      );
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected removeImage(): void {
    this.profileImage.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, email, accountRole, active } = this.form.getRawValue();
    this.submitted.emit({
      username,
      email,
      accountRole,
      status: this.mode() === 'edit' && !active ? 'inactive' : 'active',
      profileImage: this.profileImage(),
    });
  }
}
