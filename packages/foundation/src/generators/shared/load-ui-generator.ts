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
 * The single `ui` generator from the components pillar — shared by `preset`
 * (starter UI set) and `layout` (a shell's own UI deps), both of which need to
 * delegate UI-component copying to it. `@blueprint-platform/components` is a
 * real `dependencies` entry of this package, so it installs alongside whichever
 * of these generators runs.
 */
export function loadUiGenerator(): UiGenerator {
  try {
    return require('@blueprint-platform/components/generators/ui').default;
  } catch (e) {
    throw new Error(
      '@blueprint-platform/components is required but could not be resolved. ' +
        `Ensure it is installed at a version compatible with this foundation. (${(e as Error).message})`,
    );
  }
}
