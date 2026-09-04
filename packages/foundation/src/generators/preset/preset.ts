import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  installPackagesTask,
  updateJson,
} from '@nx/devkit';
import { applicationGenerator } from '@nx/angular/generators';
import { Project } from 'ts-morph';
import { patchAppConfig } from './lib/patch-app-config';
import { patchAppRoutes } from './lib/patch-app-routes';
import { patchAppComponent } from './lib/patch-app-component';
import { PresetGeneratorSchema } from './schema';
// import * as compatibility from '../../../compatibility.json';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * The starter UI kit `preset` ships: `utils`, every form control, and the
 * overlay ("popup") family. Transitive in-kit deps (`calendar`, `separator`, …)
 * are pulled in automatically by the `ui` generator. Everything else is added
 * on demand later via `nx g @blueprint-platform/components:ui <name>`.
 */
const STARTER_UI = [
  'utils',
  // form controls
  'button',
  'checkbox',
  'input',
  'input-group',
  'input-otp',
  'label',
  'field',
  'native-select',
  'radio-group',
  'select',
  'slider',
  'switch',
  'textarea',
  'toggle',
  'toggle-group',
  'combobox',
  'autocomplete',
  'date-picker',
  // overlay / popup family
  'popover',
  'dialog',
  'sheet',
  'drawer',
  'tooltip',
  'hover-card',
  'dropdown-menu',
  'context-menu',
  'alert-dialog',
];

/** The account-menu family has no barrel and is always added alongside a layout. */
const LAYOUT_UI_EXTRAS = ['user-menu', 'theme-switcher', 'language-switcher'];

type UiGenerator = (
  tree: Tree,
  options: {
    components?: string;
    all?: boolean;
    project?: string;
    skipFormat?: boolean;
    skipInstall?: boolean;
  },
) => Promise<unknown> | unknown;

/** The single `ui` generator from the components pillar (installed as a dep). */
function loadUiGenerator(): UiGenerator {
  try {
    return require('@blueprint-platform/components/generators/ui').default;
  } catch (e) {
    throw new Error(
      '@blueprint-platform/components is required by the preset but could not be resolved. ' +
        `Ensure it is installed at a version compatible with this foundation. (${(e as Error).message})`,
    );
  }
}

/** `@blueprint-platform/ui/<name>` specifiers referenced by a layout shell's own source. */
function layoutShellUiImports(layout: string): string[] {
  const dir = join(__dirname, 'files/layout', layout);
  const names = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts')) continue;
    const src = readFileSync(join(dir, file), 'utf-8');
    for (const m of src.matchAll(/@blueprint-platform\/ui\/([a-z0-9-]+)/g)) {
      names.add(m[1]);
    }
  }
  return [...names];
}

export default async function (tree: Tree, options: PresetGeneratorSchema) {
  const appRoot = '.';
  const palette = options.palette ?? 'default';
  const rtl = options.rtl ?? false;
  const labelPosition = options.labelPosition ?? 'floating';
  const layout = options.layout ?? 'none';
  const showThemeSwitcher = options.showThemeSwitcher ?? true;
  const showLanguageSwitcher = options.showLanguageSwitcher ?? true;
  const compatibility = JSON.parse(
    readFileSync(join(__dirname, '../../../compatibility.json'), 'utf-8'),
  );
  const uiGenerator = loadUiGenerator();

  await applicationGenerator(tree, {
    name: options.name,
    directory: '.',
    rootProject: true,
    style: 'scss',
    // standalone: true,
    routing: false,
  });

  updateJson(tree, 'package.json', (json) => {
    json.dependencies ??= {};
    json.devDependencies ??= {};
    // Base runtime deps every generated project needs regardless of which UI
    // components ship. The spartan / cva / clsx / ng-icons / embla / scrollbar
    // deps are added by the `ui` generator for exactly the components it copies.
    json.dependencies['@angular/cdk'] = '^22.0.0';
    json.devDependencies['tailwindcss'] = '^4.0.0';
    json.devDependencies['@tailwindcss/postcss'] = '^4.0.0';
    json.devDependencies['postcss'] = '^8.4.0';
    // The `ui` generator lives here — kept as a devDependency so the project can
    // add more components later (`nx g @blueprint-platform/components:ui <name>`).
    json.devDependencies['@blueprint-platform/components'] = compatibility.components;
    //TODO: Re-enable once we have a way to determine compatible versions.
    // json.devDependencies['@blueprint-platform/modules'] = compatibility.modules;
    return json;
  });

  tree.write(
    `${appRoot}/.postcssrc.json`,
    JSON.stringify({ plugins: { '@tailwindcss/postcss': {} } }, null, 2),
  );

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/styles'),
    `${appRoot}/src/styles`,
    { palette },
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/config'),
    `${appRoot}/src/app/core/config`,
    { rtl, labelPosition, palette, showThemeSwitcher, showLanguageSwitcher },
  );
  // Starter UI kit — delegated to the components pillar's `ui` generator, which
  // copies each component + its in-kit deps, writes the `@blueprint-platform/ui/*`
  // tsconfig paths, and adds the npm deps that set needs.
  await uiGenerator(tree, {
    components: STARTER_UI.join(','),
    skipFormat: true,
    skipInstall: true,
  });

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/app'),
    `${appRoot}/src/app`,
    {},
  );

  // Starter screen — rendered directly by `app.ts` for `layout: 'none'`, or as
  // the shell's index route for a layout (see `patchAppComponent` / `patchAppRoutes`).
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/welcome'),
    `${appRoot}/src/app`,
    { name: options.name },
  );

  for (const dir of ['shared/components', 'features', 'layout', 'global']) {
    tree.write(`${appRoot}/src/app/${dir}/.gitkeep`, '');
  }

  patchAppConfig(tree, appRoot, { palette, rtl, labelPosition });

  if (layout !== 'none') {
    // The theme / language services back the switchers rendered inside the
    // shell's `<app-user-menu>`; without layout chrome they have nowhere to be
    // used, so they are only emitted alongside a shell.
    generateFiles(
      tree,
      joinPathFragments(__dirname, 'files/theme'),
      `${appRoot}/src/app/core/theme`,
      {},
    );
    generateFiles(
      tree,
      joinPathFragments(__dirname, 'files/language'),
      `${appRoot}/src/app/core/language`,
      {},
    );

    generateFiles(
      tree,
      joinPathFragments(__dirname, `files/layout/${layout}`),
      `${appRoot}/src/app/layout/${layout}`,
      {},
    );

    // `sidebar-item-flyout.ts` is stored once at the `files/layout/` root and
    // shared (via a `../` import) by the shells that use it. In a generated
    // project only one shell is copied, so for the two shells that import it,
    // drop a local copy beside the shell and repoint the import so the layout
    // folder is self-contained. The other shells never reference it, so it is
    // absent from their generated output entirely.
    if (layout === 'sidebar-shell' || layout === 'topbar-shell') {
      tree.write(
        `${appRoot}/src/app/layout/${layout}/sidebar-item-flyout.ts`,
        readFileSync(
          join(__dirname, 'files/layout/sidebar-item-flyout.ts'),
          'utf-8',
        ),
      );

      const shellPath = `${appRoot}/src/app/layout/${layout}/${layout}.ts`;
      const shellSource = tree.read(shellPath, 'utf-8');
      if (shellSource) {
        const project = new Project({ useInMemoryFileSystem: true });
        const shellFile = project.createSourceFile(shellPath, shellSource);
        shellFile
          .getImportDeclaration(
            (d) => d.getModuleSpecifierValue() === '../sidebar-item-flyout',
          )
          ?.setModuleSpecifier('./sidebar-item-flyout');
        tree.write(shellPath, shellFile.getFullText());
      }
    }

    // The UI pieces the selected shell imports (`sidebar`, `dropdown-menu`,
    // `collapsible`, …) plus the account-menu family — added via the same `ui`
    // generator, which resolves their in-kit deps and npm deps. Anything already
    // in the starter set is skipped.
    await uiGenerator(tree, {
      components: [...layoutShellUiImports(layout), ...LAYOUT_UI_EXTRAS].join(','),
      skipFormat: true,
      skipInstall: true,
    });

    patchAppRoutes(tree, { layout });
  }

  // Swap the Nx starter component for `<app-welcome />` (layout none) or
  // `<router-outlet />` (layout selected) in `app.ts` / `app.html`.
  patchAppComponent(tree, appRoot, { layout });

  const installedUiComponents = tree
    .children(`${appRoot}/src/app/shared/ui`)
    .sort();

  tree.write(
    `${appRoot}/.blueprint/manifest.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        channel: process.env.BLUEPRINT_CHANNEL ?? 'stable',
        versions: { ...compatibility },
        palette,
        rtl,
        labelPosition,
        layout,
        showThemeSwitcher,
        showLanguageSwitcher,
        components: installedUiComponents,
        modules: [],
        template: null,
      },
      null,
      2,
    ),
  );

  updateJson(tree, 'package.json', (json) => {
    delete json.dependencies['@blueprint-platform/foundation'];
    return json;
  });

  await formatFiles(tree);
  return () => installPackagesTask(tree);
}
