import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import { HlmSidebarImports, HlmSidebarService } from '@blueprint-platform/ui/sidebar';
import { UserMenu } from '../../shared/ui/user-menu/user-menu';
import { LanguageService } from '../../core/language/language.service';

/**
 * Layout shell for spartan sidebar `variant="sidebar"` (the default flush,
 * full-height sidebar). Deliberately a standalone copy — no shared base class
 * with the floating / inset shells, so a generated project can edit one freely.
 *
 * The side menu ships with exactly one real item — Welcome, wired to the root
 * route — instead of the spartan demo kit's placeholder nav (Dashboard /
 * Projects / Reports / Settings, plus the links/variants/badges/submenu/
 * collapsible/skeleton demo groups below it). Platform-only cleanup, no
 * `blueprint-reference` equivalent — see CLAUDE.md. `collapsible="icon"` is
 * still demonstrated via the header logo's collapsed-size swap and the
 * collapsed-rail scroll fix; the flyout-for-children machinery the old nav
 * array needed is gone along with the only item that had children.
 */
@Component({
  selector: 'app-sidebar-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgIcon, HlmSidebarImports, UserMenu],
  providers: [provideIcons({ lucideHouse })],
  templateUrl: './sidebar-shell.html',
  styleUrl: './sidebar-shell.scss',
})
export class SidebarShell {
  private readonly _lang = inject(LanguageService);
  /** spartan's `side` is a physical anchor and does not auto-flip under RTL. */
  protected readonly side = computed<'left' | 'right'>(() =>
    this._lang.dir() === 'rtl' ? 'right' : 'left',
  );

  protected readonly sidebar = inject(HlmSidebarService);
  protected readonly collapsed = computed(
    () => this.sidebar.state() === 'collapsed' && !this.sidebar.isMobile(),
  );
}
