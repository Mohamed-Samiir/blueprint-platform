import { Tree } from '@nx/devkit';

export type UiGenerator = (
  tree: Tree,
  options: {
    components?: string;
    all?: boolean;
    project?: string;
    skipFormat?: boolean;
    skipInstall?: boolean;
  },
) => Promise<unknown> | unknown;

/**
 * The `ui` generator from the components pillar — needed here because the auth
 * module's forms use UI pieces (`alert`, `spinner`, `card`, …) that aren't
 * necessarily part of `preset`'s starter set. Same loader shape as
 * `foundation`'s (`generators/shared/load-ui-generator.ts`) — `components` is
 * always present in a project this generator can run against, since it's a
 * transitive dependency through `@blueprint-platform/foundation`.
 */
export function loadUiGenerator(): UiGenerator {
  try {
    return require('@blueprint-platform/components/generators/ui').default;
  } catch (e) {
    throw new Error(
      '@blueprint-platform/components is required but could not be resolved. ' +
        `Ensure it is installed at a version compatible with this project. (${(e as Error).message})`,
    );
  }
}
