import { Tree } from '@nx/devkit';

export type LayoutGenerator = (
  tree: Tree,
  options: { name: string; wireRoutes?: boolean; withAccountMenu?: boolean },
) => Promise<unknown> | unknown;

/**
 * The standalone `foundation:layout` generator, called in-process so
 * `modules:auth` can add its `auth-split`/`auth-centered` shell through the
 * same catalog + UI-dependency-resolution machinery the four main app shells
 * use, rather than owning a second copy of that logic. `@blueprint-platform/foundation`
 * is a real `dependencies` entry of this package.
 */
export function loadLayoutGenerator(): LayoutGenerator {
  try {
    return require('@blueprint-platform/foundation/generators/layout').default;
  } catch (e) {
    throw new Error(
      '@blueprint-platform/foundation is required but could not be resolved. ' +
        `Ensure it is installed at a version compatible with this project. (${(e as Error).message})`,
    );
  }
}
