import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { appendNavItem } from './append-nav-item';

const HTML_PATH = 'src/app/layout/sidebar-shell/sidebar-shell.html';
const TS_PATH = 'src/app/layout/sidebar-shell/sidebar-shell.ts';

const HTML_TEMPLATE = `<ul hlmSidebarMenu>
  <li hlmSidebarMenuItem>
    <a routerLink="/" [tooltip]="'Welcome'">
      <ng-icon name="lucideHouse" />
      <span>Welcome</span>
    </a>
  </li>
  <!-- BP:NAV_ITEMS -->
</ul>
`;

const TS_TEMPLATE = `import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';

@Component({
  selector: 'app-sidebar-shell',
  imports: [NgIcon],
  providers: [provideIcons({ lucideHouse })],
  templateUrl: './sidebar-shell.html',
})
export class SidebarShell {}
`;

function makeTree(): Tree {
  const tree = createTreeWithEmptyWorkspace();
  tree.write(HTML_PATH, HTML_TEMPLATE);
  tree.write(TS_PATH, TS_TEMPLATE);
  return tree;
}

describe('appendNavItem', () => {
  it('does nothing if the html file does not exist', () => {
    const tree = createTreeWithEmptyWorkspace();
    expect(() =>
      appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' }),
    ).not.toThrow();
    expect(tree.exists(HTML_PATH)).toBe(false);
  });

  it('does nothing if the marker is missing (e.g. an older pre-marker project)', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write(HTML_PATH, HTML_TEMPLATE.replace('<!-- BP:NAV_ITEMS -->\n', ''));
    tree.write(TS_PATH, TS_TEMPLATE);
    appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' });
    const html = tree.read(HTML_PATH, 'utf-8') ?? '';
    expect(html).not.toContain('/admin/roles');
  });

  it('inserts the new item before the marker with the real menu-item markup shape', () => {
    const tree = makeTree();
    appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' });
    const html = tree.read(HTML_PATH, 'utf-8') ?? '';
    expect(html).toContain('hlmSidebarMenuItem');
    expect(html).toContain('hlmSidebarMenuButton');
    expect(html).toContain('routerLink="/admin/roles"');
    expect(html).toContain('routerLinkActive');
    expect(html).toContain(`[tooltip]="'Roles'"`);
    expect(html).toContain('<ng-icon name="lucideShield" />');
    expect(html).toContain('<span>Roles</span>');
    // The marker survives, still present exactly once, so a second call can anchor on it.
    expect(html.match(/<!-- BP:NAV_ITEMS -->/g)?.length).toBe(1);
  });

  it('supports multiple sequential calls (e.g. Roles then Permissions), preserving order', () => {
    const tree = makeTree();
    appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' });
    appendNavItem(tree, HTML_PATH, {
      label: 'Permissions',
      routerLink: '/admin/permissions',
      icon: 'lucideKeyRound',
    });
    const html = tree.read(HTML_PATH, 'utf-8') ?? '';
    expect(html.indexOf('Welcome')).toBeLessThan(html.indexOf('Roles'));
    expect(html.indexOf('Roles')).toBeLessThan(html.indexOf('Permissions'));
  });

  it('is idempotent — running with the same routerLink twice does not duplicate the item', () => {
    const tree = makeTree();
    appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' });
    appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' });
    const html = tree.read(HTML_PATH, 'utf-8') ?? '';
    // A single correct insertion legitimately mentions "Roles" twice
    // ([tooltip] + <span>) — count the once-per-item routerLink instead.
    expect(html.match(/routerLink="\/admin\/roles"/g)?.length).toBe(1);
  });

  it('registers the icon in the shell .ts file (merges into the existing @ng-icons/lucide import)', () => {
    const tree = makeTree();
    appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' });
    const ts = tree.read(TS_PATH, 'utf-8') ?? '';
    // Quote style is whatever ts-morph preserves on the pre-existing
    // declaration (single, in this fixture) — match on module specifier text
    // alone, not an assumed quote character.
    const importLines = ts.split('\n').filter((l) => l.includes('@ng-icons/lucide'));
    expect(importLines.length).toBe(1);
    expect(importLines[0]).toContain('lucideHouse');
    expect(importLines[0]).toContain('lucideShield');
    expect(ts).toMatch(/provideIcons\(\{[^}]*lucideShield/);
  });

  it('does not re-register an icon that is already present', () => {
    const tree = makeTree();
    appendNavItem(tree, HTML_PATH, { label: 'Home', routerLink: '/home', icon: 'lucideHouse' });
    const ts = tree.read(TS_PATH, 'utf-8') ?? '';
    expect(ts.match(/lucideHouse/g)?.length).toBe(2); // import + provideIcons, not duplicated
  });

  it('adds a fresh @ng-icons/lucide import when the shell has none yet', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write(HTML_PATH, HTML_TEMPLATE);
    tree.write(
      TS_PATH,
      `import { Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';

@Component({ selector: 'app-sidebar-shell', imports: [NgIcon], providers: [provideIcons({})], templateUrl: './sidebar-shell.html' })
export class SidebarShell {}
`,
    );
    appendNavItem(tree, HTML_PATH, { label: 'Roles', routerLink: '/admin/roles', icon: 'lucideShield' });
    const ts = tree.read(TS_PATH, 'utf-8') ?? '';
    expect(ts).toContain(`import { lucideShield } from "@ng-icons/lucide"`);
  });
});
