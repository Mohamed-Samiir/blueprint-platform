# Task list: Layout selection in the foundation generator

Read `CLAUDE.md` first. This task list covers the `blueprint-platform` side: wiring a `layout` schema option into the foundation preset so a selected layout's files land in the generated project and its routes get wrapped correctly — including a special case for two of the five options.

## Starting state — already done, confirm before proceeding

All five pieces (`sidebar-shell`, `floating-shell`, `inset-shell`, `topbar-shell`, and `sidebar-item-flyout.ts`) have already been built, verified, and synced into `blueprint-platform`. Before starting Task 2, confirm the actual on-disk layout of what's there now:

**Task 0.1.** List `packages/foundation/src/generators/preset/files/layout/` and record the real folder/file structure — specifically whether `sidebar-item-flyout.ts` was placed as a single shared file (e.g. under a `_shared/` folder) or duplicated inside each of the shell folders that need it. **Do not assume the structure described later in this document (Task 1, now removed) — use whatever actually exists on disk.**

**Task 0.2.** Confirm each layout folder's exact exported class name (open each shell's main `.ts` file) — Task 3.3 needs the real class names, not assumed ones.

Adjust every subsequent task's file paths to match what Task 0.1/0.2 actually found, rather than any specific path assumed elsewhere in this document.

---

## Task 2 — Update `schema.json`

Replace any prior `sidebarLayout` property (if one was speculatively added — confirm none exists before adding a duplicate) with:

```json
"layout": {
  "type": "string",
  "enum": ["sidebar-shell", "floating-shell", "inset-shell", "topbar-shell", "none"],
  "default": "none"
}
```

---

## Task 3 — New file: `packages/foundation/src/generators/preset/lib/patch-app-routes.ts`

Keep this separate from `patch-app-config.ts` — that file's job is providers/imports in `app.config.ts`; routing composition is a distinct concern and deserves its own file, matching the project's existing single-responsibility split between generator helper files.

3.1. Function signature: `patchAppRoutes(tree: Tree, options: { layout: string })`.

3.2. If `options.layout === 'none'`: do nothing, return immediately. `app.routes.ts` must stay exactly as the routes-skeleton template produces it today.

3.3. Otherwise, using `ts-morph` (never string replacement, per established convention):
   - Read `src/app/app.routes.ts`.
   - Wrap the existing `routes` array's current entries as the `children` of one new parent route object: `{ path: '', loadComponent: () => import('./layout/<selected>-shell/<selected>-shell').then(m => m.<PascalCaseName>), children: [ ...existing entries... ] }`.
   - Match the exact export name of the shell component class from its actual source file — do not assume a naming convention; read the copied file and use whatever class name it actually exports.
   - Preserve any existing comment currently in the empty-routes template (the "Feature routes are added here automatically..." comment) — move it inside the new `children` array, don't delete it.

3.4. Write a unit test for this function covering all five `layout` values, including `none`, using `createTreeWithEmptyWorkspace()` per the project's existing generator-testing convention.

---

## Task 4 — Update `preset.ts`

4.1. Read `const layout = options.layout ?? 'none';`.

4.2. If `layout !== 'none'`:
   - `generateFiles` for `files/layout/${layout}-shell` → `src/app/layout/${layout}-shell`.
   - **Special case:** if `layout === 'sidebar-shell' || layout === 'topbar-shell'`, ensure `sidebar-item-flyout.ts` lands beside that shell's own files in the generated project at `src/app/layout/${layout}-shell/sidebar-item-flyout.ts`. How this copy is implemented depends on what Task 0.1 found on disk — if it's stored once in a shared location, copy that single source to the computed destination (`tree.write(destPath, tree.read(sourcePath))`); if it's already duplicated per-shell, it may already be covered by the plain `generateFiles` call above and need no separate step. Confirm which case applies before writing this logic.
   - Confirm which layouts actually import from `shared/ui/sidebar` (don't assume it's only `sidebar-shell`) and run `generateFiles` for `files/shared/ui/sidebar` → `src/app/shared/ui/sidebar` accordingly, matching the existing conditional pattern for other optional pieces.
   - Call `patchAppRoutes(tree, { layout })`.

4.3. If `layout === 'none'`: skip all of the above. Verify via diff (same standard as every previous "none" case in this project) that output is byte-for-byte identical to a project generated with `layout` omitted entirely.

4.4. Add `layout` to the manifest write block at the bottom of `preset.ts`.

---

## Task 5 — Update `package.json`'s asset rules

Add, if not already present from earlier work:
```json
{
  "input": "./packages/foundation/src/generators/preset/files/layout",
  "glob": "**/*.ts",
  "output": "./generators/preset/files/layout"
}
```
Since `layout/` already exists on disk with real content synced in, confirm this rule (or whatever asset rule currently covers it) is actually present and correctly picking up every file under `layout/`, including however `sidebar-item-flyout.ts` is actually structured per Task 0.1 — verify with a real build rather than assume, per this project's established pattern of asset-glob surprises.

---

## Task 6 — Build and publish before testing

The end-to-end verification in Task 7 tests against a real installed package, not local source — so a build and publish cycle has to happen first, or every scratch-project test below would still be running against whatever version was last published, not the new `layout` option.

6.1. Bump the version in `packages/foundation/package.json` (`npm version patch`, run from `packages/foundation`).

6.2. Build with a clean cache, per `CLAUDE.md`'s established gotchas:
```bash
cd D:\blueprint-platform
rm -rf packages/foundation/dist
npx nx build foundation --skip-nx-cache
```

6.3. Verify the build output before publishing anything — don't publish-and-debug:
```bash
find packages/foundation/dist -type f
```
Confirm the new `layout/` files (all four shells plus the flyout file, in whatever structure Task 0 found) are actually present in `dist`.

6.4. Dry-run the pack:
```bash
cd packages/foundation
npm pack --dry-run
```

6.5. Publish to the local Verdaccio registry, using the scoped-override syntax from `CLAUDE.md`'s registry conventions (a plain `--registry=` flag is silently overridden by any `.npmrc` scope mapping):
```bash
npm publish --@blueprint-platform:registry=http://localhost:4873
```

6.6. Tag the new version on **both** dist-tags used in this project — `latest` (always) and `stable` (only if this is confirmed working after Task 7 passes; do not tag `stable` before verification):
```bash
npm dist-tag add @blueprint-platform/foundation@$(node -p "require('./package.json').version") latest --@blueprint-platform:registry=http://localhost:4873
```

6.7. Confirm it's really there:
```bash
npm view @blueprint-platform/foundation --@blueprint-platform:registry=http://localhost:4873
```

Only proceed to Task 7 once 6.7 confirms the new version and its `latest` tag are correctly showing on the registry.

---

## Task 7 — End-to-end verification

Test **all five** `layout` values against the local Verdaccio registry, using the version just published in Task 6 — per `CLAUDE.md`'s registry conventions:

```bash
npx create-nx-workspace@latest scratch-sidebar --preset=@blueprint-platform/foundation@latest --layout=sidebar-shell --registry=http://localhost:4873
npx create-nx-workspace@latest scratch-floating --preset=@blueprint-platform/foundation@latest --layout=floating-shell --registry=http://localhost:4873
npx create-nx-workspace@latest scratch-inset --preset=@blueprint-platform/foundation@latest --layout=inset-shell --registry=http://localhost:4873
npx create-nx-workspace@latest scratch-topbar --preset=@blueprint-platform/foundation@latest --layout=topbar-shell --registry=http://localhost:4873
npx create-nx-workspace@latest scratch-none --preset=@blueprint-platform/foundation@latest --layout=none --registry=http://localhost:4873
```

For each: `npm install` succeeds, `nx serve` runs with no console errors, `app.routes.ts` looks correct (children nested under the shell for the four real layouts, untouched for `none`).

**Specifically confirm, for `scratch-sidebar` and `scratch-topbar` only:** `sidebar-item-flyout.ts` exists inside `src/app/layout/<name>-shell/`, sitting beside that layout's own files. **Specifically confirm, for `scratch-floating` and `scratch-inset`:** the flyout file does **not** exist anywhere in the generated project.

Do not consider this complete until all five pass, including the flyout-presence/absence checks. If any fail, fix and repeat Task 6's publish cycle with a new patch version — never re-test against a stale published version.

Once all five pass, go back and add the `stable` dist-tag (Task 6.6's deferred step):
```bash
npm dist-tag add @blueprint-platform/foundation@<version> stable --@blueprint-platform:registry=http://localhost:4873
```

---

## Task 8 — Update `CLAUDE.md`

Add the `layout` schema option, its five values, and the flyout special case to the "Current status" and generator-conventions sections once Task 7 passes.
