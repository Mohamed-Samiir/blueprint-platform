import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  installPackagesTask,
  updateJson,
} from '@nx/devkit';
import { applicationGenerator } from '@nx/angular/generators';
import { patchAppConfig } from './lib/patch-app-config';
import { PresetGeneratorSchema } from './schema';
// import * as compatibility from '../../../compatibility.json';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export default async function (tree: Tree, options: PresetGeneratorSchema) {
  const appRoot = '.';
  const palette = options.palette ?? 'default';
  const rtl = options.rtl ?? false;
  const labelPosition = options.labelPosition ?? 'floating';
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
