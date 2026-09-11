import { Tree, readJson, updateJson } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * One route node under a branch added by {@link addLayoutBranch}. Recursive so a
 * branch can express a nested sub-flow (e.g. auth's `forgot-password/{email,code,new}`)
 * without a second helper — a leaf sets `componentImportPath`/`componentClassName`,
 * a redirect-only node sets `redirectTo`/`pathMatch`, a nesting node sets `children`.
 */
export interface LayoutBranchChild {
  path: string;
  componentImportPath?: string;
  componentClassName?: string;
  redirectTo?: string;
  pathMatch?: 'full' | 'prefix';
  children?: LayoutBranchChild[];
}

function renderChild(child: LayoutBranchChild): string {
  const parts = [`path: '${child.path}'`];
  if (child.redirectTo !== undefined) {
    parts.push(`redirectTo: '${child.redirectTo}'`);
  }
  if (child.pathMatch) {
    parts.push(`pathMatch: '${child.pathMatch}'`);
  }
  if (child.componentImportPath && child.componentClassName) {
    parts.push(
      `loadComponent: () =>\n      import('${child.componentImportPath}').then((m) => m.${child.componentClassName})`,
    );
  }
  if (child.children?.length) {
    parts.push(
      `children: [\n      ${child.children.map(renderChild).join(',\n      ')},\n    ]`,
    );
  }
  return `{ ${parts.join(', ')} }`;
}

/**
 * Read `.blueprint/manifest.json`'s `protectedRouteBranches` — top-level route
 * paths that must never be swept into a later-added main shell by
 * {@link import('./wrap-routes-under-layout').wrapRoutesUnderLayout}. `[]` if the
 * manifest doesn't exist yet or has no such field.
 */
export function readProtectedRouteBranches(tree: Tree, appRoot: string): string[] {
  const manifestPath = `${appRoot}/.blueprint/manifest.json`;
  if (!tree.exists(manifestPath)) return [];
  const manifest = readJson<Record<string, unknown>>(tree, manifestPath);
  return Array.isArray(manifest.protectedRouteBranches)
    ? (manifest.protectedRouteBranches as string[])
    : [];
}

/**
 * Add a brand-new top-level route entry (`options.path`) with its own
 * `children` to `app.routes.ts` — genuinely different from
 * `wrapRoutesUnderLayout`: it never touches or wraps any pre-existing route, it
 * only appends a sibling. Built for branches like `auth` that must stay outside
 * whatever main shell gets added later (see `protectedRouteBranches` below).
 *
 * Also records `options.path` in `.blueprint/manifest.json`'s
 * `protectedRouteBranches` array (idempotent, sorted — a no-op if the manifest
 * doesn't exist), so a later `wrapRoutesUnderLayout` call (main-shell addition)
 * knows to exclude it when sweeping existing top-level routes into the new
 * shell's children.
 */
export function addLayoutBranch(
  tree: Tree,
  appRoot: string,
  options: {
    path: string;
    layoutImportPath: string;
    layoutClassName: string;
    children: LayoutBranchChild[];
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

  const childrenText = options.children.map(renderChild).join(',\n      ');

  arrayLiteral.addElement(
    `{
    path: '${options.path}',
    loadComponent: () =>
      import('${options.layoutImportPath}').then((m) => m.${options.layoutClassName}),
    children: [
      ${childrenText}
    ],
  }`,
  );

  tree.write(path, file.getFullText());

  const manifestPath = `${appRoot}/.blueprint/manifest.json`;
  if (tree.exists(manifestPath)) {
    updateJson(tree, manifestPath, (json) => {
      const current: string[] = Array.isArray(json.protectedRouteBranches)
        ? json.protectedRouteBranches
        : [];
      if (!current.includes(options.path)) {
        json.protectedRouteBranches = [...current, options.path].sort();
      }
      return json;
    });
  }
}
