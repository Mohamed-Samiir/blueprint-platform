import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmAlertImports } from '@blueprint-platform/ui/alert';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmCheckboxImports } from '@blueprint-platform/ui/checkbox';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInput } from '@blueprint-platform/ui/input';
import { HlmNativeSelectImports } from '@blueprint-platform/ui/native-select';
import { PermissionsService } from '../../../../core/rbac/permissions.service';
import { wouldCreateCycle } from '../../../../core/rbac/permission-graph';

const NEW_MODULE = '__new__';
/** Sentinel `dependsOn` cycle-check id for a not-yet-created permission — nothing can already depend on it. */
const NEW_PERMISSION = '__new-permission__';

/**
 * Shared add/edit form for a permission (route: `permissions/new` or
 * `permissions/:id/edit`). Module select-or-create, label/key, and a
 * checkbox multi-select for `dependsOn` — grouped by module (via
 * `PermissionsService.groupedByModule`, the same grouping `permissions-list`
 * and `role-form`'s picker use), search-filterable, and self / cycle-causing
 * candidates are disabled rather than hidden so it's clear *why* they're
 * unavailable.
 */
@Component({
  selector: 'app-permission-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmAlertImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmInput,
    HlmNativeSelectImports,
  ],
  templateUrl: './permission-form.html',
  styleUrl: './permission-form.scss',
})
export class PermissionForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly permissionsService = inject(PermissionsService);

  protected readonly newModuleSentinel = NEW_MODULE;

  private readonly editId: string | null = this.route.snapshot.paramMap.get('id');
  private readonly editing = this.permissionsService
    .permissions()
    .find((p) => p.id === this.editId);

  protected readonly isEditMode = this.editing !== undefined;

  protected readonly form = this.fb.group({
    moduleId: [this.editing?.moduleId ?? '', [Validators.required]],
    newModuleName: [''],
    key: [
      this.editing?.key ?? '',
      [Validators.required, Validators.pattern(/^[a-z0-9]+(\.[a-z0-9-]+)+$/)],
    ],
    label: [this.editing?.label ?? '', [Validators.required]],
    isModuleRoot: [this.editing?.isModuleRoot ?? false],
  });

  protected readonly dependsOn = signal<ReadonlySet<string>>(
    new Set(this.editing?.dependsOn ?? []),
  );
  protected readonly query = signal('');

  private readonly currentId = this.editId ?? NEW_PERMISSION;

  /** Grouped candidates for `dependsOn`, filtered by `query`, each flagged with why it's (un)selectable. */
  protected readonly dependencyGroups = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.permissionsService.permissions();
    return this.permissionsService
      .groupedByModule()
      .map(({ module, permissions }) => ({
        module,
        rows: permissions
          .filter((p) => p.id !== this.currentId)
          .filter((p) => !q || p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q))
          .map((p) => ({
            permission: p,
            checked: this.dependsOn().has(p.id),
            disabledByCycle:
              !this.dependsOn().has(p.id) && wouldCreateCycle(this.currentId, p.id, all),
          })),
      }))
      .filter((g) => g.rows.length > 0);
  });

  protected toggleDependency(id: string, checked: boolean): void {
    const next = new Set(this.dependsOn());
    if (checked) next.add(id);
    else next.delete(id);
    this.dependsOn.set(next);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { moduleId, newModuleName, key, label, isModuleRoot } = this.form.getRawValue();
    const resolvedModuleId =
      moduleId === NEW_MODULE
        ? this.permissionsService.addModule(newModuleName || 'Untitled module').id
        : moduleId;

    this.permissionsService.savePermission(
      { moduleId: resolvedModuleId, key, label, isModuleRoot, dependsOn: [...this.dependsOn()] },
      this.editId ?? undefined,
    );
    void this.router.navigate(this.isEditMode ? ['..', '..'] : ['..'], { relativeTo: this.route });
  }
}
