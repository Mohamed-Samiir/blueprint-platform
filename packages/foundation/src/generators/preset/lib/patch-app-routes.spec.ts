import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { patchAppRoutes } from './patch-app-routes';

const ROUTES_TEMPLATE = `import { Routes } from '@angular/router';

export const routes: Routes = [
  // Feature routes are added here automatically when you generate a
  // module (e.g. \`nx g @blueprint-platform/modules:auth\`).
];
`;

const SHELL_CLASS: Record<string, string> = {
  'sidebar-shell': 'SidebarShell',
  'floating-shell': 'FloatingShell',
  'inset-shell': 'InsetShell',
  'topbar-shell': 'TopbarShell',
};

describe('patchAppRoutes', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/app.routes.ts', ROUTES_TEMPLATE);
  });

  it('leaves app.routes.ts byte-for-byte identical when layout is "none"', () => {
    patchAppRoutes(tree, { layout: 'none' });
    expect(tree.read('src/app/app.routes.ts', 'utf-8')).toBe(ROUTES_TEMPLATE);
  });

  for (const layout of Object.keys(SHELL_CLASS)) {
    describe(`layout "${layout}"`, () => {
      beforeEach(() => patchAppRoutes(tree, { layout }));

      it('wraps the feature routes under a lazy-loaded shell parent route', () => {
        const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
        expect(out).toContain(`path: ''`);
        expect(out).toContain(
          `import('./layout/${layout}/${layout}').then((m) => m.${SHELL_CLASS[layout]})`,
        );
        expect(out).toContain('children: [');
      });

      it('preserves the feature-routes placeholder comment inside children', () => {
        const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
        expect(out).toContain(
          'Feature routes are added here automatically',
        );
        const childrenIdx = out.indexOf('children: [');
        expect(out.indexOf('Feature routes are added here automatically')).toBeGreaterThan(
          childrenIdx,
        );
      });

      it('still parses as a valid routes module', () => {
        const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
        expect(out).toContain(`import { Routes } from '@angular/router'`);
        expect(out).toContain('export const routes: Routes = [');
      });
    });
  }
});
