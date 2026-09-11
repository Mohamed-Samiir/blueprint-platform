import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { registerUiPaths } from './register-ui-path';

describe('registerUiPaths', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    writeJson(tree, 'tsconfig.json', { compilerOptions: { paths: {} } });
  });

  it('is a no-op given an empty name list', () => {
    registerUiPaths(tree, '.', [], { sourceDir: 'src/app/shared/ui', aliasPrefix: '@x/ui' });
    expect(readJson(tree, 'tsconfig.json').compilerOptions.paths).toEqual({});
  });

  it('is a no-op if tsconfig.json does not exist', () => {
    const empty = createTreeWithEmptyWorkspace();
    expect(() =>
      registerUiPaths(empty, '.', ['button'], {
        sourceDir: 'src/app/shared/ui',
        aliasPrefix: '@x/ui',
      }),
    ).not.toThrow();
  });

  it('writes one alias per name, generalized for the given sourceDir/aliasPrefix', () => {
    registerUiPaths(tree, '.', ['button', 'switch'], {
      sourceDir: 'src/app/shared/ui',
      aliasPrefix: '@blueprint-platform/ui',
    });
    const paths = readJson(tree, 'tsconfig.json').compilerOptions.paths;
    expect(paths['@blueprint-platform/ui/button']).toEqual([
      './src/app/shared/ui/button/src/index.ts',
    ]);
    expect(paths['@blueprint-platform/ui/switch']).toEqual([
      './src/app/shared/ui/switch/src/index.ts',
    ]);
  });

  it('accepts a different source folder / alias prefix (not hardcoded to shared/ui)', () => {
    registerUiPaths(tree, '.', ['audit-log'], {
      sourceDir: 'src/app/shared/components',
      aliasPrefix: '@blueprint-platform/components',
    });
    const paths = readJson(tree, 'tsconfig.json').compilerOptions.paths;
    expect(paths['@blueprint-platform/components/audit-log']).toEqual([
      './src/app/shared/components/audit-log/src/index.ts',
    ]);
  });
});
