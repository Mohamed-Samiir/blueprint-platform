import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import userManagementGenerator from './user-management';

const FLAT_ROUTES = `import { Routes } from '@angular/router';

export const routes: Routes = [
  // Feature routes are added here automatically when you generate a
  // module (e.g. \`nx g @blueprint-platform/modules:auth\`).
];
`;

const SHELL_ROUTES = `import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/sidebar-shell/sidebar-shell').then((m) => m.SidebarShell),
    children: [
      { path: '', loadComponent: () => import('./welcome').then((m) => m.Welcome) },
    ],
  },
];
`;

function makeTree(routesTemplate = FLAT_ROUTES): Tree {
  const tree = createTreeWithEmptyWorkspace();
  tree.write('src/app/app.routes.ts', routesTemplate);
  writeJson(tree, 'package.json', { dependencies: {}, devDependencies: {} });
  writeJson(tree, '.blueprint/manifest.json', {
    components: [],
    modules: [],
    layouts: [],
    protectedRouteBranches: [],
  });
  return tree;
}

const SHELL_HTML = `<ul hlmSidebarMenu>
  <li hlmSidebarMenuItem>
    <a routerLink="/" [tooltip]="'Welcome'">
      <ng-icon name="lucideHouse" />
      <span>Welcome</span>
    </a>
  </li>
  <!-- BP:NAV_ITEMS -->
</ul>
`;

const SHELL_TS = `import { Component } from '@angular/core';
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

/** A tree with a real (not just route-referenced) sidebar-shell present, for the nav-link injection tests. */
function makeTreeWithRealShell(): Tree {
  const tree = makeTree(SHELL_ROUTES);
  tree.write('src/app/layout/sidebar-shell/sidebar-shell.ts', SHELL_TS);
  tree.write('src/app/layout/sidebar-shell/sidebar-shell.html', SHELL_HTML);
  return tree;
}

describe('modules:user-management generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = makeTree();
  });

  it('copies core/user-management files', async () => {
    await userManagementGenerator(tree, {});
    for (const f of [
      'models.ts',
      'role-options.data.ts',
      'user-id.ts',
      'user-mock.data.ts',
      'user-storage.ts',
      'user.service.ts',
    ]) {
      expect(tree.exists(`src/app/core/user-management/${f}`)).toBe(true);
    }
  });

  it('copies the routed pages, the shared form, and all three dialogs, but no preview scaffolding', async () => {
    await userManagementGenerator(tree, {});
    expect(tree.exists('src/app/features/user-management/users-list/users-list.ts')).toBe(true);
    expect(tree.exists('src/app/features/user-management/add-user/add-user.ts')).toBe(true);
    expect(tree.exists('src/app/features/user-management/edit-user/edit-user.ts')).toBe(true);
    expect(tree.exists('src/app/features/user-management/user-form/user-form.ts')).toBe(true);
    expect(tree.exists('src/app/features/user-management/details-user/details-user.ts')).toBe(
      true,
    );
    expect(
      tree.exists('src/app/features/user-management/change-role-dialog/change-role-dialog.ts'),
    ).toBe(true);
    expect(
      tree.exists('src/app/features/user-management/deactivate-confirm/deactivate-confirm.ts'),
    ).toBe(true);
    expect(tree.exists('src/app/features/user-management/preview')).toBe(false);
  });

  it('adds the module UI dependencies (avatar, badge, table, card, alert-dialog, …)', async () => {
    await userManagementGenerator(tree, {});
    for (const c of [
      'avatar',
      'badge',
      'button',
      'dropdown-menu',
      'table',
      'card',
      'field',
      'input-group',
      'native-select',
      'switch',
      'alert-dialog',
    ]) {
      expect(tree.exists(`src/app/shared/ui/${c}`)).toBe(true);
    }
  });

  it('wires the default admin/users route tree with real class names, and NO details-user route (dialog-only)', async () => {
    await userManagementGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'admin/users'`);
    expect(out).toContain(`path: 'new'`);
    expect(out).toContain(`path: ':id'`);
    expect(out).toContain(`path: 'edit'`);
    expect(out).toContain('UsersList');
    expect(out).toContain('AddUser');
    expect(out).toContain('EditUser');
    expect(out).not.toContain('DetailsUser');
  });

  it('respects a custom routePrefix', async () => {
    await userManagementGenerator(tree, { routePrefix: 'people' });
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'people'`);
  });

  it('appends into an existing main shell rather than the flat top level', async () => {
    tree = makeTree(SHELL_ROUTES);
    await userManagementGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    const shellChildrenIdx = out.indexOf('children: [');
    const usersIdx = out.indexOf(`path: 'admin/users'`);
    expect(usersIdx).toBeGreaterThan(shellChildrenIdx);
  });

  it('records the module in the manifest', async () => {
    await userManagementGenerator(tree, {});
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.modules).toEqual(['user-management']);
  });

  it('is a no-op on a second run — does not duplicate the route tree', async () => {
    await userManagementGenerator(tree, {});
    await userManagementGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out.split(`path: 'admin/users'`).length).toBe(2);
  });

  it('adds a User Management nav link to an existing main shell', async () => {
    tree = makeTreeWithRealShell();
    await userManagementGenerator(tree, {});
    const html = tree.read('src/app/layout/sidebar-shell/sidebar-shell.html', 'utf-8') ?? '';
    expect(html).toContain('routerLink="/admin/users"');
    expect(html).toContain('<span>User Management</span>');
    expect(html.indexOf('Welcome')).toBeLessThan(html.indexOf('User Management'));
    const ts = tree.read('src/app/layout/sidebar-shell/sidebar-shell.ts', 'utf-8') ?? '';
    expect(ts).toContain('lucideUsers');
  });

  it('respects a custom routePrefix in the injected nav link too', async () => {
    tree = makeTreeWithRealShell();
    await userManagementGenerator(tree, { routePrefix: 'people' });
    const html = tree.read('src/app/layout/sidebar-shell/sidebar-shell.html', 'utf-8') ?? '';
    expect(html).toContain('routerLink="/people"');
  });

  it('adds no nav link when layout is none, and logs why', async () => {
    const infoSpy = jest.spyOn(require('@nx/devkit').logger, 'info');
    await userManagementGenerator(tree, {});
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('no main app shell present yet'));
    infoSpy.mockRestore();
  });

  it('has zero real import of core/auth or core/rbac anywhere in the copied output (doc-comment mentions explaining the absence are fine)', async () => {
    await userManagementGenerator(tree, {});
    const check = (path: string) => {
      const content = tree.read(path, 'utf-8') ?? '';
      expect(content).not.toMatch(/^import .*core\/auth/m);
      expect(content).not.toMatch(/^import .*core\/rbac/m);
    };
    const walk = (dir: string) => {
      for (const child of tree.children(dir)) {
        const full = `${dir}/${child}`;
        if (tree.isFile(full)) {
          if (full.endsWith('.ts')) check(full);
        } else {
          walk(full);
        }
      }
    };
    walk('src/app/core/user-management');
    walk('src/app/features/user-management');
  });
});
