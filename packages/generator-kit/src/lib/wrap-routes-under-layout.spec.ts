import { Tree, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { wrapRoutesUnderLayout } from './wrap-routes-under-layout';

const ROUTES_TEMPLATE = `import { Routes } from '@angular/router';

export const routes: Routes = [
  // Feature routes are added here automatically when you generate a
  // module (e.g. \`nx g @blueprint-platform/modules:auth\`).
];
`;

describe('wrapRoutesUnderLayout', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/app.routes.ts', ROUTES_TEMPLATE);
  });

  it('does nothing if app.routes.ts does not exist', () => {
    const empty = createTreeWithEmptyWorkspace();
    expect(() =>
      wrapRoutesUnderLayout(empty, '.', {
        layoutImportPath: './layout/x/x',
        layoutClassName: 'X',
      }),
    ).not.toThrow();
    expect(empty.exists('src/app/app.routes.ts')).toBe(false);
  });

  for (const [layout, className] of [
    ['sidebar-shell', 'SidebarShell'],
    ['floating-shell', 'FloatingShell'],
    ['inset-shell', 'InsetShell'],
    ['topbar-shell', 'TopbarShell'],
  ] as const) {
    describe(`layout "${layout}"`, () => {
      beforeEach(() =>
        wrapRoutesUnderLayout(tree, '.', {
          layoutImportPath: `./layout/${layout}/${layout}`,
          layoutClassName: className,
        }),
      );

      it('wraps the feature routes under a lazy-loaded shell parent route', () => {
        const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
        expect(out).toContain(`path: ''`);
        expect(out).toContain(
          `import('./layout/${layout}/${layout}').then((m) => m.${className})`,
        );
        expect(out).toContain('children: [');
      });

      it('preserves the feature-routes placeholder comment inside children', () => {
        const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
        expect(out).toContain('Feature routes are added here automatically');
        const childrenIdx = out.indexOf('children: [');
        expect(
          out.indexOf('Feature routes are added here automatically'),
        ).toBeGreaterThan(childrenIdx);
      });

      it('still parses as a valid routes module', () => {
        const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
        expect(out).toContain(`import { Routes } from '@angular/router'`);
        expect(out).toContain('export const routes: Routes = [');
      });
    });
  }

  it('inserts an index route ahead of the existing entries when given one', () => {
    wrapRoutesUnderLayout(tree, '.', {
      layoutImportPath: './layout/sidebar-shell/sidebar-shell',
      layoutClassName: 'SidebarShell',
      indexRoute: { importPath: './welcome', className: 'Welcome' },
    });
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(
      `import('./welcome').then((m) => m.Welcome)`,
    );
    const indexIdx = out.indexOf(`import('./welcome')`);
    const commentIdx = out.indexOf('Feature routes are added here automatically');
    expect(indexIdx).toBeGreaterThan(-1);
    expect(commentIdx).toBeGreaterThan(indexIdx);
  });

  it('omits the index route entirely when none is given', () => {
    wrapRoutesUnderLayout(tree, '.', {
      layoutImportPath: './layout/sidebar-shell/sidebar-shell',
      layoutClassName: 'SidebarShell',
    });
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).not.toContain('./welcome');
  });

  describe('protected route branches', () => {
    beforeEach(() => {
      tree.write(
        'src/app/app.routes.ts',
        `import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./layout/auth-split/auth-split').then((m) => m.AuthSplit),
    children: [],
  },
];
`,
      );
    });

    it('leaves a protected top-level branch out of the new shell and re-adds it as a sibling', () => {
      writeJson(tree, '.blueprint/manifest.json', { protectedRouteBranches: ['auth'] });
      wrapRoutesUnderLayout(tree, '.', {
        layoutImportPath: './layout/sidebar-shell/sidebar-shell',
        layoutClassName: 'SidebarShell',
      });
      const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';

      const shellIdx = out.indexOf(`import('./layout/sidebar-shell/sidebar-shell')`);
      const childrenIdx = out.indexOf('children: [', shellIdx);
      const closeChildrenIdx = out.indexOf('],', childrenIdx);
      const authIdx = out.indexOf(`path: 'auth'`);

      expect(shellIdx).toBeGreaterThan(-1);
      expect(authIdx).toBeGreaterThan(-1);
      // 'auth' must NOT be nested inside the new shell's children — it must
      // appear after that children array closes, as a top-level sibling.
      expect(authIdx).toBeGreaterThan(closeChildrenIdx);
    });

    it('sweeps the branch in as usual when it is not listed as protected', () => {
      writeJson(tree, '.blueprint/manifest.json', { protectedRouteBranches: [] });
      wrapRoutesUnderLayout(tree, '.', {
        layoutImportPath: './layout/sidebar-shell/sidebar-shell',
        layoutClassName: 'SidebarShell',
      });
      const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';

      const shellIdx = out.indexOf(`import('./layout/sidebar-shell/sidebar-shell')`);
      const childrenIdx = out.indexOf('children: [', shellIdx);
      const closeChildrenIdx = out.indexOf('],', childrenIdx);
      const authIdx = out.indexOf(`path: 'auth'`);

      expect(authIdx).toBeGreaterThan(childrenIdx);
      expect(authIdx).toBeLessThan(closeChildrenIdx);
    });
  });
});
