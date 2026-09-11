# Task list: `generator-kit` extraction + `foundation:layout` generator

Read `CLAUDE.md` first. **This task list must complete before any `modules:auth` work begins** — `modules:auth` will compose into `foundation:layout` once it exists, and shouldn't be built against logic that's about to be refactored out from under it.

## A critical distinction to hold in mind throughout this entire task list

`generator-kit` is a dependency **of the generator packages' own code** (`foundation`, `components`, `modules`, `templates` import and call it while *their* generator functions run) — it is **never** injected into a *generated project's* `package.json`, the way `@blueprint-platform/components` currently is. Two completely different `package.json` files are in play throughout this document: `packages/foundation/package.json` (where `generator-kit` becomes a real `dependencies` entry) versus what `preset.ts` writes into a generated project's `package.json` (which should never mention `generator-kit` at all). Keep these visibly separate in every task below — conflating them is the single easiest mistake to make in this task list.

---

## Task 0 — Discovery (read the real current code before extracting anything)

0.1. Read the full, current, real content of `preset.ts`, `patch-app-config.ts`, and `patch-app-routes.ts` — every helper being "generalized" below must be generalized from what's actually there, not reinvented from a description.

0.2. Read the current `BlueprintManifest` type/shape as actually written (in `manifest.types.ts` or wherever it currently lives) — Task 3 extends it.

0.3. Confirm the exact current tsconfig-path-registration loop (the `readdirSync`-based one for `shared/ui`) and exactly which file it lives in.

---

## Task 1 — Create the `generator-kit` package

```bash
npx nx g @nx/js:library generator-kit --directory=packages/generator-kit --importPath=@blueprint-platform/generator-kit
```

This is a plain publishable library, **not** an `@nx/plugin` package — it exposes callable functions, not Nx generators, so it has no `generators.json` and nothing needs registering in it that way.

`package.json`: same publish-readiness conventions as the other four pillars (`publishConfig.access: public`, correct `exports` map) — but note its **version does not need independent-release treatment the same way the other four do for compatibility-matrix purposes**; it's an internal implementation detail other packages depend on, not something a generated project's `.blueprint/manifest.json` needs to track. Still version it properly (semver, real `nx release` participation) since `foundation`/`components`/`modules`/`templates` will each declare a real version dependency on it.

---

## Task 2 — Build the four shared helpers, generalized from Task 0's real findings

**`packages/generator-kit/src/lib/wrap-routes-under-layout.ts`** — generalized from `patch-app-routes.ts`'s current logic:
```ts
export function wrapRoutesUnderLayout(
  tree: Tree,
  appRoot: string,
  options: { layoutImportPath: string; layoutClassName: string }
) {
  // read app.routes.ts, wrap existing route entries as children of a new
  // parent route pointing at { layoutImportPath, layoutClassName } —
  // same ts-morph mechanism already proven in patch-app-routes.ts, just
  // parameterized instead of hardcoded to the four app-shell names.
}
```

**`packages/generator-kit/src/lib/append-to-manifest.ts`**:
```ts
export function appendToManifest(
  tree: Tree,
  appRoot: string,
  category: 'components' | 'modules' | 'layouts', // 'layouts' is new — see Task 3
  entry: string
) {
  // read .blueprint/manifest.json, ensure the array exists, push if not
  // already present, write back — used everywhere a generator currently
  // hand-writes this JSON logic inline.
}
```

**`packages/generator-kit/src/lib/register-ui-path.ts`** — generalized from the existing `shared/ui` `readdirSync` loop, parameterized so it isn't hardcoded to that one folder:
```ts
export function registerUiPaths(tree: Tree, appRoot: string, sourceDir: string, aliasPrefix: string) {
  // same readdirSync + tsconfig.json paths-object mutation already
  // proven working for shared/ui, generalized to accept any source
  // folder and alias prefix.
}
```

**`packages/generator-kit/src/lib/append-provider.ts`** — generalized from the repeated "add an import, push an element into the `appConfig` array literal" pattern:
```ts
export function appendProvider(
  tree: Tree,
  appRoot: string,
  options: { importName: string; importPath: string; providerExpression: string }
) {
  // ts-morph: add the import if not already present, push
  // providerExpression into appConfig's array literal.
}
```

Export all four from `packages/generator-kit/src/index.ts`.

---

## Task 3 — Extend the manifest shape

Add `layouts: string[]` alongside the existing `components`/`modules` arrays in the manifest type and in `preset.ts`'s initial manifest write (empty array by default, same as the other two).

---

## Task 4 — Refactor `foundation` to consume `generator-kit` (prove the extraction on real, already-working code)

4.1. Add `@blueprint-platform/generator-kit` as a real `dependency` (not dev) in `packages/foundation/package.json`, pinned to whatever version Task 1 published.

4.2. Replace `preset.ts`'s inline `appConfig` array-push calls (for `provideZonelessChangeDetection`, `provideRouter`, `provideBlueprint`) with calls to `appendProvider(...)`.

4.3. Replace the inline `shared/ui` `readdirSync` tsconfig-path loop with a call to `registerUiPaths(...)`.

4.4. Replace the inline manifest-writing JSON logic with `appendToManifest(...)` calls where applicable.

4.5. **Verification, not assumption:** regenerate a scratch project before and after this refactor and diff the two outputs — `app.config.ts`, `tsconfig.json`, and `.blueprint/manifest.json` must be **byte-for-byte identical** (aside from the timestamp field). This refactor must not change generated output at all — it only changes where the logic that produces it lives. If anything differs, that's a bug in the extraction, not an acceptable side effect.

---

## Task 5 — Build `foundation:layout`, the standalone on-demand layout generator

`packages/foundation/src/generators/layout/` — `layout.ts`, `schema.json`.

```json
{
  "properties": {
    "name": { "type": "string", "description": "Layout folder name under files/layout/" }
  },
  "required": ["name"]
}
```

```ts
import { Tree, generateFiles, joinPathFragments, formatFiles } from '@nx/devkit';
import { readdirSync } from 'fs';
import { wrapRoutesUnderLayout, appendToManifest } from '@blueprint-platform/generator-kit';

export default async function (tree: Tree, options: { name: string }) {
  const catalogDir = joinPathFragments(__dirname, '../../../files/layout'); // same catalog preset.ts already draws from — confirm exact relative path against real dist layout, don't assume
  const available = readdirSync(catalogDir);

  if (!available.includes(options.name)) {
    throw new Error(`Unknown layout "${options.name}". Available: ${available.join(', ')}`);
  }

  const dest = `src/app/layout/${options.name}`;
  generateFiles(tree, joinPathFragments(catalogDir, options.name), dest, {});

  // Determine the real exported class name from the copied component
  // file rather than assuming a naming convention — read it back after
  // the copy, same discipline as every prior cross-file import fix in
  // this project.
  const className = /* derive from the copied file's actual export */;

  wrapRoutesUnderLayout(tree, '.', {
    layoutImportPath: `./${dest}/${options.name}`,
    layoutClassName: className,
  });

  appendToManifest(tree, '.', 'layouts', options.name);

  await formatFiles(tree);
}
```

This reads from the **same** `files/layout/` catalog `preset.ts` already uses — no file duplication, just a second entry point into the existing content.

---

## Task 6 — Refactor `preset.ts`'s own generation-time layout selection to call this generator in-process

Since `layout.ts` now owns the copy-and-wrap logic, `preset.ts`'s existing generation-time `layout` handling should **call this same function directly** (same-package import, trivial) rather than keep its own separate inline implementation:

```ts
import layoutGenerator from './generators/layout/layout';
// ...
if (layout !== 'none') {
  await layoutGenerator(tree, { name: layout });
}
```

This removes the last piece of duplicated layout-handling logic — one implementation, two entry points (generation-time via `preset.ts`, anytime-later via `nx g @blueprint-platform/foundation:layout`).

**Verification, same standard as Task 4.5:** diff a scratch project generated with `--layout=sidebar-shell` before and after this refactor — output must be identical.

---

## Task 7 — Test the actual scenario this whole task list exists for

Generate a project with `--layout=none`. Confirm it has no `layout/` folder content. Then run:
```bash
npx nx g @blueprint-platform/foundation:layout --name=sidebar-shell
```
against that same project. Confirm: the layout now exists, `app.routes.ts` is correctly wrapped, the manifest's `layouts` array now contains `sidebar-shell`, and the app still serves with no console errors. This is the direct proof of the scenario that motivated this whole task list — a developer starting with `none` and adding a real layout later.

---

## Task 8 — Build, publish, and test the package dependency chain itself

8.1. Publish `generator-kit` first (it has no dependents yet at that point, so it's safe to publish standalone). Tag `latest`.

8.2. Build `foundation` against the published `generator-kit` (not a local file reference) — this is the real test that the published-package dependency chain works, not just that it compiles inside the monorepo where a local path might silently paper over a packaging mistake.

8.3. Full clean-build/publish/dist-tag cycle for `foundation`, per `CLAUDE.md`'s established process.

8.4. Re-run every existing foundation test combination from prior task lists (the various `layout`/`showThemeSwitcher`/`showLanguageSwitcher` combinations) to confirm nothing regressed from this refactor — not just the new scenario in Task 7.

Only after all of this passes, add `stable` tags to both `generator-kit` and `foundation`.

---

## Task 9 — Update `CLAUDE.md`

Record: `generator-kit`'s existence and purpose, the hard rule that it's a dependency of generator packages only and must never appear in a generated project's `package.json`, the new `foundation:layout` generator and its catalog-based validation pattern (matching `components:ui`'s design), and the fact that `preset.ts`'s generation-time layout handling now composes into this same generator rather than duplicating it.

---

## Explicitly deferred to the next task list

No `modules:auth` work happens here. Once this is complete and verified, the auth-module platform-sync task list gets revised to have `modules:auth` compose into `foundation:layout` (calling it for `auth-split`/`auth-centered` the same way `preset.ts` now does for the four app shells) instead of carrying its own duplicated layout-copying logic.
