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
  template: `
    <button
      type="button"
      class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md p-2 text-start text-sm outline-none focus-visible:ring-2"
      [hlmDropdownMenuTrigger]="menu"
      align="end"
      side="top"
    >
      <hlm-avatar class="size-8 rounded-lg">
        <span hlmAvatarFallback>{{ user.initials }}</span>
      </hlm-avatar>
      <span class="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
        <span class="truncate font-semibold">{{ user.name }}</span>
        <span class="text-muted-foreground truncate text-xs">{{ user.email }}</span>
      </span>
      <ng-icon
        name="lucideChevronsUpDown"
        class="ms-auto size-4 group-data-[collapsible=icon]:hidden"
      />
    </button>

    <ng-template #menu>
      <hlm-dropdown-menu class="w-60">
        <div hlmDropdownMenuLabel class="font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5">
            <hlm-avatar class="size-8 rounded-lg">
              <span hlmAvatarFallback>{{ user.initials }}</span>
            </hlm-avatar>
            <div class="grid flex-1 leading-tight">
              <span class="truncate text-sm font-semibold">{{ user.name }}</span>
              <span class="text-muted-foreground truncate text-xs">{{ user.email }}</span>
            </div>
          </div>
        </div>

        @if (config.showThemeSwitcher || config.showLanguageSwitcher) {
          <hlm-dropdown-menu-separator />
          @if (config.showThemeSwitcher) {
            <div class="px-2 py-1.5" (click)="$event.stopPropagation()">
              <app-theme-switcher />
            </div>
          }
          @if (config.showLanguageSwitcher) {
            <div class="px-2 py-1.5" (click)="$event.stopPropagation()">
              <app-language-switcher />
            </div>
          }
        }

        <hlm-dropdown-menu-separator />
        <button hlmDropdownMenuItem>
          <ng-icon name="lucideUser" />
          Profile
        </button>
        <button hlmDropdownMenuItem>
          <ng-icon name="lucideSettings" />
          Settings
        </button>
        <hlm-dropdown-menu-separator />
        <button hlmDropdownMenuItem>
          <ng-icon name="lucideLogOut" />
          Log out
        </button>
      </hlm-dropdown-menu>
    </ng-template>
  `,
})
export class UserMenu {
  protected readonly config = inject(BLUEPRINT_CONFIG);
  protected readonly user = { name: 'Dev User', email: 'dev@local', initials: 'DU' };
}
