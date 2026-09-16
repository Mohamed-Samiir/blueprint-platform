import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus, lucideSearch, lucideTrash2 } from '@ng-icons/lucide';
import { HlmAlertDialog, HlmAlertDialogImports } from '@blueprint-platform/ui/alert-dialog';
import { BrnAlertDialogContent } from '@spartan-ng/brain/alert-dialog';
import { HlmAccordionImports } from '@blueprint-platform/ui/accordion';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmFieldImports } from '@blueprint-platform/ui/field';
import { HlmInput } from '@blueprint-platform/ui/input';
import type { Permission } from '../../models/models';
import { resolveDependents } from '../../../../core/rbac/permission-graph';
import { PermissionsService } from '../../services/permissions.service';
import { RolesService } from '../../services/roles.service';

/**
 * The implied-but-unstated permissions list (Task 4.1) — module name as a
 * group header (spartan accordion), its permissions listed under it, edit /
 * delete icon buttons per row. Has its own search box (frontend-only, filters
 * the already-loaded arrays — no fetch), independent of the search box inside
 * `role-form`'s permission picker.
 *
 * Deleting cascades: Task 4.3's warning dialog lists every permission that
 * would also be removed (`resolveDependents`), requires explicit confirmation,
 * and — since a removed permission id must not linger in any role — the
 * confirm handler also tells `RolesService` to prune it everywhere.
 */
@Component({
  selector: 'app-permissions-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgIcon,
    HlmAccordionImports,
    HlmAlertDialogImports,
    BrnAlertDialogContent,
    HlmButtonImports,
    HlmFieldImports,
    HlmInput,
  ],
  providers: [provideIcons({ lucidePencil, lucidePlus, lucideSearch, lucideTrash2 })],
  templateUrl: './permissions-list.html',
  styleUrl: './permissions-list.scss',
})
export class PermissionsList {
  protected readonly permissionsService = inject(PermissionsService);
  private readonly rolesService = inject(RolesService);

  protected readonly query = signal('');
  private readonly expandedModuleIds = signal<ReadonlySet<string>>(
    new Set(this.permissionsService.modules().map((m) => m.id)),
  );

  protected readonly groups = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.permissionsService
      .groupedByModule()
      .map(({ module, permissions }) => ({
        module,
        permissions: q
          ? permissions.filter(
              (p) => p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
            )
          : permissions,
      }))
      .filter((g) => g.permissions.length > 0);
  });

  protected isExpanded(moduleId: string): boolean {
    return this.query().trim().length > 0 || this.expandedModuleIds().has(moduleId);
  }

  protected setExpanded(moduleId: string, opened: boolean): void {
    const next = new Set(this.expandedModuleIds());
    if (opened) next.add(moduleId);
    else next.delete(moduleId);
    this.expandedModuleIds.set(next);
  }

  protected readonly pendingDelete = signal<Permission | null>(null);
  protected readonly pendingDependents = computed(() => {
    const target = this.pendingDelete();
    return target ? resolveDependents(target.id, this.permissionsService.permissions()) : [];
  });

  private readonly deleteDialog = viewChild.required<HlmAlertDialog>('deleteDialog');

  protected openDelete(permission: Permission): void {
    this.pendingDelete.set(permission);
    this.deleteDialog().open();
  }

  protected confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    const removed = this.permissionsService.deletePermissionCascade(target.id);
    this.rolesService.removePermissionIds(removed.map((p) => p.id));
    this.pendingDelete.set(null);
    this.deleteDialog().close();
  }
}
