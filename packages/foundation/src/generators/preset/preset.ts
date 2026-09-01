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
import { PresetGeneratorSchema } from './schema';
// import * as compatibility from '../../../compatibility.json';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export default async function (tree: Tree, options: PresetGeneratorSchema) {
  const appRoot = '.';
  const palette = options.palette ?? 'default';
  const rtl = options.rtl ?? false;
  const labelPosition = options.labelPosition ?? 'floating';
  const layout = options.layout ?? 'none';
  const compatibility = JSON.parse(
    readFileSync(join(__dirname, '../../../compatibility.json'), 'utf-8'),
  );

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
    json.dependencies['@angular/cdk'] = '^22.0.0';
    json.dependencies['@spartan-ng/brain'] = '^1.0.0';
    json.dependencies['class-variance-authority'] = '^0.7.0';
    json.dependencies['clsx'] = '^2.1.0';
    json.dependencies['tailwind-merge'] = '^2.5.0';
    json.dependencies['@ng-icons/core'] = '^32.0.0';
    json.dependencies['@ng-icons/lucide'] = '^32.0.0';
    json.dependencies['embla-carousel'] = '^8.0.0';
    json.dependencies['embla-carousel-angular'] = '^22.0.0';
    json.dependencies['ngx-scrollbar'] = '^19.1.0';
    json.devDependencies['tailwindcss'] = '^4.0.0';
    json.devDependencies['@tailwindcss/postcss'] = '^4.0.0';
    json.devDependencies['postcss'] = '^8.4.0';
    //TODO: Re-enable these once we have a way to determine the correct versions of these packages to install
    // json.devDependencies['@blueprint-platform/components'] =
    //   compatibility.components;
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
    { rtl, labelPosition, palette },
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/shared/ui'),
    `${appRoot}/src/app/shared/ui`,
    {},
  );
  const uiComponentsDir = joinPathFragments(__dirname, 'files/shared/ui');
  const uiComponentNames = readdirSync(uiComponentsDir);

  updateJson(tree, 'tsconfig.json', (json) => {
    json.compilerOptions.paths ??= {};
    for (const name of uiComponentNames) {
      json.compilerOptions.paths[`@blueprint-platform/ui/${name}`] = [
        `./src/app/shared/ui/${name}/src/index.ts`,
      ];
    }
    return json;
  });
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/app'),
    `${appRoot}/src/app`,
    {},
  );

  for (const dir of ['shared/components', 'features', 'layout', 'global']) {
    tree.write(`${appRoot}/src/app/${dir}/.gitkeep`, '');
  }

  patchAppConfig(tree, appRoot, { palette, rtl, labelPosition });

  if (layout !== 'none') {
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

    // The UI pieces the shells import (`shared/ui/sidebar`, `dropdown-menu`,
    // `avatar`, `collapsible`, `button`, …) are already copied unconditionally
    // by the `files/shared/ui` generateFiles call above.

    patchAppRoutes(tree, { layout });
  }

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
        components: [],
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
