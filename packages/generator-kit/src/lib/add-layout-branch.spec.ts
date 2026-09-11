import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { addLayoutBranch, readProtectedRouteBranches } from './add-layout-branch';

const ROUTES_TEMPLATE = `import { Routes } from '@angular/router';

export const routes: Routes = [
  // Feature routes are added here automatically when you generate a
  // module (e.g. \`nx g @blueprint-platform/modules:auth\`).
];
`;

describe('addLayoutBranch', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/app.routes.ts', ROUTES_TEMPLATE);
  });

  it('does nothing if app.routes.ts does not exist', () => {
    const empty = createTreeWithEmptyWorkspace();
    expect(() =>
      addLayoutBranch(empty, '.', {
        path: 'auth',
        layoutImportPath: './layout/auth-split/auth-split',
        layoutClassName: 'AuthSplit',
        children: [],
      }),
    ).not.toThrow();
    expect(empty.exists('src/app/app.routes.ts')).toBe(false);
  });

  it('adds a new top-level route with its children, leaving existing content untouched', () => {
    addLayoutBranch(tree, '.', {
      path: 'auth',
      layoutImportPath: './layout/auth-split/auth-split',
      layoutClassName: 'AuthSplit',
      children: [
        { path: '', redirectTo: 'login', pathMatch: 'full' },
        {
          path: 'login',
          componentImportPath: './features/auth/forms/login-form/login-form',
          componentClassName: 'LoginForm',
        },
      ],
    });
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'auth'`);
    expect(out).toContain(
      `import('./layout/auth-split/auth-split').then((m) => m.AuthSplit)`,
    );
    expect(out).toContain(`redirectTo: 'login'`);
    expect(out).toContain(`pathMatch: 'full'`);
    expect(out).toContain(
      `import('./features/auth/forms/login-form/login-form').then((m) => m.LoginForm)`,
    );
  });

  it('supports nested children (e.g. a forgot-password sub-flow)', () => {
    addLayoutBranch(tree, '.', {
      path: 'auth',
      layoutImportPath: './layout/auth-split/auth-split',
      layoutClassName: 'AuthSplit',
      children: [
        {
          path: 'forgot-password',
          children: [
            { path: '', redirectTo: 'email', pathMatch: 'full' },
            {
              path: 'email',
              componentImportPath: './features/auth/forms/forgot-password-email-form/forgot-password-email-form',
              componentClassName: 'ForgotPasswordEmailForm',
            },
          ],
        },
      ],
    });
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'forgot-password'`);
    expect(out).toContain(`redirectTo: 'email'`);
    expect(out).toContain('ForgotPasswordEmailForm');
  });

  it('is a no-op on the manifest if it does not exist', () => {
    addLayoutBranch(tree, '.', {
      path: 'auth',
      layoutImportPath: './layout/auth-split/auth-split',
      layoutClassName: 'AuthSplit',
      children: [],
    });
    expect(tree.exists('.blueprint/manifest.json')).toBe(false);
  });

  it('records the path in protectedRouteBranches when the manifest exists', () => {
    writeJson(tree, '.blueprint/manifest.json', { components: [], modules: [] });
    addLayoutBranch(tree, '.', {
      path: 'auth',
      layoutImportPath: './layout/auth-split/auth-split',
      layoutClassName: 'AuthSplit',
      children: [],
    });
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.protectedRouteBranches).toEqual(['auth']);
    expect(readProtectedRouteBranches(tree, '.')).toEqual(['auth']);
  });

  it('is idempotent — adding the same branch path twice does not duplicate the manifest entry', () => {
    writeJson(tree, '.blueprint/manifest.json', { protectedRouteBranches: ['auth'] });
    addLayoutBranch(tree, '.', {
      path: 'auth',
      layoutImportPath: './layout/auth-split/auth-split',
      layoutClassName: 'AuthSplit',
      children: [],
    });
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.protectedRouteBranches).toEqual(['auth']);
  });
});

describe('readProtectedRouteBranches', () => {
  it('returns [] when the manifest does not exist', () => {
    const tree = createTreeWithEmptyWorkspace();
    expect(readProtectedRouteBranches(tree, '.')).toEqual([]);
  });

  it('returns [] when the manifest has no such field', () => {
    const tree = createTreeWithEmptyWorkspace();
    writeJson(tree, '.blueprint/manifest.json', { components: [] });
    expect(readProtectedRouteBranches(tree, '.')).toEqual([]);
  });
});
