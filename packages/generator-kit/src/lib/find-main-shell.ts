import { Tree } from '@nx/devkit';

/**
 * The four real app-shell layouts a module's own nav link belongs in —
 * deliberately NOT `auth-split`/`auth-centered` (or any future content-only
 * shell composed via `foundation:layout`'s `wireRoutes: false`), which must
 * never be treated as a place for a general nav link.
 */
const APP_SHELL_NAMES = ['sidebar-shell', 'floating-shell', 'inset-shell', 'topbar-shell'];

/**
 * Find whichever main app shell is currently present in the generated
 * project, if any. Checks the shell's own `.ts` file (the real component,
 * confirming the shell genuinely exists, not just a stray file) but returns
 * the sibling `.html` path — that's the file `appendNavItem` actually needs,
 * since the `<!-- BP:NAV_ITEMS -->` marker (and every existing nav item) lives
 * in the template, not the component class.
 *
 * `null` means either `layout: 'none'` or no main shell has been added yet —
 * not an error, just nothing to inject a nav link into right now.
 */
export function findExistingMainShell(tree: Tree): { path: string; name: string } | null {
  for (const name of APP_SHELL_NAMES) {
    const tsPath = `src/app/layout/${name}/${name}.ts`;
    if (tree.exists(tsPath)) {
      return { path: `src/app/layout/${name}/${name}.html`, name };
    }
  }
  return null;
}
