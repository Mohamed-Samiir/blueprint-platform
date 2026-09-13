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
import { UserManagementGeneratorSchema } from './schema';

/**
 * Add the user-management module to an existing project: `ManagedUser` model
 * + mock-backed `UserService` (`UserStorage`-backed, same mock-persistence
 * choice `modules:auth`/`modules:rbac` make), the users list (avatar
 * thumbnail, status badge, row actions), the shared `UserForm` + its
 * `add-user`/`edit-user` thin hosts, and the details/change-role/deactivate
 * dialogs — then wires the routed pieces as ORDINARY feature routes inside
 * whatever main shell already exists (`appendChildRoutes`, the same helper
 * built for `modules:rbac`), never a standalone sibling branch.
 *
 * **A simpler sync than `auth` or `rbac`: zero dependency on either, in
 * either direction.** No `@blueprint-platform/foundation` dependency (no
 * layout of its own — doesn't even need `foundation:layout` the way `rbac`
 * needs it for nothing either), no `app.config.ts` provider patch (no token,
 * no interceptor, no guard this module needs), no import of anything under
 * `core/auth` or `core/rbac` anywhere in its copied output.
 *
 * **`details-user` is a dialog, not a route** (confirmed against the actual
 * reference build, `features/user-management/details-user/details-user.ts`'s
 * own doc comment: "matching the list's own action pattern
 * (deactivate/change-role are also dialogs, not routes)") — `users-list.ts`
 * opens it imperatively via `viewChild(...).open(user)`, same as the other
 * two dialogs. Only `UsersList`, `AddUser`, and `EditUser` are routed.
 */
export default async function (tree: Tree, options: UserManagementGeneratorSchema) {
  const appRoot = '.';
  const routePrefix = options.routePrefix ?? 'admin/users';

  // Not meant to be run twice against the same project — appendChildRoutes
  // doesn't de-duplicate; that's the caller's job, same as auth/rbac's guard.
  const manifestPath = `${appRoot}/.blueprint/manifest.json`;
  if (tree.exists(manifestPath)) {
    const manifest = readJson<Record<string, unknown>>(tree, manifestPath);
    if (Array.isArray(manifest.modules) && manifest.modules.includes('user-management')) {
      logger.info(
        'modules:user-management: the user-management module is already present in this project — nothing to do.',
      );
      return;
    }
  }

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/core/user-management'),
    `${appRoot}/src/app/core/user-management`,
    {},
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/features/user-management'),
    `${appRoot}/src/app/features/user-management`,
    {},
  );

  // The users-list/forms/dialogs' own UI-component needs — computed from what's
  // actually imported, not hardcoded, same discipline `auth` and `rbac` use
  // (shared `scanUiImports`). Anything already present (e.g. from `preset`'s
  // starter set) is skipped by `ui` itself.
  const uiGenerator = loadUiGenerator();
  await uiGenerator(tree, {
    components: scanUiImports(tree, `${appRoot}/src/app/features/user-management`).join(','),
    skipFormat: true,
    skipInstall: true,
  });

  // Route tree mirrors blueprint-reference's USER_MANAGEMENT_ROUTES nesting
  // exactly (routePrefix → '' list / 'new' add / ':id/edit' edit) rather than
  // flattening to single path strings — user-form.ts's Cancel link and
  // add-user.ts/edit-user.ts's post-submit navigation all use
  // `router.navigate(['..'] or ['..','..'], { relativeTo })`, which depends on
  // route-CONFIG nesting depth matching, exactly the same reasoning that drove
  // `modules:rbac`'s route tree shape.
  const featuresBase = './features/user-management';
  const children: LayoutBranchChild[] = [
    {
      path: '',
      componentImportPath: `${featuresBase}/users-list/users-list`,
      componentClassName: 'UsersList',
    },
    {
      path: 'new',
      componentImportPath: `${featuresBase}/add-user/add-user`,
      componentClassName: 'AddUser',
    },
    {
      path: ':id',
      children: [
        {
          path: 'edit',
          componentImportPath: `${featuresBase}/edit-user/edit-user`,
          componentClassName: 'EditUser',
        },
      ],
    },
  ];

  appendChildRoutes(tree, appRoot, [{ path: routePrefix, children }]);

  // No app.config.ts patch — this module needs no new provider (no token, no
  // interceptor, no guard), by design.

  appendToManifest(tree, appRoot, 'modules', 'user-management');

  // Each module adds its own nav link, unconditionally, wherever it's run —
  // not a separate composition step. `layout: 'none'` (no shell to inject
  // into) is not an error, just nothing to do yet — see the
  // `foundation:layout`-added-later limitation documented in CLAUDE.md.
  const shell = findExistingMainShell(tree);
  if (shell) {
    appendNavItem(tree, shell.path, {
      label: 'User Management',
      routerLink: `/${routePrefix}`,
      icon: 'lucideUsers',
    });
  } else {
    logger.info(
      'modules:user-management: no main app shell present yet (layout: none) — no nav link added. ' +
        'Adding a shell later via `foundation:layout` will not retroactively add one either (a known, documented limitation).',
    );
  }

  await formatFiles(tree);
}
