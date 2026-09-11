import { Tree } from '@nx/devkit';

/**
 * `@blueprint-platform/ui/<name>` specifiers referenced anywhere under `dir`
 * (recursive — the auth forms live one level deeper than a layout shell's own
 * flat folder, e.g. `features/auth/forms/login-form/login-form.ts`).
 * Generalized from `foundation`'s `layout.ts` `shellUiImports`, which only
 * needs one flat level.
 */
export function scanUiImports(tree: Tree, dir: string): string[] {
  const names = new Set<string>();

  const walk = (current: string) => {
    for (const child of tree.children(current)) {
      const full = `${current}/${child}`;
      if (tree.isFile(full)) {
        if (!full.endsWith('.ts')) continue;
        const src = tree.read(full, 'utf-8') ?? '';
        for (const m of src.matchAll(/@blueprint-platform\/ui\/([a-z0-9-]+)/g)) {
          names.add(m[1]);
        }
      } else {
        walk(full);
      }
    }
  };
  walk(dir);

  return [...names];
}
