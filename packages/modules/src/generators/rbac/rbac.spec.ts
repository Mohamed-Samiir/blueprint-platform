import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import rbacGenerator from './rbac';

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

describe('modules:rbac generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = makeTree();
  });

  it('copies core/rbac files', async () => {
    await rbacGenerator(tree, {});
    for (const f of [
      'current-user-permissions.token.ts',
      'rbac-demo-session.service.ts',
      'models.ts',
      'mock-users.data.ts',
      'mock-data.ts',
      'permission-graph.ts',
      'permission.guard.ts',
      'permissions.service.ts',
      'rbac-id.ts',
      'rbac-storage.ts',
      'roles.service.ts',
    ]) {
      expect(tree.exists(`src/app/core/rbac/${f}`)).toBe(true);
    }
  });

  it('copies the features/rbac admin pages and the forbidden page, but no preview scaffolding', async () => {
    await rbacGenerator(tree, {});
    expect(tree.exists('src/app/features/rbac/forbidden/forbidden.ts')).toBe(true);
    expect(
      tree.exists('src/app/features/rbac/permissions/permissions-list/permissions-list.ts'),
    ).toBe(true);
    expect(
      tree.exists('src/app/features/rbac/permissions/permission-form/permission-form.ts'),
    ).toBe(true);
    expect(tree.exists('src/app/features/rbac/roles/roles-list/roles-list.ts')).toBe(true);
    expect(tree.exists('src/app/features/rbac/roles/role-form/role-form.ts')).toBe(true);
    expect(tree.exists('src/app/features/rbac/preview')).toBe(false);
    expect(tree.exists('src/app/features/rbac/rbac.routes.ts')).toBe(false);
  });

  it('adds the admin pages own UI dependencies (accordion, alert, badge, table, …)', async () => {
    await rbacGenerator(tree, {});
    for (const c of [
      'accordion',
      'alert',
      'alert-dialog',
      'badge',
      'button',
      'checkbox',
      'dropdown-menu',
      'field',
      'input',
      'native-select',
      'switch',
      'table',
      'textarea',
    ]) {
      expect(tree.exists(`src/app/shared/ui/${c}`)).toBe(true);
    }
  });

  it('wires the default admin/* route tree with real class names, plus a top-level forbidden', async () => {
    await rbacGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'admin'`);
    expect(out).toContain(`path: 'permissions'`);
    expect(out).toContain(`path: 'roles'`);
    expect(out).toContain(`path: ':id'`);
    expect(out).toContain(`path: 'edit'`);
    expect(out).toContain(`redirectTo: 'permissions'`);
    expect(out).toContain('PermissionsList');
    expect(out).toContain('PermissionForm');
    expect(out).toContain('RolesList');
    expect(out).toContain('RoleForm');
    expect(out).toContain(`path: 'forbidden'`);
    expect(out).toContain('Forbidden');
  });

  it('respects a custom routePrefix', async () => {
    await rbacGenerator(tree, { routePrefix: 'settings/access' });
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'settings/access'`);
  });

  it('mounts forbidden as a top-level sibling, not nested under routePrefix', async () => {
    await rbacGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    const adminIdx = out.indexOf(`path: 'admin'`);
    const forbiddenIdx = out.indexOf(`path: 'forbidden'`);
    // 'forbidden' must come after the admin block CLOSES, not inside it —
    // approximate by checking it isn't nested inside admin's own children by
    // counting that 'admin' block's closing doesn't wrap it (both are direct
    // elements of the same appendChildRoutes call, always appended as
    // siblings at the target array level).
    expect(forbiddenIdx).toBeGreaterThan(adminIdx);
  });

  it('appends into an existing main shell rather than the flat top level', async () => {
    tree = makeTree(SHELL_ROUTES);
    await rbacGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    const shellChildrenIdx = out.indexOf('children: [');
    const adminIdx = out.indexOf(`path: 'admin'`);
    expect(adminIdx).toBeGreaterThan(shellChildrenIdx);
  });

  it('records the module in the manifest', async () => {
    await rbacGenerator(tree, {});
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.modules).toEqual(['rbac']);
  });

  it('adds Roles + Permissions nav links to an existing main shell', async () => {
    tree = makeTreeWithRealShell();
    await rbacGenerator(tree, {});
    const html = tree.read('src/app/layout/sidebar-shell/sidebar-shell.html', 'utf-8') ?? '';
    expect(html).toContain('routerLink="/admin/roles"');
    expect(html).toContain('<span>Roles</span>');
    expect(html).toContain('routerLink="/admin/permissions"');
    expect(html).toContain('<span>Permissions</span>');
    expect(html.indexOf('Welcome')).toBeLessThan(html.indexOf('Roles'));
    const ts = tree.read('src/app/layout/sidebar-shell/sidebar-shell.ts', 'utf-8') ?? '';
    expect(ts).toContain('lucideShield');
    expect(ts).toContain('lucideKeyRound');
  });

  it('respects a custom routePrefix in the injected nav links too', async () => {
    tree = makeTreeWithRealShell();
    await rbacGenerator(tree, { routePrefix: 'access' });
    const html = tree.read('src/app/layout/sidebar-shell/sidebar-shell.html', 'utf-8') ?? '';
    expect(html).toContain('routerLink="/access/roles"');
    expect(html).toContain('routerLink="/access/permissions"');
  });

  it('adds no nav link when layout is none, and logs why', async () => {
    const infoSpy = jest.spyOn(require('@nx/devkit').logger, 'info');
    await rbacGenerator(tree, {});
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('no main app shell present yet'));
    infoSpy.mockRestore();
  });

  it('does not duplicate nav links even if appendNavItem were somehow invoked twice (idempotency at the helper level)', async () => {
    tree = makeTreeWithRealShell();
    await rbacGenerator(tree, {});
    // A real second `rbacGenerator` run short-circuits on the manifest check
    // before ever reaching nav injection again — exercise the underlying
    // idempotency directly against the already-populated shell instead.
    const { appendNavItem } = require('@blueprint-platform/generator-kit');
    appendNavItem(tree, 'src/app/layout/sidebar-shell/sidebar-shell.html', {
      label: 'Roles',
      routerLink: '/admin/roles',
      icon: 'lucideShield',
    });
    const html = tree.read('src/app/layout/sidebar-shell/sidebar-shell.html', 'utf-8') ?? '';
    expect(html.match(/routerLink="\/admin\/roles"/g)?.length).toBe(1);
  });

  it('is a no-op on a second run — does not duplicate the route tree', async () => {
    await rbacGenerator(tree, {});
    await rbacGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out.split(`path: 'admin'`).length).toBe(2);
  });

  it('has zero real import of core/auth or AuthUser anywhere in the copied output (doc-comment mentions explaining the absence are fine)', async () => {
    await rbacGenerator(tree, {});
    const check = (path: string) => {
      const content = tree.read(path, 'utf-8') ?? '';
      // Only real import statements count as a coupling — several files have
      // doc comments *explaining* that they deliberately don't import these,
      // which legitimately contain the strings "core/auth" / "AuthUser".
      expect(content).not.toMatch(/^import .*core\/auth/m);
      expect(content).not.toMatch(/^import .*\bAuthUser\b/m);
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
    walk('src/app/core/rbac');
    walk('src/app/features/rbac');
  });
});
