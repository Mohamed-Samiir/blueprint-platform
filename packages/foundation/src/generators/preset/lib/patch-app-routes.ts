import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Routing composition for a selected layout shell.
 *
 * Kept separate from `patch-app-config.ts` (which owns providers/imports in
 * `app.config.ts`) — wiring the route tree is a distinct concern.
 *
 * When a layout is selected, the whole feature-route array is nested as the
 * `children` of a single parent route that lazy-loads the shell component, so
 * every feature renders inside the shell's `<router-outlet>`.
 *
 * `options.layout` is the folder name of the shell as it exists under
 * `files/layout/` (e.g. `sidebar-shell`), which is also the folder and entry
 * file name in the generated project (`src/app/layout/sidebar-shell/sidebar-shell.ts`).
 */
export function patchAppRoutes(tree: Tree, options: { layout: string }) {
  if (options.layout === 'none') return;

  const path = 'src/app/app.routes.ts';
  const source = tree.read(path, 'utf-8');
  if (!source) return;

  const shell = options.layout;
  const className = readShellClassName(shell);

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  const arrayLiteral = file
    .getVariableDeclarationOrThrow('routes')
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  // Preserve whatever is currently between the brackets — the
  // "Feature routes are added here automatically…" comment and any
  // entries a template revision might add later — by moving it wholesale
  // into the new `children` array.
  const existing = arrayLiteral.getText().slice(1, -1);

  arrayLiteral.replaceWithText(
    `[
  {
    path: '',
    loadComponent: () =>
      import('./layout/${shell}/${shell}').then((m) => m.${className}),
    children: [${existing}],
  },
]`,
  );

  tree.write(path, file.getFullText());
}

/**
 * Read the shell's real exported class name from its copied source rather
 * than assuming a `PascalCase(layout)` convention.
 */
function readShellClassName(shell: string): string {
  const shellSource = readFileSync(
    join(__dirname, '..', 'files', 'layout', shell, `${shell}.ts`),
    'utf-8',
  );
  const match = shellSource.match(/export\s+class\s+([A-Za-z0-9_$]+)/);
  if (!match) {
    throw new Error(
      `patch-app-routes: could not find an exported class in ${shell}/${shell}.ts`,
    );
  }
  return match[1];
}
