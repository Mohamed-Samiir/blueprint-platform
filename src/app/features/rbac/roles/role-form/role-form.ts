import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import { HlmAlertImports } from '@blueprint-platform/ui/alert';
import {
  HlmAlertDialog,
  HlmAlertDialogImports,
} from '@blueprint-platform/ui/alert-dialog';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmCheckboxImports } from '@blueprint-platform/ui/checkbox';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInput } from '@blueprint-platform/ui/input';
import { HlmSwitchImports } from '@blueprint-platform/ui/switch';
import { HlmTextareaImports } from '@blueprint-platform/ui/textarea';
import type { Permission } from '../../../../core/rbac/models';
import {
  resolveDependencies,
  resolveDependents,
} from '../../../../core/rbac/permission-graph';
import { PermissionsService } from '../../../../core/rbac/permissions.service';
import { RolesService } from '../../../../core/rbac/roles.service';

interface PendingUncheck {
  permission: Permission;
  dependents: Permission[];
}

/**
 * Shared add/edit form for a role (route: `roles/new` or `roles/:id/edit`) —
 * name, description, active switch, and a permission picker: checkboxes
 * grouped by module (Task 5.2, same `PermissionsService.groupedByModule`
 * grouping `permissions-list` uses), with its own search box (Task's third
 * required search location — independent of `permissions-list`'s).
 *
 * Two cascade rules:
 * - **Check** (5.3): auto-selects anything the checked permission requires,
 *   transitively, and shows a brief inline notice — assistive, not blocking.
 * - **Uncheck** (5.4): if another *currently-selected* permission in this form
 *   depends on the one being unchecked, blocks with a confirmation dialog
 *   before also unchecking those dependents. This mirrors the check-side rule;
 *   it wasn't spelled out explicitly in the spec but is the logically
 *   consistent behaviour given 5.3 — see `RBAC_MODULE_SYNC_SUMMARY.md`.
 */
@Component({
  selector: 'app-role-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BrnAlertDialogContent,
    HlmAlertImports,
    HlmAlertDialogImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmInput,
    HlmSwitchImports,
    HlmTextareaImports,
  ],
  templateUrl: './role-form.html',
  styleUrl: './role-form.scss',
})
export class RoleForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly permissionsService = inject(PermissionsService);
  private readonly rolesService = inject(RolesService);

  private readonly editId: string | null =
    this.route.snapshot.paramMap.get('id');
  private readonly editing = this.rolesService
    .roles()
    .find((r) => r.id === this.editId);
  protected readonly isEditMode = this.editing !== undefined;

  protected readonly form = this.fb.group({
    name: [this.editing?.name ?? '', [Validators.required]],
    description: [this.editing?.description ?? ''],
    active: [this.editing?.active ?? true],
  });

  protected readonly selected = signal<ReadonlySet<string>>(
    new Set(this.editing?.permissionIds ?? []),
  );
  protected readonly notice = signal<string | null>(null);
  protected readonly query = signal('');

  protected readonly groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.permissionsService
      .groupedByModule()
      .map(({ module, permissions }) => ({
        module,
        rows: permissions
          .filter(
            (p) =>
              !q ||
              p.label.toLowerCase().includes(q) ||
              p.key.toLowerCase().includes(q),
          )
          .map((p) => ({ permission: p, checked: this.selected().has(p.id) })),
      }))
      .filter((g) => g.rows.length > 0);
  });

  protected readonly pendingUncheck = signal<PendingUncheck | null>(null);
  private readonly uncheckDialog =
    viewChild.required<HlmAlertDialog>('uncheckDialog');

  protected onToggle(permission: Permission, checked: boolean): void {
    const all = this.permissionsService.permissions();

    if (checked) {
      const required = resolveDependencies(permission.id, all);
      const missing = required.filter((p) => !this.selected().has(p.id));
      const next = new Set(this.selected());
      next.add(permission.id);
      for (const dep of missing) next.add(dep.id);
      this.selected.set(next);
      this.notice.set(
        missing.length > 0
          ? `Also selected: ${missing.map((p) => p.label).join(', ')} — required by ${permission.label}.`
          : null,
      );
      return;
    }

    // Unchecking: block if a currently-selected permission depends on this one.
    const dependents = resolveDependents(permission.id, all).filter((p) =>
      this.selected().has(p.id),
    );
    if (dependents.length > 0) {
      this.pendingUncheck.set({ permission, dependents });
      this.uncheckDialog().open();
      return;
    }
    const next = new Set(this.selected());
    next.delete(permission.id);
    this.selected.set(next);
    this.notice.set(null);
  }

  protected confirmUncheck(): void {
    const pending = this.pendingUncheck();
    if (!pending) return;
    const removeIds = new Set([
      pending.permission.id,
      ...pending.dependents.map((p) => p.id),
    ]);
    const next = new Set(this.selected());
    for (const id of removeIds) next.delete(id);
    this.selected.set(next);
    this.notice.set(null);
    this.pendingUncheck.set(null);
    this.uncheckDialog().close();
  }

  protected cancelUncheck(): void {
    this.pendingUncheck.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, description, active } = this.form.getRawValue();
    this.rolesService.saveRole(
      { name, description, active, permissionIds: [...this.selected()] },
      this.editId ?? undefined,
    );
    void this.router.navigate(this.isEditMode ? ['..', '..'] : ['..'], {
      relativeTo: this.route,
    });
  }
}
