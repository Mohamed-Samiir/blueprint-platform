import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';
import { readProtectedRouteBranches } from './add-layout-branch';

/**
 * Wrap `app.routes.ts`'s existing top-level route entries as the `children` of
 * one new parent route that lazy-loads a layout shell — so every feature route
 * renders inside that shell's `<router-outlet>`.
 *
 * Generalized from `foundation`'s `patch-app-routes.ts` (which called this same
 * ts-morph mechanism, hardcoded to the four built-in app shells). The caller
 * resolves `layoutImportPath` / `layoutClassName` itself — this helper never
 * assumes a naming convention or reads a catalog.
 *
 * `indexRoute`, if given, is inserted as the shell's own first child (its
 * `path: ''` route) — e.g. a welcome/starter screen — ahead of whatever routes
 * already existed. Omit it for a layout with no such screen to wire in.
 *
 * **Protected branches.** Any existing top-level route whose `path` is listed in
 * `.blueprint/manifest.json`'s `protectedRouteBranches` (written by
 * `addLayoutBranch`, e.g. `modules:auth`'s `auth` branch) is left OUT of the new
 * shell's `children` and re-added as its own top-level sibling instead — it must
 * never end up nested under a later-added main shell. When there's nothing to
 * exclude this degrades to the original wholesale move (same output as before
 * this existed).
 */
export function wrapRoutesUnderLayout(
  tree: Tree,
  appRoot: string,
  options: {
    layoutImportPath: string;
    layoutClassName: string;
    indexRoute?: { importPath: string; className: string };
  },
) {
  const path = `${appRoot}/src/app/app.routes.ts`;
  const source = tree.read(path, 'utf-8');
  if (!source) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  const arrayLiteral = file
    .getVariableDeclarationOrThrow('routes')
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  // Pull out (in original order) any top-level route object whose `path` is
  // protected, before doing the wholesale text move below — everything else
  // (including placeholder comments, which aren't attached to any element when
  // the array is empty) is preserved exactly as before.
  const protectedPaths = new Set(readProtectedRouteBranches(tree, appRoot));
  const protectedTexts: string[] = [];
  if (protectedPaths.size) {
    const elements = arrayLiteral.getElements();
    for (let i = elements.length - 1; i >= 0; i--) {
      const obj = elements[i].asKind(SyntaxKind.ObjectLiteralExpression);
      const pathValue = obj
        ?.getProperty('path')
        ?.asKind(SyntaxKind.PropertyAssignment)
        ?.getInitializerIfKind(SyntaxKind.StringLiteral)
        ?.getLiteralValue();
      if (pathValue !== undefined && protectedPaths.has(pathValue)) {
        protectedTexts.unshift(elements[i].getText());
        arrayLiteral.removeElement(i);
      }
    }
  }

  // Preserve whatever is currently between the brackets — placeholder comments,
  // any entries a template revision might add later — by moving it wholesale
  // into the new `children` array, after the index route (if any).
  const existing = arrayLiteral.getText().slice(1, -1);

  const indexChild = options.indexRoute
    ? `{
        path: '',
        loadComponent: () => import('${options.indexRoute.importPath}').then((m) => m.${options.indexRoute.className}),
      },
      `
    : '';

  const protectedSiblings = protectedTexts.length
    ? '\n  ' + protectedTexts.join(',\n  ') + ','
    : '';

  arrayLiteral.replaceWithText(
    `[
  {
    path: '',
    loadComponent: () =>
      import('${options.layoutImportPath}').then((m) => m.${options.layoutClassName}),
    children: [
      ${indexChild}${existing}
    ],
  },${protectedSiblings}
]`,
  );

  tree.write(path, file.getFullText());
}
