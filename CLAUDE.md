# Blueprint Platform — Project Context for Claude Code

## What this project is

Blueprint is an Angular **project builder**, not just a component library. A developer runs a CLI (`create-blueprint-app`, not yet built) or `npx create-nx-workspace --preset=@blueprint-platform/foundation`, answers a few prompts, and gets a fully wired, production-ready Angular project: zoneless, signal-driven, themed, with a headless-first component system already in place.

There are **two separate repositories** involved:
- **`blueprint-platform`** (this repo) — an Nx workspace hosting four independently-versioned, independently-published npm packages ("pillars"). This is where generator logic lives.
- **`blueprint-reference`** (sibling repo, plain Angular CLI, no Nx) — a hand-developed sandbox app where components/theme are built and visually verified *before* being manually synced into this repo's generator templates. Never edit `blueprint-platform` generator template content without first verifying the equivalent in `blueprint-reference`, unless the content is generator-only (has no reference-app equivalent, e.g. `app.routes.ts.template`).

## The four pillars (all in this one Nx workspace, separately versioned)

| Pillar | Package | Role |
|---|---|---|
| 1. Foundation | `@blueprint-platform/foundation` | The `preset` generator — scaffolds the whole app by default. Theme tokens, config-provider, base spartan-derived UI (button, utils), routing skeleton, manifest. |
| 2. Components | `@blueprint-platform/components` | Hosts **all ~64 spartan-derived UI component sources** + the single `ui` generator that copies them (and their deps) into a generated project on demand. `foundation` depends on this and delegates the starter-set + layout-set copies to it. Bigger composite pieces (data-table, audit-log) — not yet built. |
| 3. Modules | `@blueprint-platform/modules` | On-demand generators for business domains (auth, user-management) — **not yet built**. |
| 4. Templates | `@blueprint-platform/templates` | Composite generators bundling components+modules+layout into presets like admin-dashboard — **not yet built**. |

**Versioning:** each pillar has its own independent semver line (`"projectsRelationship": "independent"` in `nx.json`'s release config — this must never be lost or accidentally reset to lockstep). `packages/foundation/compatibility.json` bundles a snapshot of which versions of the other three pillars are known-compatible with the current foundation version — this file travels with the published package, no runtime network fetch. A generated project's `.blueprint/manifest.json` records exactly which versions it was generated from.

## Current status (update this section as work progresses)

- ✅ Foundation preset (`preset.ts`) generates successfully end-to-end: app scaffolds (`@nx/angular` `applicationGenerator`, `rootProject: true`, scss, no routing), base npm deps added to the generated `package.json` (`@angular/cdk` + Tailwind v4 / `@tailwindcss/postcss` / `postcss` dev deps; `@blueprint-platform/components` as a devDependency; **all other UI npm deps now come from the `ui` generator** — see the starter-set bullet), `.postcssrc.json` written, SCSS token system + `tailwind-theme.css` copied to `src/styles/`, config provider (`provide-blueprint.ts` + `template-config.ts`) generated into `src/app/core/config/`, the **starter UI set** copied to `src/app/shared/ui/` (with `@blueprint-platform/ui/<name>` tsconfig paths) by delegating to `@blueprint-platform/components:ui`, `app.routes.ts` skeleton written, `app.config.ts` AST-patched (`provideZonelessChangeDetection`, `provideRouter(routes)`, `...provideBlueprint(...)`), `project.json` `styles` array set (`theme.scss` then `tailwind-theme.css`), `shared/components` / `features` / `layout` / `global` seeded with `.gitkeep`, and `.blueprint/manifest.json` written (channel from `BLUEPRINT_CHANNEL` env, default `stable`; versions copied from `compatibility.json`; `components` = the installed UI-component list).
- ✅ Preset generator options: `name` (required), `palette` (default `"default"`), `rtl` (default `false`), `labelPosition` (`"floating" | "inline" | "top"`, default `"floating"`), `layout` (`"sidebar-shell" | "floating-shell" | "inset-shell" | "topbar-shell" | "none"`, default `"none"`), `showThemeSwitcher` (boolean, default `true`), `showLanguageSwitcher` (boolean, default `true`). `schema.d.ts` was realigned with `schema.json` (previously had a duplicate `labelPosition` key + wrong union) — both are now in sync; `schema.json` stays the source of truth.
- ✅ Theme / language services + switchers (cross-repo sync, `task-sync-unified.md`): `files/theme/theme.service.ts` and `files/language/language.service.ts` are new top-level source folders (distinct from `files/styles/`, which is SCSS/Tailwind); each gets its own `**/*.ts` assets glob in `foundation/package.json` and is emitted **only when `layout !== 'none'`** by dedicated `generateFiles` calls → `src/app/core/theme/` and `src/app/core/language/` (the `core/theme/` + `core/language/` destination convention — services live under `core/`, not `shared/`). Three flat (no `src/index.ts`) components — `user-menu/`, `theme-switcher/`, `language-switcher/` — now live with the rest of the kit under `packages/components/…/files/shared/ui/` and are added **only alongside a layout** (the `ui` generator call in `preset.ts`'s `layout !== 'none'` branch); the `ui` generator skips their `@blueprint-platform/ui/<name>` tsconfig path (no barrel — `FLAT_COMPONENTS` in `lib/resolve-deps.ts`) and warns if they land without their `core/theme|language` service. **(Superseded:** the old `layoutUiComponents` array + broad-copy-then-`tree.delete` approach in `preset.ts` is gone — see the starter-set bullet.) Import paths in the synced `.ts` are for the **generated-project** tree: switchers → `../../../core/theme|language/…`, `user-menu` → `../../../core/config/template-config`, the four shells' `LanguageService` import → `../../core/language/language.service`. `template-config.ts.template` gained `showThemeSwitcher` / `showLanguageSwitcher` in both `BlueprintConfig` and `DEFAULT_BLUEPRINT_CONFIG` (EJS `<%= %>`), passed through the `files/config` `generateFiles` substitution; both also recorded in `.blueprint/manifest.json`. Verified end-to-end against Verdaccio (`0.1.11`, `latest` tag only — `stable` still `0.1.10`): `layout=sidebar-shell` (switchers both true) and `layout=topbar-shell` (`showThemeSwitcher=false`) both generate + `tsc -p tsconfig.app.json --noEmit` clean; `layout=none` generates with `core/theme/`, `core/language/`, and the three layout-UI folders all absent, no dangling aliases, `tsc` clean. Not yet done: `nx serve` runtime check that the switchers toggle the `dark` class / `dir` attribute (Task 7.4), and promoting the `stable` dist-tag (Task 7.6). The `create-nx-workspace` ≥ 23.1.1 `@nx/angular:application` failure noted below **did not reproduce** in this run — generation succeeded for all three cases (passing `--name=` explicitly); the slow part was Verdaccio proxying the full dep tree on a cold npm cache.
- ✅ Layout selection (`layout` option, foundation `0.1.11`): when not `"none"`, `preset.ts` copies `files/layout/<layout>/` → `src/app/layout/<layout>/` and `patchAppRoutes` (`preset/lib/patch-app-routes.ts`) ts-morph-wraps the existing `routes` entries as the `children` of one lazy-loaded parent route (`loadComponent` → the shell; shell class name is read from the shell's own source, not assumed; the "Feature routes are added here…" comment is moved inside `children`). `"none"` leaves `app.routes.ts` byte-for-byte as the skeleton. **Flyout special case:** `sidebar-item-flyout.ts` lives once at `files/layout/` root and is shared by the shells via a `../` import; only `sidebar-shell` and `topbar-shell` import it, so for those two the generator drops a copy at `src/app/layout/<layout>/sidebar-item-flyout.ts` and ts-morph-repoints the shell import `../sidebar-item-flyout` → `./sidebar-item-flyout` (self-contained layout folder); the other shells never reference it and it is absent from their output. `layout` is also recorded in `.blueprint/manifest.json`. Unit-tested in `preset/lib/patch-app-routes.spec.ts` (all five values). End-to-end Verdaccio verification (Task 7) still outstanding — see note below.
- ✅ Starter UI set + on-demand `ui` generator (foundation `0.1.15`, components `0.1.1`; both `latest` + `stable` on Verdaccio; e2e-verified). **All ~64 spartan-derived UI component sources moved out of foundation** to `packages/components/src/generators/ui/files/shared/ui/` — `foundation` no longer carries `files/shared/ui/` and its `files/shared/ui` assets glob is gone. The components pillar has one generator, `ui` (`nx g @blueprint-platform/components:ui <name…>` or `--all`): resolves the transitive `@blueprint-platform/ui/*` closure (regex scan) + flat-family siblings, `generateFiles`-copies each component **not already present** (idempotent), writes its `@blueprint-platform/ui/<name>` tsconfig path (skips the flat family `user-menu`/`theme-switcher`/`language-switcher`), adds **only** the npm deps the copied set imports (`lib/npm-deps.ts` version map — `@spartan-ng/brain`, `@ng-icons/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `embla-carousel*`, `ngx-scrollbar`), merges the names into `.blueprint/manifest.json`, and warns if a switcher lands without its `core/theme|language` service. `preset.ts` now: `require('@blueprint-platform/components/generators/ui').default` (components is a foundation **dependency** so it installs with the preset, and is written into the generated project's **devDependencies** at `compatibility.components` so more can be added later); calls it once for `STARTER_UI` (a const in `preset.ts` = `utils` + all form controls + the overlay/"popup" family; closure pulls `calendar` + `separator` — ~30 components) with `skipFormat`/`skipInstall`; and, when `layout !== 'none'`, again for the selected shell's own `@blueprint-platform/ui/*` imports (scanned from `files/layout/<layout>/*.ts`) ∪ `user-menu`/`theme-switcher`/`language-switcher`. `preset.ts` keeps only `@angular/cdk` + the Tailwind toolchain in the generated `package.json`; every other UI npm dep now comes from `ui`. `manifest.components` = the actual installed list. The old broad `generateFiles(files/shared/ui)` + `layoutUiComponents` `tree.delete` + `readdirSync` tsconfig-path loop are **removed** from `preset.ts`. New unit tests: `packages/components/src/generators/ui/ui.spec.ts` (8, all green). e2e (Verdaccio, `NX_WORKSPACE_ROOT_PATH` unset): `layout=sidebar-shell` → 37 components + `nx build` OK; `layout=none` → 30 (no layout extras, no `core/theme`); `nx g …:ui carousel` → adds `carousel` + `embla-carousel*`, idempotent, `nx build` OK; `nx g …:ui --all` → 64, `nx build` OK. **Known limitation:** `nx g …:ui theme-switcher`/`language-switcher` in a `layout: none` project leaves a dangling import to `core/theme|language/…` (the generator warns; those services live in `foundation`, not `components`).
- ✅ The `create-nx-workspace` ≥ 23.1.1 `@nx/angular:application` "TypeScript setup / project references" failure was **entirely** the harness's `NX_WORKSPACE_ROOT_PATH=d:\blueprint-platform` forcing preset resolution back to the monorepo. Fix for local e2e: run `env -u NX_WORKSPACE_ROOT_PATH npx create-nx-workspace@23.1.1 … --registry=http://localhost:4873` from a dir **outside** `d:\blueprint-platform` (e.g. `d:\bp-e2e`). With that unset, generation succeeds for every layout.
- ✅ Welcome screen (foundation `0.1.16`): `files/welcome/welcome.ts` (standalone `Welcome` component, EJS `<%= name %>`, Tailwind/spartan-var styled, dark-ready) is generated to `src/app/welcome.ts` **always**. `patch-app-component.ts` (ts-morph, `lib/`) then removes the stock `NxWelcome` (import + `imports:` entry + deletes `nx-welcome.ts`, tidies `app.spec.ts`) and: for `layout: 'none'` → `app.html` = `<app-welcome />`, `app.ts` imports `Welcome`; for a layout → `app.html` = `<router-outlet />`, `app.ts` imports `RouterOutlet`, and `patch-app-routes.ts` adds `{ path: '', loadComponent: () => import('./welcome')… }` as the shell route's **first child** so `/` shows the welcome inside the shell's `<router-outlet>`. (Note: before this, generated `app.html` had only `<app-nx-welcome>` and *no* `<router-outlet>` at all — the shell route never actually mounted; this fixes that.) Assets glob `files/welcome/**/*.ts` added to `foundation/package.json`.
- ✅ All four pillars are `package.json`-inferred Nx projects — every manually-created `project.json` deleted (per the rule below). `nx.json` `release` still has `projectsRelationship: "independent"`.
- ⬜ Modules, Templates pillars — generator logic not started. Components pillar has the `ui` generator only; bigger composite generators not started.
- ⬜ The actual `create-blueprint-app` CLI — not started (currently just a design sketch from earlier discussion).
- ⬜ Automated sync tooling between `blueprint-reference` and `blueprint-platform` — deliberately deferred; syncing is currently manual, file by file.

## Repository layout (this repo)

Absolute path on this machine: `D:\blueprint-platform` (sibling `blueprint-reference` repo is `D:\blueprint-reference`).

```
nx.json                        — release config (independent versioning), plugin config
tsconfig.base.json             — module: nodenext, customConditions: @blueprint-platform/source
package.json                   — root, private, workspaces: ["packages/*"], Nx 23.1.1
packages/
  foundation/                  — ✅ the only pillar with real generator logic
    package.json               — version, publish config, nx.targets.build (tsc + assets globs)
    generators.json            — registers the `preset` generator (factory → dist/.../preset)
    compatibility.json          — { foundation, components, modules, templates } version snapshot
    tsconfig.lib.json          — excludes src/generators/**/files/** from compilation
    src/
      index.ts                 — (empty) package entry
      generators/preset/
        preset.ts              — the generator entry (default export)
        schema.json            — generator options (source of truth)
        schema.d.ts            — TS type for options (in sync with schema.json)
        preset.spec.ts
        lib/                   — generator helper code, COMPILED into dist
          patch-app-config.ts     — ts-morph patch of app.config.ts + updateJson of project.json styles
          patch-app-routes.ts     — ts-morph wrap of routes[] under a lazy-loaded layout shell + welcome index route (no-op for layout "none")
          patch-app-component.ts  — ts-morph swap of NxWelcome for <app-welcome/> (none) or <router-outlet/> (layout) in app.ts/app.html; deletes nx-welcome.ts
        files/                 — templates COPIED verbatim (never compiled). NO shared/ui/ — that moved to components.
          app/app.routes.ts.template
          config/provide-blueprint.ts.template, template-config.ts.template   (EJS <%= %>)
          welcome/welcome.ts   (EJS <%= name %>; → src/app/welcome.ts — themed starter screen, replaces @nx/angular's nx-welcome)
          layout/<sidebar|floating|inset|topbar>-shell/…, layout/sidebar-item-flyout.ts (shared)
          theme/theme.service.ts, language/language.service.ts   (→ src/app/core/theme|language/, only when layout != none)
          styles/theme.scss, tailwind-theme.css
          styles/tokens/_emit.scss (mixin), _scale.scss, _palette-default.scss, _palette-brand-x.scss
  components/                   — ✅ `ui` generator + all ~64 spartan-derived UI component sources
    generators.json            — registers the `ui` generator (factory → dist/generators/ui/ui)
    src/generators/ui/
      ui.ts, schema.json, schema.d.ts, ui.spec.ts
      lib/resolve-deps.ts      — in-kit dependency closure (regex) + FLAT_COMPONENTS
      lib/npm-deps.ts          — import-scan → { package: range } version map
      files/shared/ui/<~64 components>/…   (real .ts spartan-derived source, the whole kit)
  modules/  templates/         — ⬜ bare scaffold only, no generators yet
```

- `preset/lib/**` (and `generators/ui/lib/**`) = generator's own logic → compiled by `@nx/js:tsc` into `dist/`.
- `preset/files/**` (and `generators/ui/files/**`) = payload copied into the generated project → excluded from `tsconfig.lib.json`, shipped via the `assets` globs in each pillar's `package.json` (`**/!(*.ts)` from `src`, plus explicit `**/*.ts` globs — foundation: `files/layout`, `files/theme`, `files/language`; components: `files/shared/ui` — plus each generator's `schema.json`, plus foundation's `compatibility.json`). Any new `files/` subtree carrying real `.ts` source needs its own `**/*.ts` assets glob — the blanket `**/!(*.ts)` rule deliberately skips `.ts`.
- Theme token system: `_palette-*.scss` files are Sass maps; `tokens/_emit.scss`'s `emit-vars` mixin turns a map into `--var: value` declarations under a selector; `theme.scss` `@use`s the maps and emits the default palette on `:root` and `brand-x` on `.theme-brand-x`. `tailwind-theme.css`'s `@theme inline` only *references* those vars. The two style files never `@use`/`@import` each other.

## Critical architecture decisions (don't relitigate these without reason)

- **Standalone + zoneless + signals only.** `provideZonelessChangeDetection()`, no Zone.js, no NgModules anywhere.
- **CDK + spartan/ui's headless "brain" layer, not a fully pre-styled UI kit.** PrimeNG is explicitly avoided — it went commercial-license-only for government/public-sector use in mid-2026, which matters given some of this developer's client work.
- **Spartan's own CSS variable naming convention is used directly** (`--primary`, `--primary-foreground`, `--background`, `--destructive`, etc. — see `spartan.ng/documentation/theming`), NOT a custom `--color-*` scheme. This means restyling a Helm component to match a new brand palette requires **zero template edits** — only redefining the variable *values* in `theme.scss`. Never reintroduce a custom naming scheme for colors.
- **Tailwind v4 is kept available in generated projects, alongside SCSS**, specifically so consuming developers can use Tailwind utilities for their own custom work outside generated components. Tailwind's `@theme inline` block in `tailwind-theme.css` maps its utility classes to the same CSS variables the SCSS token system defines — one source of truth, two consumption paths. **Tailwind and SCSS files can never `@use`/`@import` each other** — they must stay as two separate entries in the styles array, in this order: `theme.scss` first, `tailwind-theme.css` second (Tailwind's `@theme inline` only *references* variables, it doesn't define them).
- **Copy-based generation, not npm-dependency-based, for anything a developer should be able to freely modify.** `@angular/cdk`, `@spartan-ng/brain`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@ng-icons/core`, `@ng-icons/lucide`, `embla-carousel`, `embla-carousel-angular`, `ngx-scrollbar` are real pinned npm dependencies (never copied, never modified) — the last five back specific pieces of the synced UI kit / layout shells. Everything under `shared/ui/`, `shared/components/`, `features/`, `layout/` is copied source the developer owns outright.
- **Flattened/standalone project layout** — generated projects use `rootProject: true` (app lives at the workspace root, no `apps/<name>/` nesting), matching what a plain `ng new` user expects, not Nx's default multi-project nesting.

## Generated project folder structure (src/app/)

```
core/          — app-wide singletons: interceptors, guards, config provider
shared/
  ui/            — foundation pillar: spartan-derived base pieces (button, utils, ...)
  components/       — components pillar: bigger composite pieces, on-demand
features/               — modules pillar + developer's own business domains.
                           Rule: features never import from other features directly,
                           only from shared/, core/, global/.
layout/                       — templates pillar: shells (admin-shell, analytics-shell)
global/                          — cross-cutting concerns no single feature owns
                                    (search, notifications). Empty by default; some
                                    future template generators may populate this.
```
Each feature owns its own lazy-loaded routes file; `app.routes.ts` (foundation-generated skeleton) gets AST-patched by later generators to wire them in.

## Generator conventions

- File is named `preset.ts` (or `<generator-name>.ts`), **not** `generator.ts` — matches what `@nx/plugin:generator` actually scaffolds.
- `app.config.ts` in the generated project is edited with `ts-morph` AST manipulation (`preset/lib/patch-app-config.ts`) — never plain string replacement, since exact file shape shifts across Angular/Nx versions. Structured JSON files (`tsconfig.json` `paths`, `project.json` `targets.build.options.styles`, generated `package.json` deps) are edited with `@nx/devkit`'s `updateJson`, not string replacement either.
- **Routing composition lives in its own helper (`preset/lib/patch-app-routes.ts`), separate from `patch-app-config.ts`** — providers/imports vs. route-tree shape are distinct concerns. It also uses `ts-morph` (wrap `routes[]` as `children` of a lazy-loaded shell route), never string replacement. A shell component's exported class name is **read from its own copied source** (`export class …` match), not derived from the `layout` value — same principle as computing UI paths/deps from what's actually in the `files/` tree.
- **`layout` enum values carry the `-shell` suffix** (`sidebar-shell`, not `sidebar`) and equal the folder name under `files/layout/` and in the generated `src/app/layout/`; the shell entry file is `<layout>/<layout>.ts`. Don't re-append `-shell` in path construction.
- **`project.json`, not `angular.json`**, holds the `styles` array in Nx-generated Angular apps — there is no workspace-wide `angular.json` in this setup. (This was a real bug hit and fixed mid-project — don't reintroduce the `angular.json` assumption.)
- `compatibility.json` is read via `readFileSync`/`JSON.parse` at generator runtime, **not** via a static `import * as compatibility from '...json'` — the static-import form produced inconsistent interop behavior (values resolving to `undefined`) under this workspace's `module: nodenext` config.
- Any folder under a generator's `files/` directory containing real `.ts` source (meant to be copied verbatim, not compiled) must be excluded from `tsconfig.lib.json`'s compilation (`"exclude": ["src/generators/**/files/**/*"]`) and instead copied via an explicit `assets` glob rule in the package's `nx.targets.build.options.assets` array. Forgetting either half of this causes either TS compile errors (trying to resolve spartan/cva/clsx imports that aren't foundation's own dependencies) or missing files in `dist`.
- **Never let a manually-created `project.json` coexist with `package.json`-based inferred Nx configuration for the same pillar package.** This caused a real, hard-to-diagnose bug: a stale `project.json` created early in the project silently overrode every subsequent edit to `package.json`'s `nx.targets.build.options.assets`, for a long stretch of debugging. If a pillar ever behaves as if config edits aren't taking effect, check for a stray `project.json` first.
- TypeScript path entries (`compilerOptions.paths`) for UI components are **generated programmatically** — the `@blueprint-platform/components:ui` generator writes one `@blueprint-platform/ui/<name>` entry per component it copies (except the flat family). Never hardcode a per-component path list. `preset.ts` no longer touches UI paths at all; it delegates the whole starter-set + layout-set copy (files, paths, npm deps) to that generator.
- **UI-component npm deps are computed, not hardcoded in `preset.ts`.** `ui`'s `lib/npm-deps.ts` scans each copied component's real `from '…'` specifiers and adds only the matching packages. `preset.ts` keeps just `@angular/cdk` + the Tailwind toolchain. Adding a component that needs a new package means updating the `UI_NPM_DEPS` map + `SPECIFIER_TO_PKG` in `lib/npm-deps.ts`, nowhere else.

## Registry / publishing conventions

- Real registry: **npm public registry**, scope `@blueprint-platform` (chosen because `@blueprint` itself may not have been available as an npm org — confirm before assuming).
- Local testing registry: Verdaccio (`npx verdaccio`, `http://localhost:4873`).
- **Critical gotcha:** if `.npmrc` (project-local or global `~/.npmrc`) has a scope-specific registry mapping (`@blueprint-platform:registry=...`), it silently overrides any `--registry=` flag passed to `npm publish`/`npm dist-tag`/`create-nx-workspace` for that scope. Use the scoped-override flag form instead when testing locally: `npm publish --@blueprint-platform:registry=http://localhost:4873`. Remember to point the scope back at the real npm registry once local testing is done.
- Two dist-tags drive version resolution: `latest` (bleeding edge) and `stable` (tested-as-a-set, gated by manually updating `compatibility.json`). The CLI (once built) should resolve `stable` by default, never resolve an embedded version string directly in `--preset=@scope/pkg@x.y.z` — this is unreliable on current Nx for scoped packages (known upstream bug, Nx issue #23174) and should always go through a dist-tag instead.
- `package.json` for a publishable pillar needs: `"generators": "./generators.json"` (top-level field, easy to forget), an `exports` entry for `./generators.json` specifically (Node's `exports` is a strict allowlist), and a `"files"` array including `dist`, `generators.json`, and `compatibility.json` (otherwise `.gitignore`-based default packing may silently exclude `dist/`).

## Workflow discipline (from the governance doc, still applies)

- `blueprint-reference` folder structure mirrors the pillar targets 1:1 (`src/app/ui/button/` ↔ `packages/components/src/generators/ui/files/shared/ui/button/` — UI kit now lives in the components pillar, not foundation) specifically so syncing is mechanical, not a judgment call.
- A piece is "sync-ready" only when: it uses only spartan/theme CSS variables (no hardcoded colors), has no console errors, works in both RTL and LTR if layout-sensitive, and the brain/behavior layer is provably untouched from spartan's original.
- Every sync gets a `SYNC_LOG.md` entry and a git tag (`sync/<name>/<version>`) in `blueprint-reference`, recording exactly which reference-app commit backs which published pillar version.

## When picking up work in this repo

1. Check `compatibility.json` and each pillar's `package.json` version to know current published state.
2. Check this file's "Current status" section (keep it updated) before assuming what's built.
3. Any new generator template content should first exist, verified, in `blueprint-reference` — unless it's genuinely generator-only content with no reference-app equivalent.
4. Test locally against Verdaccio before ever publishing to real npm.
