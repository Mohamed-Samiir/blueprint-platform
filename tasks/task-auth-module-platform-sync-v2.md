# Task list: Auth module → `@blueprint-platform/modules` generator (v2 — composes into `foundation:layout`)

**Run this from `blueprint-reference`, with `blueprint-platform` added via `/add-dir`.** Read `CLAUDE.md` first. **Supersedes the earlier version of this task list** — that version had `modules:auth` owning its own copy of the auth layouts and its own route-patching logic, both now wrong given the `generator-kit`/`foundation:layout` work completed since. Use this version.

---

## The one new problem this revision has to solve, before anything else

`foundation:layout`'s existing route-wrapping (built for the *main* app shell) sweeps **every current top-level route** under the new shell as its children — correct behavior when adding the one main shell, but actively wrong if an `auth` top-level branch (a sibling, meant to stay outside the shell forever) already exists at that point. Since a developer could plausibly run `modules:auth` *before* ever adding a main layout (e.g. `layout: none` at generation time, `modules:auth` added first, a real shell added later via `foundation:layout`), this ordering has to be handled correctly, not assumed away.

**Task 1 below adds a small, necessary fix to `generator-kit` first** — a way to mark a route branch as "never sweep this into a later-added shell." This is a real, required addition, not optional polish.

---

## Working method (unchanged, reuse it)

Read → state destination → compute import correction → show diff → write → read back and confirm. Every file touched in Tasks 3–6 goes through this.

---

## Task 0 — Discovery

0.1. Confirm `generator-kit` and `foundation:layout` are both published and working (per the prior task list's Task 8) before building anything here — this task list assumes both exist for real, not just in design.
0.2. Read `blueprint-reference`'s `core/auth/` and `features/auth/` exactly as they exist now (unchanged from the original discovery — still valid).
0.3. Identify the storage abstraction exactly (unchanged from the original — still valid).
0.4. Read `blueprint-reference`'s current `app.config.ts`/`app.routes.ts` auth wiring (unchanged — still valid).
0.5. Diff `styles.scss` for auth-related global rules (unchanged — still valid; remember this is `blueprint-reference`'s own real active stylesheet, not the orphaned one in a generated project).
0.6. Confirm every spartan component the auth work uses is already synced into `foundation` (unchanged — still valid).

Report all findings before writing anything.

---

## Task 1 — Fix `generator-kit`: protect top-level route branches from being swept

**`packages/generator-kit/src/lib/add-layout-branch.ts`** (new file — this is genuinely different from `wrap-routes-under-layout.ts`, not a variant of it):
```ts
import { Tree, updateJson } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

export function addLayoutBranch(
  tree: Tree,
  appRoot: string,
  options: { path: string; layoutImportPath: string; layoutClassName: string; children: Array<{ path: string; componentImportPath: string; componentClassName: string }> }
) {
  // Adds a brand-new top-level route entry (options.path) with its own
  // children — does NOT touch or wrap any pre-existing routes, unlike
  // wrap-routes-under-layout.ts. Uses ts-morph, same mechanism as
  // everywhere else in this project.

  // Critically: also records options.path in a new manifest field so
  // wrap-routes-under-layout.ts (used by foundation:layout for the MAIN
  // shell) knows to exclude it later.
}
```

**Update `wrap-routes-under-layout.ts`** to read that new manifest field and **exclude** any top-level route whose path is listed there, when sweeping existing routes into a newly-added main shell's children.

**Update the manifest shape** (in whichever file defines it) to add:
```ts
protectedRouteBranches: string[]; // paths that must never be nested under a later-added main shell
```
Default empty array, alongside `components`/`modules`/`layouts`.

**Publish a new `generator-kit` version** with this fix before proceeding — everything below depends on it.

---

## Task 2 — Generator location and schema (unchanged from the original)

`packages/modules/src/generators/auth/` — `auth.ts`, `schema.json`, `files/`. Same three parameters (`authType`, `storeType`, `authLayout`), same naming rationale for `authLayout` vs. `foundation`'s own `layout`.

---

## Task 3 — Destination mapping (revised)

| Source (`blueprint-reference`) | Where it lives now | Generated project destination |
|---|---|---|
| `core/auth/*` | `packages/modules/src/generators/auth/files/core/auth/` | `src/app/core/auth/` |
| `features/auth/layouts/auth-split-layout/` | **Moves into `foundation`'s catalog**: `packages/foundation/src/generators/preset/files/layout/auth-split/` — not owned by `modules` at all anymore | `src/app/layout/auth-split/` (sibling to the four app shells) |
| `features/auth/layouts/auth-centered-layout/` | Same, → `foundation`'s `files/layout/auth-centered/` | `src/app/layout/auth-centered/` |
| `features/auth/forms/*` | `packages/modules/src/generators/auth/files/features/auth/forms/` | `src/app/features/auth/forms/` (always, regardless of parameters) |

**This means a small piece of work happens in `foundation`, not `modules`, first:** sync the two auth layout folders from `blueprint-reference` into `foundation`'s `files/layout/` catalog, following the exact same process already used for the four app shells. Do this before Task 4.

---

## Task 4 — Conditional generation logic in `auth.ts`

4.1. Copy only the chosen `authType`'s service + interceptor (unchanged from the original design).
4.2. Storage: per Task 0.3's findings, same approach as before (unchanged).
4.3. **Layout — revised.** Instead of copying a layout folder directly, **call `foundation`'s `layout` generator function in-process**, the same composition pattern already established for cross-pillar generator calls:
```ts
import layoutGenerator from '@blueprint-platform/foundation/src/generators/layout/layout';

const layoutName = `auth-${options.authLayout}`; // 'auth-split' or 'auth-centered'
const layoutPath = `src/app/layout/${layoutName}`;
if (!tree.exists(layoutPath)) {
  await layoutGenerator(tree, { name: layoutName });
}
```
This means `packages/modules/package.json` needs `@blueprint-platform/foundation` as a **real dependency of the generator package itself** (not injected into generated projects — same category distinction as `generator-kit`, spelled out at the top of the prior task list).
4.4. Forms and models/mock-data: unchanged, always copied.

---

## Task 5 — Route wiring — use `addLayoutBranch`, not `wrapRoutesUnderLayout`

```ts
import { addLayoutBranch } from '@blueprint-platform/generator-kit';

addLayoutBranch(tree, '.', {
  path: 'auth',
  layoutImportPath: `./layout/auth-${options.authLayout}/auth-${options.authLayout}`,
  layoutClassName: /* real exported class name, confirmed by reading the actual copied file */,
  children: [
    { path: 'login', componentImportPath: './features/auth/forms/login-form/login-form', componentClassName: 'LoginForm' },
    // ...remaining forms, confirmed against real exported names
  ],
});
```
This both adds the route correctly **and** registers `'auth'` in the new `protectedRouteBranches` manifest field from Task 1 — confirm this actually happens as a side effect of `addLayoutBranch`, don't assume, verify by reading the manifest after running it.

---

## Task 6 — `app.config.ts` patching — use `generator-kit`'s `appendProvider`, not a bespoke implementation

```ts
import { appendProvider } from '@blueprint-platform/generator-kit';

appendProvider(tree, '.', {
  importName: 'withInterceptors', // or however the real interceptor registration needs shaping — confirm against Task 0.4's findings
  importPath: '@angular/common/http',
  providerExpression: `/* the real interceptor wiring expression */`,
});
```
Building this on `generator-kit` from the start avoids reintroducing the exact duplication `generator-kit` was built to eliminate — don't write a new one-off `ts-morph` block here.

---

## Task 7 — Global styles patching (unchanged from the original)

If Task 0.5 found genuinely new global rules, append to the generated project's real `theme.scss`/`tailwind-theme.css` (unchanged logic from the original task list).

---

## Task 8 — Dependencies and assets

8.1. Net-new npm dependencies for the auth code itself (unchanged from original).
8.2. **New:** `@blueprint-platform/foundation` and `@blueprint-platform/generator-kit` as real `dependencies` in `packages/modules/package.json` — confirm this is correctly a *generator-package* dependency, and separately confirm neither leaks into what gets injected into a *generated project's* `package.json` (that should still only ever contain the auth-specific runtime packages from 8.1, per the standing distinction from the prior task list).
8.3. Asset glob rules for the new `files/` source folders (unchanged from original, applied to the revised, smaller file set now that layouts moved out).

---

## Task 9 — Manifest

Append to `.blueprint/manifest.json`'s `modules` array (unchanged from original) — note `layouts` and `protectedRouteBranches` are now populated as a side effect of Task 4.3/Task 5's calls into `foundation:layout`/`addLayoutBranch`, not written directly by `modules:auth` itself.

---

## Task 10 — Re-enable the `@blueprint-platform/modules` pin in `preset.ts` (unchanged from original)

---

## Task 11 — Build, publish, and test — including the ordering scenario Task 1 exists to fix

11.1. Standard build/publish cycle for `modules` (and confirm `foundation`'s `files/layout/` catalog rebuild/republish happened first, per Task 3's note).

11.2. The original two combinations from the prior version (JWT+local+split, session+memory+centered) — same acceptance criteria as before.

11.3. **The critical new test:** generate a project with `--layout=none`. Run `modules:auth` first (any parameters). Confirm the `auth` route branch exists correctly. **Then** run `foundation:layout --name=sidebar-shell` on that same project. Confirm: the sidebar shell wraps only the pre-existing non-auth routes, and the `auth` branch remains an untouched, un-nested top-level sibling — **this is the concrete proof the Task 1 fix actually works**, not just that it compiles.

Only after all pass, add `stable` tags to both `generator-kit` (if not already tagged from Task 1) and `modules`.

---

## Task 12 — Update `CLAUDE.md`

Record: the `modules:auth` generator and its three parameters; that it composes into `foundation:layout` rather than owning layout content; the `protectedRouteBranches` manifest field and why it exists (the ordering bug this revision fixes); and that `modules` now has real generator-package dependencies on both `foundation` and `generator-kit`.
