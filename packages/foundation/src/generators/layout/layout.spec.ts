import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import layoutGenerator from './layout';

describe('foundation:layout --list', () => {
  let tree: Tree;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints exactly the four real app-shell names, excluding auth-split/auth-centered', async () => {
    await layoutGenerator(tree, { list: true });
    const printed = logSpy.mock.calls.map((c) => c[0]);
    expect(printed.sort()).toEqual(
      ['sidebar-shell', 'floating-shell', 'inset-shell', 'topbar-shell'].sort(),
    );
    expect(printed).not.toContain('auth-split');
    expect(printed).not.toContain('auth-centered');
  });

  it('exits before any Tree writes happen — no name is required, nothing changes', async () => {
    await layoutGenerator(tree, { list: true });
    expect(tree.exists('src/app/layout')).toBe(false);
    expect(tree.exists('src/app/core/theme')).toBe(false);
    expect(tree.exists('src/app/core/language')).toBe(false);
  });

  it('throws a clear error when --name is missing and --list was not passed', async () => {
    await expect(layoutGenerator(tree, {})).rejects.toThrow(/--name is required/);
  });
});
