import { flagsToArgs, runGenerator } from './exec';

/**
 * Add one layout shell to an already-generated project. `name` should be one
 * of the four real app-shell names from `listLayouts()` — `auth-split`/
 * `auth-centered` exist in the catalog but are never meant to be offered as a
 * top-level "add a layout" choice (they're `modules:auth`'s own content-only
 * shells), so this function doesn't reject them itself; the caller (the
 * `blueprint` CLI's prompt) is what keeps them out of the offered list.
 */
export function runFoundationLayout(cwd: string, name: string, registry?: string): Promise<string> {
  return runGenerator(cwd, '@blueprint-platform/foundation:layout', [`--name=${name}`], registry);
}

/** Add one or more UI-kit components to an already-generated project. */
export function runComponentsUi(
  cwd: string,
  names: string[],
  registry?: string,
): Promise<string> {
  return runGenerator(
    cwd,
    '@blueprint-platform/components:ui',
    [`--components=${names.join(',')}`],
    registry,
  );
}

/** Add one business module (`auth`/`rbac`/`user-management`) to an already-generated project, with its own generator-specific flags. */
export function runModule(
  cwd: string,
  moduleName: 'auth' | 'rbac' | 'user-management',
  flags: Record<string, unknown>,
  registry?: string,
): Promise<string> {
  return runGenerator(cwd, `@blueprint-platform/modules:${moduleName}`, flagsToArgs(flags), registry);
}
