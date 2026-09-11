import { Tree, updateJson } from '@nx/devkit';

/**
 * Write one `tsconfig.json` `compilerOptions.paths` alias per name, pointing
 * `<aliasPrefix>/<name>` at `./<sourceDir>/<name>/src/index.ts`.
 *
 * Generalized from the `@blueprint-platform/components:ui` generator's
 * `shared/ui` tsconfig-paths mutation (originally hardcoded to
 * `src/app/shared/ui` / `@blueprint-platform/ui`) so any pillar can register
 * aliased paths for whatever folder it copies into.
 *
 * Takes the already-resolved `names` list rather than doing its own
 * `readdirSync` — the caller (e.g. `components:ui`'s dependency-closure
 * resolver) already knows exactly which names were just added and which of
 * those even have a `src/index.ts` barrel to alias; re-deriving that here
 * would just be a second, possibly-inconsistent filter.
 */
export function registerUiPaths(
  tree: Tree,
  appRoot: string,
  names: string[],
  options: { sourceDir: string; aliasPrefix: string },
) {
  if (!names.length) return;
  const tsconfigPath = `${appRoot}/tsconfig.json`;
  if (!tree.exists(tsconfigPath)) return;

  updateJson(tree, tsconfigPath, (json) => {
    json.compilerOptions ??= {};
    json.compilerOptions.paths ??= {};
    for (const name of names) {
      json.compilerOptions.paths[`${options.aliasPrefix}/${name}`] = [
        `./${options.sourceDir}/${name}/src/index.ts`,
      ];
    }
    return json;
  });
}
