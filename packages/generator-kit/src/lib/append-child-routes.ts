import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';
import { readProtectedRouteBranches, renderChild, LayoutBranchChild } from './add-layout-branch';

/**
 * Append ordinary feature routes (e.g. RBAC's admin pages) into whichever
 * route already holds the app's main content — the existing main shell's
 * `children` array if one was added by {@link import('./wrap-routes-under-layout').wrapRoutesUnderLayout},
 * or the flat top-level `routes` array itself when there's no shell at all
 * (`layout: 'none'`).
 *
 * Genuinely different from the other two routing helpers, not a variant of
 * either: `wrapRoutesUnderLayout` wraps *everything that already exists* under
 * a *brand-new* shell; `addLayoutBranch` adds a *new top-level sibling branch*
 * that must stay outside any shell forever (e.g. `modules:auth`'s `auth`).
 * This one is for routes that belong *inside* whatever shell already exists —
 * they're ordinary feature content, not a standalone branch and not a shell of
 * their own.
 *
 * The "main" route is identified as the one top-level entry that both has its
 * own `children` array AND whose `path` is NOT listed in
 * `.blueprint/manifest.json`'s `protectedRouteBranches` — an `addLayoutBranch`
 * sibling (e.g. `auth`) also has `children`, but is never mistaken for the main
 * shell because its `path` is protected. If no such entry exists (`layout:
 * 'none'` — the routes array is flat), `newChildren` are appended as plain
 * top-level entries instead.
 *
 * `newChildren` reuses {@link LayoutBranchChild} (recursive: `children`,
 * `redirectTo`/`pathMatch`, or a `componentImportPath`/`componentClassName`
 * leaf) rather than a flat-only shape — a real nested route tree (e.g.
 * `permissions` → `''` / `new` / `:id/edit`) needs to preserve that nesting so
 * relative in-app navigation (`router.navigate(['..'], { relativeTo })`)
 * resolves to the right depth, the same as it does in `blueprint-reference`.
 */
export function appendChildRoutes(
  tree: Tree,
  appRoot: string,
  newChildren: LayoutBranchChild[],
) {
  const path = `${appRoot}/src/app/app.routes.ts`;
  const source = tree.read(path, 'utf-8');
  if (!source) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  const arrayLiteral = file
    .getVariableDeclarationOrThrow('routes')
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  const protectedPaths = new Set(readProtectedRouteBranches(tree, appRoot));

  let target = arrayLiteral;
  for (const el of arrayLiteral.getElements()) {
    const obj = el.asKind(SyntaxKind.ObjectLiteralExpression);
    if (!obj) continue;
    const pathValue = obj
      .getProperty('path')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializerIfKind(SyntaxKind.StringLiteral)
      ?.getLiteralValue();
    if (pathValue === undefined || protectedPaths.has(pathValue)) continue;

    const childrenArray = obj
      .getProperty('children')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
    if (childrenArray) {
      target = childrenArray;
      break;
    }
  }

  for (const child of newChildren) {
    target.addElement(renderChild(child));
  }

  tree.write(path, file.getFullText());
}
