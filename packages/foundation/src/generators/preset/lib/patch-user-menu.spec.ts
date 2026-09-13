import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { patchUserMenu } from './patch-user-menu';

const USER_MENU_TS = `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronsUpDown, lucideLogOut, lucideSettings, lucideUser } from '@ng-icons/lucide';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmAvatarImports } from '@blueprint-platform/ui/avatar';
import { BLUEPRINT_CONFIG } from '../../../core/config/template-config';
import { ThemeSwitcher } from '../theme-switcher/theme-switcher';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

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
`;

const USER_MENU_HTML = `<button type="button">trigger</button>

<ng-template #menu>
  <hlm-dropdown-menu class="w-60">
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
    <button hlmDropdownMenuItem>Profile</button>
  </hlm-dropdown-menu>
</ng-template>
`;

function makeTree(): Tree {
  const tree = createTreeWithEmptyWorkspace();
  tree.write('src/app/shared/ui/user-menu/user-menu.ts', USER_MENU_TS);
  tree.write('src/app/shared/ui/user-menu/user-menu.html', USER_MENU_HTML);
  return tree;
}

describe('patchUserMenu', () => {
  it('does nothing if user-menu.ts does not exist', () => {
    const tree = createTreeWithEmptyWorkspace();
    expect(() => patchUserMenu(tree, '.')).not.toThrow();
  });

  it('strips the LanguageSwitcher import and imports-array entry from user-menu.ts', () => {
    const tree = makeTree();
    patchUserMenu(tree, '.');
    const out = tree.read('src/app/shared/ui/user-menu/user-menu.ts', 'utf-8') ?? '';
    expect(out).not.toContain('language-switcher/language-switcher');
    expect(out).not.toMatch(/imports:\s*\[[^\]]*LanguageSwitcher/);
    // ThemeSwitcher must survive untouched.
    expect(out).toContain('ThemeSwitcher');
  });

  it('strips the @if(showLanguageSwitcher) block from the separate user-menu.html', () => {
    const tree = makeTree();
    patchUserMenu(tree, '.');
    const html = tree.read('src/app/shared/ui/user-menu/user-menu.html', 'utf-8') ?? '';
    expect(html).not.toContain('app-language-switcher');
    // The nested `@if (config.showLanguageSwitcher) { ... }` block is gone —
    // the outer `@if (config.showThemeSwitcher || config.showLanguageSwitcher)`
    // wrapper legitimately still mentions it (it must keep showing for
    // theme-switcher alone), so assert on the removed block's own content,
    // not a blanket absence of the string "showLanguageSwitcher".
    expect(html.match(/@if \(config\.showLanguageSwitcher\)/g)).toBeNull();
    // The theme-switcher block and the rest of the template survive.
    expect(html).toContain('app-theme-switcher');
    expect(html).toContain('Profile');
  });

  it('is a no-op if user-menu.ts has no LanguageSwitcher reference at all', () => {
    const tree = createTreeWithEmptyWorkspace();
    const plain = USER_MENU_TS.replace(
      /import \{ LanguageSwitcher \}.*\n/,
      '',
    ).replace(', LanguageSwitcher]', ']');
    tree.write('src/app/shared/ui/user-menu/user-menu.ts', plain);
    tree.write('src/app/shared/ui/user-menu/user-menu.html', USER_MENU_HTML);
    patchUserMenu(tree, '.');
    // html untouched since the .ts short-circuit fired before ever reading it
    const html = tree.read('src/app/shared/ui/user-menu/user-menu.html', 'utf-8') ?? '';
    expect(html).toContain('app-language-switcher');
  });
});
