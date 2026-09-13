import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { findExistingMainShell } from './find-main-shell';

describe('findExistingMainShell', () => {
  it('returns null when no layout exists at all (layout: none)', () => {
    const tree = createTreeWithEmptyWorkspace();
    expect(findExistingMainShell(tree)).toBeNull();
  });

  it('returns null when only a content-only shell (e.g. auth-split) exists', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/layout/auth-split/auth-split.ts', 'export class AuthSplit {}');
    expect(findExistingMainShell(tree)).toBeNull();
  });

  it('finds sidebar-shell and returns its .html sibling, not the .ts path', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/layout/sidebar-shell/sidebar-shell.ts', 'export class SidebarShell {}');
    tree.write('src/app/layout/sidebar-shell/sidebar-shell.html', '<div></div>');
    expect(findExistingMainShell(tree)).toEqual({
      path: 'src/app/layout/sidebar-shell/sidebar-shell.html',
      name: 'sidebar-shell',
    });
  });

  it('finds topbar-shell just as well as sidebar-shell', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/layout/topbar-shell/topbar-shell.ts', 'export class TopbarShell {}');
    expect(findExistingMainShell(tree)).toEqual({
      path: 'src/app/layout/topbar-shell/topbar-shell.html',
      name: 'topbar-shell',
    });
  });

  it('does not confuse a main shell with an auth branch present alongside it', () => {
    const tree = createTreeWithEmptyWorkspace();
    tree.write('src/app/layout/auth-centered/auth-centered.ts', 'export class AuthCentered {}');
    tree.write('src/app/layout/inset-shell/inset-shell.ts', 'export class InsetShell {}');
    expect(findExistingMainShell(tree)).toEqual({
      path: 'src/app/layout/inset-shell/inset-shell.html',
      name: 'inset-shell',
    });
  });
});
