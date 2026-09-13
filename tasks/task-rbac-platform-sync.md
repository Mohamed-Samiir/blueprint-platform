# Task list: RBAC → `@blueprint-platform/modules`, fully decoupled from auth

**Run from `blueprint-platform`, with `blueprint-reference` added via `/add-dir`** (home = wherever the writes happen, per the earlier established rule — this task list writes mostly to `blueprint-platform`, with one small necessary fix in `blueprint-reference` first). Read `CLAUDE.md` first.

## The core design change this task list makes

`CurrentUserPermissionsService` (built in the RBAC reference task list) currently reads directly from the JWT/session auth services — exactly the coupling that must not exist in the platform version. The fix: **RBAC defines its own contract (an injection token) for "resolve the current user's permissions," ships a safe, fully self-contained default implementation that requires zero auth setup to work, and documents the one-line override any auth setup — Blueprint's own or a developer's custom one — needs to provide.** RBAC never imports anything from `core/auth`, and nothing in `modules/auth`'s package needs to know RBAC exists either. No dependency in either direction.

---

## Working method (reused from the earlier unified sync task)

Read → state destination → compute any import correction → show diff → write → read back and confirm. Apply to every file below.

---

## Task 0 — Discovery

0.1. Read the actual current `core/rbac/current-user-permissions.ts` and `core/rbac/permission.guard.ts` in `blueprint-reference` — confirm exactly how they currently couple to auth (which service, which method/signal) so the decoupling in Task 1 is precise, not guessed.
0.2. Read `mock-users.data.ts` — confirm whether it currently imports `AuthUser` from `core/auth/models.ts`. If so, this is a real coupling point needing its own fix (Task 1.3).
0.3. Read the current `app.routes.ts` structure in a representative generated-project state (main shell + auth branch from prior syncs) to understand what "append RBAC's routes as ordinary children of the existing shell" actually needs to target.

---

## Task 1 — Decouple, in `blueprint-reference` first (small, quick-verify, not a full new reference task list)

This is an architectural correction with a testable behavior change (does the guard still correctly allow/block), so it gets a light reference-side pass and verification before syncing — not a full new reference build, but not skipped either.

**1.1 New contract:** `core/rbac/current-user-permissions.token.ts`
```ts
import { InjectionToken } from '@angular/core';

export interface CurrentUserPermissionsResolver {
  hasPermission(key: string): boolean;
}

export const CURRENT_USER_PERMISSIONS = new InjectionToken<CurrentUserPermissionsResolver>(
  'CURRENT_USER_PERMISSIONS',
  { providedIn: 'root', factory: () => inject(RbacDemoSessionService) }
);
```

**1.2 A safe, fully self-contained default:** `core/rbac/rbac-demo-session.service.ts` — RBAC's *own* lightweight "active role" concept, with no dependency on any auth mechanism:
```ts
@Injectable({ providedIn: 'root' })
export class RbacDemoSessionService implements CurrentUserPermissionsResolver {
  private activeRoleId = signal<string | null>(/* first seeded role id, or null */);

  setActiveRole(roleId: string) { this.activeRoleId.set(roleId); }

  hasPermission(key: string): boolean {
    // resolve via rolesService + the active role id — safe, demoable,
    // zero external dependency.
  }
}
```
This is genuinely useful on its own, not just a placeholder — it's what lets the RBAC preview page demo permission-gated content by switching "active role" with no auth flow needed at all. Add a small role-switcher control to the existing preview page if one doesn't already exist, using this service.

**1.3 Decouple `mock-users.data.ts` from `AuthUser`** — define a minimal local type in `core/rbac/models.ts` (`{ id, name, email }` or whatever fields are actually used) instead of importing from `core/auth`.

**1.4 Rewrite `permission.guard.ts`** to inject `CURRENT_USER_PERMISSIONS` (the token) instead of the old auth-coupled service directly:
```ts
export const permissionGuard = (requiredKey: string): CanActivateFn => () => {
  const resolver = inject(CURRENT_USER_PERMISSIONS);
  return resolver.hasPermission(requiredKey) || inject(Router).parseUrl('/forbidden');
};
```

**1.5 Quick verify** in the existing preview: confirm the guard still correctly allows/blocks using the new demo session's role-switcher, with zero reference to any auth service anywhere in the RBAC code path. Grep `core/rbac/` and `features/rbac/` for any remaining import of anything under `core/auth/` — there should be none left.

**1.6 Document the override, right in the token file, as a code comment** — this is the actual integration point for a real project:
```ts
// To integrate with real authentication (Blueprint's auth module or your
// own): provide a real implementation of CurrentUserPermissionsResolver
// in app.config.ts, e.g.:
//   { provide: CURRENT_USER_PERMISSIONS, useClass: MyRealPermissionsService }
```

---

## Task 2 — New `generator-kit` helper: `appendChildRoutes`

RBAC's admin pages are **ordinary feature routes** meant to render inside whatever main shell already exists — not a standalone sibling branch like auth's login/signup pages. Neither existing helper (`wrapRoutesUnderLayout` wraps *everything* under a *new* shell; `addLayoutBranch` adds a *new top-level sibling*) fits. A third helper is needed:

```ts
// packages/generator-kit/src/lib/append-child-routes.ts
export function appendChildRoutes(
  tree: Tree,
  appRoot: string,
  newChildren: Array<{ path: string; componentImportPath: string; componentClassName: string }>
) {
  // Find the current "main" route entry — the one NOT listed in
  // protectedRouteBranches (i.e., not the auth branch or any other
  // deliberately-standalone branch). If a main shell route exists,
  // push newChildren into its existing children array. If layout=none
  // (no shell, routes array is flat), push newChildren as plain
  // top-level entries in the root routes array instead.
}
```
Publish a new `generator-kit` version with this addition before proceeding.

---

## Task 3 — Destination mapping (mostly 1:1, same as auth's core/features convention)

| Source (`blueprint-reference`) | Generated project destination |
|---|---|
| `core/rbac/*` (models, services, guard, token, demo session) | `src/app/core/rbac/` |
| `features/rbac/permissions/*` | `src/app/features/rbac/permissions/` |
| `features/rbac/roles/*` | `src/app/features/rbac/roles/` |

No layout content involved at all this time — confirms RBAC is a simpler sync than auth in that respect.

---

## Task 4 — Generator: `packages/modules/src/generators/rbac/`

**Schema — deliberately minimal**, since RBAC doesn't have an auth-style "genuinely different runtime strategy" branch to parameterize:
```json
{
  "properties": {
    "routePrefix": { "type": "string", "default": "admin" }
  }
}
```
`routePrefix` controls where the admin pages mount (`/admin/permissions`, `/admin/roles` by default) — the one genuinely configurable thing about where this feature lives in an app's URL structure.

`rbac.ts`:
```ts
export default async function (tree: Tree, options: { routePrefix: string }) {
  generateFiles(tree, joinPathFragments(__dirname, 'files/core/rbac'), 'src/app/core/rbac', {});
  generateFiles(tree, joinPathFragments(__dirname, 'files/features/rbac'), 'src/app/features/rbac', {});

  appendChildRoutes(tree, '.', [
    { path: `${options.routePrefix}/permissions`, componentImportPath: '...', componentClassName: 'PermissionsList' },
    { path: `${options.routePrefix}/roles`, componentImportPath: '...', componentClassName: 'RolesList' },
    // confirm real component/route shape against what Task 1 actually
    // produced — this generator has more pages than just these two
    // (forms, assigned-users) — decide whether those need their own
    // routes or are dialog/modal-driven within the list pages, per
    // however Task 1's reference build actually implemented them.
  ]);

  appendToManifest(tree, '.', 'modules', 'rbac');

  await formatFiles(tree);
}
```
No `app.config.ts` provider patch needed for the demo session — it's `providedIn: 'root'` with a self-contained factory, so it works automatically with zero wiring, which is exactly the point of Task 1's design.

---

## Task 5 — Dependencies and assets

5.1. `packages/modules/package.json` needs `@blueprint-platform/generator-kit` (for `appendChildRoutes`/`appendToManifest`) as a real generator-package dependency — **not** `@blueprint-platform/foundation`, since this generator deliberately has no reason to call into it (confirming the "no relation" requirement holds at the dependency-declaration level too, not just in the generated code).
5.2. Asset glob rules for the new `files/core/rbac` and `files/features/rbac` source folders.

---

## Task 6 — Build, publish, and test

6.1. Publish `generator-kit`'s `appendChildRoutes` addition first, then `modules` (with `rbac` alongside the already-existing `auth` generator in the same package — confirm they don't interfere with each other during the build).

6.2. Test **RBAC completely standalone, with no auth module present at all** — generate a bare `foundation`-only project (any layout, `layout=sidebar-shell` say), run only `nx g @blueprint-platform/modules:rbac`, and confirm: it works fully out of the box (the demo session role-switcher, permission-gated routes actually gating correctly) with **zero** auth setup — this is the concrete proof the decoupling actually holds, not just that it compiles.

6.3. Test RBAC **alongside** auth on the same project (`modules:auth` then `modules:rbac`, or the reverse order — test both orders) and confirm neither generator's presence breaks the other, and that `appendChildRoutes` correctly finds and appends into the main shell without disturbing the auth branch `addLayoutBranch` created earlier.

6.4. Confirm `grep`-ing the entire generated `core/rbac/` and `features/rbac/` output for any reference to `core/auth` or `AuthUser` turns up nothing, in both test scenarios.

Only after all pass, tag `stable`.

---

## Task 7 — Update `CLAUDE.md`

Record: the `modules:rbac` generator, its minimal schema, the `CURRENT_USER_PERMISSIONS` token as RBAC's sole integration point with any auth setup, the `RbacDemoSessionService` self-contained default, the new `appendChildRoutes` helper and when to use it versus the other two routing helpers, and the explicit confirmation that `modules/rbac` and `modules/auth` have zero dependency on each other in either direction.
