# Task list: `cli-core` + `cli` packages, `--list` everywhere, remove `labelPosition`

**Run from `blueprint-platform`.** Read `CLAUDE.md` first, and read the attached current `command-reference.md` in full before starting — it reflects the *actual* current state of every generator's flags; don't rely on assumptions from earlier design discussions where they conflict with it.

---

## Part A — Remove `labelPosition` entirely (not just from CLI prompts — a real schema change)

`labelPosition` is a live schema option on `foundation:preset` right now (confirmed in the attached reference). This part removes it as a generation-time option altogether, not just the CLI question for it — floating-label becomes the fixed, only behavior, matching what's actually built.

### Task A0 — Discovery
Confirm every place `labelPosition` currently appears: `schema.json`, `preset.ts`'s options handling, `template-config.ts.template`, the `BlueprintConfig` interface, the manifest write block, and anywhere `patch-app-config.ts` references it. List all of them before removing anything.

### Task A1 — Remove from `foundation:preset`
- Delete the `labelPosition` property from `schema.json`.
- Remove it from `preset.ts`'s destructured options and from whatever gets passed into `generateFiles`'s substitution object for `files/config`.
- Remove the `labelPosition: <%= labelPosition %>,` line from `template-config.ts.template`, and remove `labelPosition`/`LabelPosition` from the `BlueprintConfig` interface entirely.
- Remove it from the manifest write block.

### Task A2 — Confirm the floating-label behavior itself still works, unconditionally
The actual `hlm-field` + `:has()` floating-label CSS technique built earlier should now just always apply — confirm no component template still branches on a `labelPosition` value that no longer exists (this would be a leftover dead reference, not a runtime error necessarily, but worth catching).

### Task A3 — Update documentation
Remove the `labelPosition` row from `command-reference.md`'s options table, and any mention in `CLAUDE.md`.

---

## Part B — `--list` for layout, components, and modules

### Task B1 — `foundation:layout --list`
When `--list` is passed, read the real catalog folder names under `files/layout/` and print them — **excluding** `auth-split`/`auth-centered`, per the existing documented guidance that those two aren't meant to be offered as a top-level "add a layout" choice. Exit before any `Tree` writes happen; this is a read-only mode.

### Task B2 — `components:ui --list`
Same pattern: read the real catalog folder names under `files/` and print them, exit without writing. This turns the existing "Unknown component X, available: ..." error-message list into an intentional, always-available query mode instead of something only surfaced on a mistake.

### Task B3 — `--list` for the three module generators (a judgment call, documented as one)

Unlike layout/components, `modules` has no real file-based catalog — `auth`, `rbac`, `user-management` are three independently-built generators, not folders under one shared `files/`. There's nothing to dynamically discover. Implement `--list` on each anyway, for interface consistency, as a fixed one-line self-description:
```ts
if (options.list) {
  console.log('rbac — Roles & permissions module, works standalone.');
  return;
}
```
`cli-core` (Task C) can then either call all three with `--list` and aggregate the output, or just hold this same fixed list directly itself — note which approach was actually taken, since the dynamic-discovery benefit that justifies a subprocess call for layout/components doesn't really apply here.

---

## Part C — `@blueprint-platform/cli-core`

New package, `packages/cli-core/`, plain publishable library (same shape as `generator-kit` — no `generators.json`, it's not an Nx generator, it's process/prompt orchestration consumed by CLI binaries). **Never pinned into a generated project** — same category as `generator-kit`.

Move the version-resolution logic already built for `create-blueprint-app` here:
```ts
export async function resolveFoundationVersion(channel: 'stable' | 'latest', registry?: string): Promise<string> { ... }
```

Add the shared execution functions — **these must be genuinely reusable for both project-creation-time sequencing (the admin-template flow) and post-project one-off additions**, since that's the whole point of centralizing them here rather than duplicating in two CLI binaries:
```ts
export async function runFoundationLayout(cwd: string, name: string, registry?: string): Promise<void> { ... }
export async function runComponentsUi(cwd: string, names: string[], registry?: string): Promise<void> { ... }
export async function runModule(cwd: string, moduleName: 'auth' | 'rbac' | 'user-management', flags: Record<string, unknown>, registry?: string): Promise<void> { ... }

export async function listLayouts(registry?: string): Promise<string[]> { ... }   // via B1
export async function listComponents(registry?: string): Promise<string[]> { ... } // via B2
export async function listModules(registry?: string): Promise<Array<{ name: string; description: string }>> { ... } // per B3's chosen approach
```

Also add a manifest-reading helper, since the reference doc explicitly calls out `.blueprint/manifest.json` as the source of truth for "what's already installed" — both CLI binaries need this to avoid re-prompting for something already present:
```ts
export function readManifest(cwd: string): { components: string[]; modules: string[]; layouts: string[] } | null { ... }
```

---

## Part D — `@blueprint-platform/cli` (the `blueprint` command)

New package, `packages/cli/`, **pinned into every generated project's `devDependencies`** (Part F) — this is the one that's actually run from inside a project.

```bash
npx blueprint add layout
npx blueprint add component
npx blueprint add module
```

Each subcommand: check `readManifest` first for an "already added" hint, call the matching `list*` function to build the prompt options dynamically (never hardcode the layout/component catalog names in this package — that would reintroduce exactly the staleness problem `--list` exists to avoid), then call the matching `run*` function.

For `blueprint add module`, when `auth` is chosen, surface its flag prompts (`authType`, `storeType`, `authLayout`, `includeSignup`, `includeForgotPassword`, `includeChangePassword`) per the reference doc's documented defaults — this is the first CLI surface actually exposing those flags interactively.

---

## Part E — Update `create-blueprint-app` to depend on `cli-core`

Replace its local `resolve-version.ts` with the published `cli-core` dependency. Rewrite the admin-template path's sequential `execa` calls to use `cli-core`'s `runFoundationLayout`/`runModule` functions instead of hand-built `execa` calls — this is the direct proof that the "used during project building time **and** in post-project" requirement holds: the exact same functions serve both `create-blueprint-app`'s one-time sequencing and `@blueprint-platform/cli`'s repeated post-project use.

No `apiUrl` prompt, no `labelPosition` prompt — confirm both stay absent, per standing instructions.

---

## Part F — Pinning and versioning

F1. `compatibility.json` — add a `"cli"` field (not `"cli-core"` — it's never pinned, same as `generator-kit`).

F2. `preset.ts` — add `@blueprint-platform/cli` to the pinned `devDependencies` block, sourced from `compatibility.json`, same mechanism as `components`/`modules`/`templates`.

F3. `nx.json`'s independent-release `projects` array — add both `cli` and `cli-core` (both need their own publishable version lines, even though only one gets pinned into generated projects).

---

## Task G — Build, publish, and test

G1. Build/publish order: `generator-kit` → `foundation` (Part A removal + Part B1 `--list`) → `components` (Part B2) → `modules` (Part B3) → `cli-core` → `cli`.

G2. Test `--list` directly against each: `nx g @blueprint-platform/foundation:layout --list` (confirm exactly 4 names, not 6), `nx g @blueprint-platform/components:ui --list`, and each module's `--list`.

G3. Generate a scratch project, confirm `@blueprint-platform/cli` is present in `devDependencies` and `npx blueprint add layout`/`component`/`module` all work end to end, including the manifest "already added" check (run `blueprint add module` for `rbac` twice, confirm the second run gives a clear "already added" message rather than silently no-op-ing with no feedback).

G4. Confirm `create-blueprint-app`'s admin-template path still works correctly after being rewired to `cli-core` in Part E — same end result as before, different internal implementation.

G5. Confirm `labelPosition` is genuinely gone: schema no longer accepts it (passing `--labelPosition=inline` should either error or be silently ignored — confirm which, and that it's not silently breaking anything either way), and a freshly generated project's form fields render with the floating-label style unconditionally.

Only after all of G2–G5 pass, tag `stable` across the packages that changed.

---

## Task H — Update `CLAUDE.md` and `command-reference.md`

Record: the new `cli-core`/`cli` packages and the pinning distinction between them; `--list` on `foundation:layout`/`components:ui`/each module generator, including the documented judgment call on modules not having a real catalog; the removal of `labelPosition`; and the fact that project-creation-time and post-project generator invocation now share the same underlying `cli-core` functions rather than two separate implementations.
