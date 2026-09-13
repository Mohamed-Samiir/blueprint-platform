import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsUpDown, lucideLogOut, lucideSettings, lucideUser } from '@ng-icons/lucide';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmAvatarImports } from '@blueprint-platform/ui/avatar';
import { BLUEPRINT_CONFIG } from '../../../core/config/template-config';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

/**
 * The one account dropdown, used in every layout (in the sidebar footer for
 * `sidebar` / `floating` / `inset`, in the top bar for `topbar`). Identical
 * component in all four placements — only the parent container differs.
 *
 * Placeholder items (Profile / Settings / Log out) plus the theme and language
 * switchers, each rendered only when enabled in `BLUEPRINT_CONFIG`.
 */
@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmDropdownMenuImports, HlmAvatarImports, ThemeSwitcher, LanguageSwitcher],
  providers: [provideIcons({ lucideChevronsUpDown, lucideUser, lucideSettings, lucideLogOut })],
  host: { class: 'block' },
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenu {
  protected readonly config = inject(BLUEPRINT_CONFIG);
  protected readonly user = { name: 'Dev User', email: 'dev@local', initials: 'DU' };
}
