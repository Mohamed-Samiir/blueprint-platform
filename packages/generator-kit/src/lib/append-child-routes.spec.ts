import { Tree, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { appendChildRoutes } from './append-child-routes';

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

const SHELL_PLUS_AUTH_ROUTES = `import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/sidebar-shell/sidebar-shell').then((m) => m.SidebarShell),
    children: [
      { path: '', loadComponent: () => import('./welcome').then((m) => m.Welcome) },
    ],
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./layout/auth-split/auth-split').then((m) => m.AuthSplit),
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/forms/login-form/login-form').then((m) => m.LoginForm) },
    ],
  },
];
`;

describe('appendChildRoutes', () => {
  it('does nothing if app.routes.ts does not exist', () => {
    const tree = createTreeWithEmptyWorkspace();
    expect(() =>
      appendChildRoutes(tree, '.', [
        { path: 'admin', componentImportPath: './x', componentClassName: 'X' },
      ]),
    ).not.toThrow();
    expect(tree.exists('src/app/app.routes.ts')).toBe(false);
  });

  it('appends as flat top-level entries when there is no main shell (layout: none)', () => {
    const tree: Tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/app.routes.ts', FLAT_ROUTES);

    appendChildRoutes(tree, '.', [
      {
        path: 'admin',
        children: [
          {
            path: 'permissions',
            componentImportPath: './features/rbac/permissions/permissions-list/permissions-list',
            componentClassName: 'PermissionsList',
          },
        ],
      },
      {
        path: 'forbidden',
        componentImportPath: './features/rbac/forbidden/forbidden',
        componentClassName: 'Forbidden',
      },
    ]);

    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'admin'`);
    expect(out).toContain(`path: 'permissions'`);
    expect(out).toContain('PermissionsList');
    expect(out).toContain(`path: 'forbidden'`);
    expect(out).toContain('Forbidden');
  });

  it('appends into the main shell children when one exists', () => {
    const tree: Tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/app.routes.ts', SHELL_ROUTES);

    appendChildRoutes(tree, '.', [
      {
        path: 'admin',
        componentImportPath: './features/rbac/permissions/permissions-list/permissions-list',
        componentClassName: 'PermissionsList',
      },
    ]);

    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    // The new route lands after the shell's own `children: [` opening — i.e.
    // inside the shell, not as a new top-level sibling of it.
    const shellChildrenIdx = out.indexOf('children: [');
    const adminIdx = out.indexOf(`path: 'admin'`);
    expect(shellChildrenIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeGreaterThan(shellChildrenIdx);
    // Only one top-level route object (the shell) — 'admin' must be nested.
    expect(out.match(/loadComponent: \(\) =>/g)?.length).toBe(3); // welcome + shell + admin
  });

  it('targets the main shell, not a protected sibling branch that also has children', () => {
    const tree: Tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/app.routes.ts', SHELL_PLUS_AUTH_ROUTES);
    writeJson(tree, '.blueprint/manifest.json', { protectedRouteBranches: ['auth'] });

    appendChildRoutes(tree, '.', [
      {
        path: 'admin',
        componentImportPath: './features/rbac/permissions/permissions-list/permissions-list',
        componentClassName: 'PermissionsList',
      },
    ]);

    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    const shellIdx = out.indexOf(`import('./layout/sidebar-shell/sidebar-shell')`);
    const authIdx = out.indexOf(`path: 'auth'`);
    const adminIdx = out.indexOf(`path: 'admin'`);
    expect(adminIdx).toBeGreaterThan(shellIdx);
    expect(adminIdx).toBeLessThan(authIdx); // nested inside the shell's children, which come before 'auth' in source order
    // The auth branch's own single child ('login') must be untouched — no
    // 'admin' text anywhere inside it.
    const authBlock = out.slice(authIdx);
    expect(authBlock).not.toContain(`path: 'admin'`);
  });

  it('preserves nested children (recursive route trees)', () => {
    const tree: Tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/app.routes.ts', FLAT_ROUTES);

    appendChildRoutes(tree, '.', [
      {
        path: 'admin',
        children: [
          { path: '', redirectTo: 'permissions', pathMatch: 'full' },
          {
            path: 'permissions',
            children: [
              {
                path: '',
                componentImportPath: './features/rbac/permissions/permissions-list/permissions-list',
                componentClassName: 'PermissionsList',
              },
              {
                path: 'new',
                componentImportPath: './features/rbac/permissions/permission-form/permission-form',
                componentClassName: 'PermissionForm',
              },
              {
                path: ':id',
                children: [
                  {
                    path: 'edit',
                    componentImportPath: './features/rbac/permissions/permission-form/permission-form',
                    componentClassName: 'PermissionForm',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`redirectTo: 'permissions'`);
    expect(out).toContain(`path: 'new'`);
    expect(out).toContain(`path: ':id'`);
    expect(out).toContain(`path: 'edit'`);
    expect(out.match(/PermissionForm/g)?.length).toBe(2);
  });
});
