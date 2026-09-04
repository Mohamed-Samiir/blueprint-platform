import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import uiGenerator from './ui';
import { listAllComponents } from './lib/resolve-deps';

function seedProject(tree: Tree) {
  writeJson(tree, 'tsconfig.json', { compilerOptions: { paths: {} } });
  writeJson(tree, 'package.json', { name: 'scratch', dependencies: {} });
  writeJson(tree, '.blueprint/manifest.json', { components: [] });
}

describe('ui generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedProject(tree);
  });

  it('copies a single component with its barrel and tsconfig path', async () => {
    await uiGenerator(tree, { components: 'button', skipFormat: true, skipInstall: true });

    expect(tree.exists('src/app/shared/ui/button/src/index.ts')).toBe(true);
    const tsconfig = readJson(tree, 'tsconfig.json');
    expect(tsconfig.compilerOptions.paths['@blueprint-platform/ui/button']).toEqual([
      './src/app/shared/ui/button/src/index.ts',
    ]);
  });

  it('pulls in transitive in-kit dependencies', async () => {
    await uiGenerator(tree, { components: 'date-picker', skipFormat: true, skipInstall: true });

    for (const dep of ['date-picker', 'calendar', 'popover', 'button', 'select', 'input-group', 'input', 'textarea', 'utils']) {
      expect(tree.exists(`src/app/shared/ui/${dep}/src/index.ts`)).toBe(true);
    }
  });

  it('adds the npm deps the copied components import', async () => {
    await uiGenerator(tree, { components: 'carousel', skipFormat: true, skipInstall: true });

    const pkg = readJson(tree, 'package.json');
    expect(pkg.dependencies['embla-carousel']).toBeDefined();
    expect(pkg.dependencies['embla-carousel-angular']).toBeDefined();
    // A component that does NOT use embla must not drag it in.
    const fresh = createTreeWithEmptyWorkspace();
    seedProject(fresh);
    await uiGenerator(fresh, { components: 'switch', skipFormat: true, skipInstall: true });
    expect(readJson(fresh, 'package.json').dependencies['embla-carousel']).toBeUndefined();
  });

  it('records the added components in the manifest', async () => {
    await uiGenerator(tree, { components: 'accordion', skipFormat: true, skipInstall: true });
    expect(readJson(tree, '.blueprint/manifest.json').components).toEqual(
      expect.arrayContaining(['accordion', 'utils']),
    );
  });

  it('is idempotent — a second run for an already-present component is a no-op', async () => {
    await uiGenerator(tree, { components: 'button', skipFormat: true, skipInstall: true });
    const before = readJson(tree, 'tsconfig.json');
    await expect(
      uiGenerator(tree, { components: 'button,utils', skipFormat: true, skipInstall: true }),
    ).resolves.not.toThrow();
    expect(readJson(tree, 'tsconfig.json')).toEqual(before);
  });

  it('does not add a tsconfig path for the flat switcher family', async () => {
    // seed the services so the warning path is quiet
    tree.write('src/app/core/theme/theme.service.ts', 'export class ThemeService {}');
    await uiGenerator(tree, { components: 'theme-switcher', skipFormat: true, skipInstall: true });

    expect(tree.exists('src/app/shared/ui/theme-switcher/theme-switcher.ts')).toBe(true);
    expect(tree.exists('src/app/shared/ui/switch/src/index.ts')).toBe(true); // dep still copied
    const paths = readJson(tree, 'tsconfig.json').compilerOptions.paths;
    expect(paths['@blueprint-platform/ui/theme-switcher']).toBeUndefined();
    expect(paths['@blueprint-platform/ui/switch']).toBeDefined();
  });

  it('--all copies every component', async () => {
    await uiGenerator(tree, { all: true, skipFormat: true, skipInstall: true });
    const all = listAllComponents();
    expect(all.length).toBeGreaterThan(60);
    for (const name of all) {
      const flatFile = tree.exists(`src/app/shared/ui/${name}/${name}.ts`);
      const barrel = tree.exists(`src/app/shared/ui/${name}/src/index.ts`);
      expect(flatFile || barrel).toBe(true);
    }
  });

  it('throws on an unknown component name', async () => {
    await expect(
      uiGenerator(tree, { components: 'not-a-real-component', skipFormat: true, skipInstall: true }),
    ).rejects.toThrow(/unknown component/i);
  });
});
