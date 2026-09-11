import { Tree, updateJson } from '@nx/devkit';

/**
 * Add the `dev` / `test` / `stg` / `prd` build + serve configurations to the
 * generated project's `project.json`, and wire the dev-server proxy.
 *
 * `@angular/build:application` configurations have **no `extends`** mechanism
 * (verified against the Angular 22 builder schema — there is no configuration
 * inheritance in the architect), so the `optimization` / `sourceMap` /
 * `extractLicenses` overrides are spelled out per configuration instead of
 * inherited from `development` / `production`:
 *   - dev / test  → unoptimised, source-mapped (mirrors the base `development`)
 *   - stg / prd   → optimised, hashed output (mirrors the base `production`)
 *
 * Each configuration only differs by which `environment.*.ts` replaces
 * `environment.ts` at build time.
 */
export function patchProjectEnvironments(tree: Tree, appRoot: string) {
  updateJson(tree, `${appRoot}/project.json`, (json) => {
    const name: string = json.name;

    const fileReplacements = (env: string) => [
      {
        replace: 'src/environments/environment.ts',
        with: `src/environments/environment.${env}.ts`,
      },
    ];

    const build = json.targets.build;
    build.configurations ??= {};
    Object.assign(build.configurations, {
      dev: {
        fileReplacements: fileReplacements('dev'),
        optimization: false,
        extractLicenses: false,
        sourceMap: true,
      },
      test: {
        fileReplacements: fileReplacements('test'),
        optimization: false,
        extractLicenses: false,
        sourceMap: true,
      },
      stg: {
        fileReplacements: fileReplacements('stg'),
        optimization: true,
        outputHashing: 'all',
      },
      prd: {
        fileReplacements: fileReplacements('prd'),
        optimization: true,
        outputHashing: 'all',
      },
    });

    const serve = json.targets.serve;
    serve.options = { ...(serve.options ?? {}), proxyConfig: 'proxy.config.json' };
    serve.configurations ??= {};
    for (const env of ['dev', 'test', 'stg', 'prd']) {
      serve.configurations[env] = { buildTarget: `${name}:build:${env}` };
    }

    return json;
  });
}
