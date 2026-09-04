import {
  Tree,
  formatFiles,
  generateFiles,
  installPackagesTask,
  joinPathFragments,
  logger,
  updateJson,
} from '@nx/devkit';
import { UiGeneratorSchema } from './schema';
import {
  FLAT_COMPONENTS,
  UI_FILES_DIR,
  listAllComponents,
  resolveClosure,
} from './lib/resolve-deps';
import { npmDepsForComponents } from './lib/npm-deps';

function parseNames(components: string | undefined): string[] {
  return (components ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function uiGenerator(
  tree: Tree,
  options: UiGeneratorSchema,
) {
  const project = options.project ?? '.';
  const uiRoot = `${project}/src/app/shared/ui`;

  const requested = options.all
    ? listAllComponents()
    : parseNames(options.components);

  if (requested.length === 0) {
    throw new Error(
      'ui: pass one or more component names (e.g. `nx g @blueprint-platform/components:ui carousel`) or `--all`.',
    );
  }

  const { closure, missing } = resolveClosure(requested);
  if (missing.length) {
    throw new Error(
      `ui: unknown component(s): ${missing.join(', ')}. Available: ${listAllComponents().sort().join(', ')}`,
    );
  }

  // Only copy what is not already in the project — makes the generator idempotent
  // and safe to point at a project that already has the starter set.
  const toAdd = closure
    .filter((name) => !tree.exists(`${uiRoot}/${name}`))
    .sort();

  if (toAdd.length === 0) {
    logger.info('ui: nothing to do — every requested component is already present.');
    return;
  }

  for (const name of toAdd) {
    generateFiles(
      tree,
      joinPathFragments(UI_FILES_DIR, name),
      `${uiRoot}/${name}`,
      {},
    );
  }

  // tsconfig `paths` for the aliased components (the flat family has no barrel).
  const aliased = toAdd.filter((name) => !FLAT_COMPONENTS.includes(name));
  if (aliased.length && tree.exists(`${project}/tsconfig.json`)) {
    updateJson(tree, `${project}/tsconfig.json`, (json) => {
      json.compilerOptions ??= {};
      json.compilerOptions.paths ??= {};
      for (const name of aliased) {
        json.compilerOptions.paths[`@blueprint-platform/ui/${name}`] = [
          `./src/app/shared/ui/${name}/src/index.ts`,
        ];
      }
      return json;
    });
  }

  // npm deps the newly-added components pull in.
  const deps = npmDepsForComponents(toAdd);
  if (Object.keys(deps).length && tree.exists(`${project}/package.json`)) {
    updateJson(tree, `${project}/package.json`, (json) => {
      json.dependencies ??= {};
      for (const [pkg, range] of Object.entries(deps)) {
        json.dependencies[pkg] ??= range;
      }
      return json;
    });
  }

  // Record what the project now contains.
  const manifestPath = `${project}/.blueprint/manifest.json`;
  if (tree.exists(manifestPath)) {
    updateJson(tree, manifestPath, (json) => {
      const set = new Set<string>([...(json.components ?? []), ...toAdd]);
      json.components = [...set].sort();
      return json;
    });
  }

  // The switcher family imports services that only exist alongside a layout.
  for (const flat of ['theme-switcher', 'language-switcher']) {
    if (!toAdd.includes(flat)) continue;
    const core =
      flat === 'theme-switcher'
        ? `${project}/src/app/core/theme`
        : `${project}/src/app/core/language`;
    if (!tree.exists(core)) {
      logger.warn(
        `ui: added "${flat}" but ${core} is missing — it imports that service. ` +
          'Generate a layout (`nx g @blueprint-platform/foundation:preset --layout=…`) or add the service manually.',
      );
    }
  }

  logger.info(`ui: added ${toAdd.join(', ')}.`);

  if (!options.skipFormat) await formatFiles(tree);
  if (!options.skipInstall) return () => installPackagesTask(tree);
  return;
}
