import { Tree, formatFiles, generateFiles, joinPathFragments, logger, readJson } from '@nx/devkit';
import {
  appendChildRoutes,
  appendNavItem,
  appendToManifest,
  findExistingMainShell,
  LayoutBranchChild,
} from '@blueprint-platform/generator-kit';
import { loadUiGenerator } from '../shared/load-ui-generator';
import { scanUiImports } from '../shared/scan-ui-imports';
import { RbacGeneratorSchema } from './schema';

/**
 * Add the RBAC module to an existing project: permission/role models +
 * services (backed by `RbacStorage`, a `localStorage` wrapper — a stand-in for
 * a real backend, same mock-persistence choice `modules:auth` makes),
 * `CURRENT_USER_PERMISSIONS` + its self-contained `RbacDemoSessionService`
 * default, `permissionGuard`, the permissions/roles admin pages, and the
 * `forbidden` deny-path page — then wires it all as ORDINARY feature routes
 * inside whatever main shell already exists (`appendChildRoutes`), never a
 * standalone sibling branch the way `modules:auth`'s login/signup pages are.
 *
 * **Deliberately has no relationship with `modules:auth`, in either
 * direction** — no dependency on `@blueprint-platform/foundation` even (unlike
 * `modules:auth`, this generator never composes into `foundation:layout`,
 * since RBAC has no layout of its own to add). `CURRENT_USER_PERMISSIONS` is
 * RBAC's *only* integration point with any auth setup — see
 * `core/rbac/current-user-permissions.token.ts` for the one-line override a
 * real project provides in its own `app.config.ts`.
 */
export default async function (tree: Tree, options: RbacGeneratorSchema) {
  const appRoot = '.';
  const routePrefix = options.routePrefix ?? 'admin';

  // Not meant to be run twice against the same project — a second run would
  // duplicate the route tree (appendChildRoutes doesn't de-duplicate; that's
  // the caller's job, same as modules:auth's own guard).
  const manifestPath = `${appRoot}/.blueprint/manifest.json`;
  if (tree.exists(manifestPath)) {
    const manifest = readJson<Record<string, unknown>>(tree, manifestPath);
    if (Array.isArray(manifest.modules) && manifest.modules.includes('rbac')) {
      logger.info('modules:rbac: the rbac module is already present in this project — nothing to do.');
      return;
    }
  }

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/core/rbac'),
    `${appRoot}/src/app/core/rbac`,
    {},
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/features/rbac'),
    `${appRoot}/src/app/features/rbac`,
    {},
  );

  // The admin pages' own UI-component needs — computed from what's actually
  // imported, not hardcoded, same discipline as `modules:auth`'s own
  // `scanUiImports` call (now shared between the two generators rather than
  // living only under `auth/lib/`). Anything already present (e.g. from
  // `preset`'s starter set) is skipped by `ui` itself.
  const uiGenerator = loadUiGenerator();
  await uiGenerator(tree, {
    components: scanUiImports(tree, `${appRoot}/src/app/features/rbac`).join(','),
    skipFormat: true,
    skipInstall: true,
  });

  // Route tree mirrors blueprint-reference's RBAC_ROUTES nesting exactly
  // (permissions/roles each: '' list, 'new' form, ':id/edit' form) rather than
  // flattening to single path strings — permission-form.ts/role-form.ts
  // navigate back to their list with `router.navigate(['..'] or ['..','..'],
  // { relativeTo: this.route })`, which depends on the ROUTE-CONFIG nesting
  // depth matching, not just the URL string.
  const permissionsBase = './features/rbac/permissions';
  const rolesBase = './features/rbac/roles';

  const permissionsChildren: LayoutBranchChild[] = [
    {
      path: '',
      componentImportPath: `${permissionsBase}/permissions-list/permissions-list`,
      componentClassName: 'PermissionsList',
    },
    {
      path: 'new',
      componentImportPath: `${permissionsBase}/permission-form/permission-form`,
      componentClassName: 'PermissionForm',
    },
    {
      path: ':id',
      children: [
        {
          path: 'edit',
          componentImportPath: `${permissionsBase}/permission-form/permission-form`,
          componentClassName: 'PermissionForm',
        },
      ],
    },
  ];
  const rolesChildren: LayoutBranchChild[] = [
    {
      path: '',
      componentImportPath: `${rolesBase}/roles-list/roles-list`,
      componentClassName: 'RolesList',
    },
    {
      path: 'new',
      componentImportPath: `${rolesBase}/role-form/role-form`,
      componentClassName: 'RoleForm',
    },
    {
      path: ':id',
      children: [
        {
          path: 'edit',
          componentImportPath: `${rolesBase}/role-form/role-form`,
          componentClassName: 'RoleForm',
        },
      ],
    },
  ];

  appendChildRoutes(tree, appRoot, [
    {
      path: routePrefix,
      children: [
        { path: '', redirectTo: 'permissions', pathMatch: 'full' },
        { path: 'permissions', children: permissionsChildren },
        { path: 'roles', children: rolesChildren },
      ],
    },
    // Mounted OUTSIDE the routePrefix group, deliberately — permissionGuard
    // redirects to the fixed absolute '/forbidden', independent of whatever
    // routePrefix was chosen.
    {
      path: 'forbidden',
      componentImportPath: './features/rbac/forbidden/forbidden',
      componentClassName: 'Forbidden',
    },
  ]);

  // No app.config.ts provider patch — CURRENT_USER_PERMISSIONS is
  // `providedIn: 'root'` with a self-contained factory (RbacDemoSessionService),
  // so RBAC works with zero wiring, by design (see the token file's doc
  // comment for the override any real auth setup provides).

  appendToManifest(tree, appRoot, 'modules', 'rbac');

  // Each module adds its own nav link, unconditionally, wherever it's run —
  // not a separate composition step. Whatever main app shell is currently
  // present (never `auth-split`/`auth-centered`, which `findExistingMainShell`
  // never matches) gets Roles + Permissions; `layout: 'none'` (no shell to
  // inject into) is not an error, just nothing to do yet — see the
  // `foundation:layout`-added-later limitation documented in CLAUDE.md.
  const shell = findExistingMainShell(tree);
  if (shell) {
    appendNavItem(tree, shell.path, {
      label: 'Roles',
      routerLink: `/${routePrefix}/roles`,
      icon: 'lucideShield',
    });
    appendNavItem(tree, shell.path, {
      label: 'Permissions',
      routerLink: `/${routePrefix}/permissions`,
      icon: 'lucideKeyRound',
    });
  } else {
    logger.info(
      'modules:rbac: no main app shell present yet (layout: none) — no nav link added. ' +
        'Adding a shell later via `foundation:layout` will not retroactively add one either (a known, documented limitation).',
    );
  }

  await formatFiles(tree);
}
