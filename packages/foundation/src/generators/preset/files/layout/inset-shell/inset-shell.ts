import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import { HlmSidebarImports } from '@blueprint-platform/ui/sidebar';
import { UserMenu } from '../../shared/ui/user-menu/user-menu';
import { LanguageService } from '../../core/language/language.service';

/**
 * Layout shell for spartan sidebar `variant="inset"` (the content pane is inset
 * as a rounded, shadowed card floating on the `--sidebar` coloured gutter).
 * Deliberately a standalone copy — no shared base class with the sidebar /
 * floating shells.
 *
 * The side menu ships with exactly one real item — Welcome, wired to the root
 * route — instead of the spartan demo kit's placeholder links/badges/submenu/
 * collapsible/skeleton demo groups. Platform-only cleanup, no
 * `blueprint-reference` equivalent — see CLAUDE.md.
 */
@Component({
  selector: 'app-inset-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgIcon, HlmSidebarImports, UserMenu],
  providers: [provideIcons({ lucideHouse })],
  templateUrl: './inset-shell.html',
  styleUrl: './inset-shell.scss',
})
export class InsetShell {
  private readonly _lang = inject(LanguageService);
  /** spartan's `side` is a physical anchor and does not auto-flip under RTL. */
  protected readonly side = computed<'left' | 'right'>(() =>
    this._lang.dir() === 'rtl' ? 'right' : 'left',
  );
}
