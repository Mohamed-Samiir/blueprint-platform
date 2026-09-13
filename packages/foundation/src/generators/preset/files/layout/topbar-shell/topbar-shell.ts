import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import { HlmSidebarImports, HlmSidebarService } from '@blueprint-platform/ui/sidebar';
import { UserMenu } from '../../shared/ui/user-menu/user-menu';
import { LanguageService } from '../../core/language/language.service';

/**
 * Fourth layout shell: spartan sidebar `variant="sidebar"` (icon-collapsible,
 * like `sidebar-shell`) plus a **top bar** inside the content pane.
 *
 * The top bar hosts the sidebar collapse trigger and the shared `<app-user-menu>`
 * (which carries the theme + language switchers). Direction and palette are
 * global (`<html>`, via `ThemeService` / `LanguageService`) — this shell no
 * longer owns that state itself. Deliberately a standalone copy — no shared base
 * class with the other shells.
 *
 * The side menu ships with exactly one real item — Welcome, wired to the root
 * route — instead of the spartan demo kit's placeholder nav (Dashboard /
 * Projects / Reports / Settings, plus the links/variants/badges/submenu/
 * collapsible/skeleton demo groups below it). Platform-only cleanup, no
 * `blueprint-reference` equivalent — see CLAUDE.md. The flyout-for-children
 * machinery the old nav array needed is gone along with the only item that
 * had children.
 */
@Component({
  selector: 'app-topbar-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgIcon, HlmSidebarImports, UserMenu],
  providers: [provideIcons({ lucideHouse })],
  templateUrl: './topbar-shell.html',
  styleUrl: './topbar-shell.scss',
})
export class TopbarShell {
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
