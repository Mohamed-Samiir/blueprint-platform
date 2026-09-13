# Task list: User Management → `@blueprint-platform/modules`

**Run from `blueprint-platform`, with `blueprint-reference` added via `/add-dir`.** Read `CLAUDE.md` first. This is a simpler sync than auth or RBAC — no cross-module coupling to manage, no special layout needed, reuses helpers already built for RBAC.

---

## Working method (reused)

Read → state destination → compute any import correction → show diff → write → read back and confirm.

---

## Task 0 — Discovery

0.1. Read the real, final `core/user-management/` and `features/user-management/` content in `blueprint-reference`.
0.2. Confirm the Task 7 grep result from the reference task list still holds — zero imports from `core/auth` or `core/rbac` anywhere in this module. If anything slipped through, fix it before syncing, don't carry the coupling into the platform version.
0.3. Confirm whether the avatar/thumbnail spartan primitive used here (per the reference task's Task 0.1) is already synced anywhere else in `blueprint-platform` — if not, this module's `files/` will be the first place it lands; note that in Task 5.

---

## Task 1 — Destination mapping (1:1, same convention as auth/RBAC)

| Source (`blueprint-reference`) | Generated project destination |
|---|---|
| `core/user-management/*` | `src/app/core/user-management/` |
| `features/user-management/*` | `src/app/features/user-management/` |

---

## Task 2 — Generator: `packages/modules/src/generators/user-management/`

**Schema:**
```json
{
  "properties": {
    "routePrefix": { "type": "string", "default": "admin/users" }
  }
}
```

`user-management.ts`:
```ts
import { appendChildRoutes, appendToManifest } from '@blueprint-platform/generator-kit';

export default async function (tree: Tree, options: { routePrefix: string }) {
  generateFiles(tree, joinPathFragments(__dirname, 'files/core/user-management'), 'src/app/core/user-management', {});
  generateFiles(tree, joinPathFragments(__dirname, 'files/features/user-management'), 'src/app/features/user-management', {});

  appendChildRoutes(tree, '.', [
    { path: options.routePrefix, componentImportPath: '...', componentClassName: 'UsersList' },
    { path: `${options.routePrefix}/add`, componentImportPath: '...', componentClassName: 'AddUser' },
    { path: `${options.routePrefix}/:id/edit`, componentImportPath: '...', componentClassName: 'EditUser' },
    { path: `${options.routePrefix}/:id`, componentImportPath: '...', componentClassName: 'DetailsUser' },
    // confirm real component/class names and whether details-user is a
    // route or a dialog per the reference build's actual Task 3.5
    // decision — adjust this list to match reality, don't assume
  ]);

  appendToManifest(tree, '.', 'modules', 'user-management');

  await formatFiles(tree);
}
```

Reuses `appendChildRoutes` (built for RBAC) unchanged — this module's routes are ordinary feature routes belonging inside whatever main shell already exists, exactly the same situation RBAC's admin pages were in.

No `app.config.ts` patch needed — nothing here requires a new provider (no token, no interceptor, no guard for this module).

---

## Task 3 — Dependencies and assets

3.1. `packages/modules/package.json` needs `@blueprint-platform/generator-kit` only — confirm no accidental dependency on `@blueprint-platform/foundation` gets added either (this module needs even less than RBAC did, since it doesn't need `foundation:layout` for anything).
3.2. Asset glob rules for `files/core/user-management` and `files/features/user-management`.

---

## Task 4 — Build and publish (no e2e verification cycle — per explicit instruction)

Standard clean build/publish cycle for `modules`, per `CLAUDE.md`'s established process — build, dry-run pack, publish to Verdaccio (or real npm, depending on where you're actually releasing this), tag `latest`. **No scratch-project generation, no click-through verification, no combination testing** — skipped entirely per instruction. Tag `stable` once you're satisfied the build itself completed cleanly (no build errors, `dist` contains the expected files) — there's no behavioral testing gate before that tag this time, so treat a clean build as the bar, not proof of working behavior in a real generated app.

---

## Task 5 — Update `CLAUDE.md`

Record the `modules:user-management` generator, its one schema option, and confirm in writing that it has zero dependency on `auth` or `rbac` in either direction — same explicit confirmation pattern used for RBAC.

---

## The command to run once this is done

```bash
npx nx g @blueprint-platform/modules:user-management --routePrefix=admin/users
```

Run against any already-generated Blueprint project (any `layout`, with or without `modules:auth`/`modules:rbac` present) — omit `--routePrefix` entirely to accept the `admin/users` default.
