# Blueprint Platform — Developer Guide

Blueprint is an Angular **project builder**. Answer a few prompts and get a production-ready Angular app: zoneless, signal-driven, themed (light/dark, RTL), with a headless-first UI kit already wired in. Afterwards, add layouts, UI components, business modules and forms on demand with one command each.

- [1. Quick start](#1-quick-start)
- [2. The packages](#2-the-packages)
- [3. What a generated project looks like](#3-what-a-generated-project-looks-like)
- [4. Command reference](#4-command-reference)
  - [Create a project](#41-create-a-project)
  - [`blueprint add layout`](#42-blueprint-add-layout)
  - [`blueprint add component`](#43-blueprint-add-component)
  - [`blueprint add module`](#44-blueprint-add-module)
  - [`blueprint add form`](#45-blueprint-add-form)
- [5. Using the Nx generators directly](#5-using-the-nx-generators-directly)
- [6. Writing a form model (`bp.models`)](#6-writing-a-form-model-bpmodels)
- [7. Configuration, environments and API](#7-configuration-environments-and-api)
- [8. Release channels and versions](#8-release-channels-and-versions)
- [9. Troubleshooting](#9-troubleshooting)

---

## 1. Quick start

Requirements: a current LTS release of **Node.js** and npm.

```bash
npx create-blueprint-app
```

You will be asked for a project name, a starting point (**Blank** or **Admin Dashboard**), a release channel, whether to enable RTL and, for Blank, a layout and the theme/language switchers.

```bash
cd my-app
npx nx serve my-app
```

Prefer Nx directly? The same project is produced by:

```bash
npx create-nx-workspace@latest my-app --preset=@blueprint-platform/foundation@latest
```

Then, from inside the project, add things as you need them:

```bash
npx blueprint add layout
npx blueprint add component
npx blueprint add module
npx blueprint add form
```

## 2. The packages

Blueprint is an Nx workspace of independently versioned npm packages (scope `@blueprint-platform`).

| Package | What it is | Who uses it |
|---|---|---|
| **`create-blueprint-app`** | Interactive project-creation command (`npx create-blueprint-app`). Lives in its own repository. | You, once per project |
| **`@blueprint-platform/foundation`** | The **preset** generator that scaffolds the whole app (theme tokens, config provider, routing skeleton, base UI, environments, optional i18n) and the `layout` generator. | Installed as a dev dependency of every generated project |
| **`@blueprint-platform/components`** | The ~64 spartan-derived UI components and the `ui` generator that copies them (plus their dependencies) into your project. | Dev dependency of generated projects |
| **`@blueprint-platform/modules`** | Business-domain generators: `auth`, `rbac`, `user-management`, and `form`. | Dev dependency of generated projects |
| **`@blueprint-platform/cli`** | The `blueprint` command (`blueprint add layout|component|module|form`). | Dev dependency of generated projects |
| `@blueprint-platform/cli-core` | Shared engine behind both command-line tools. | Internal — a dependency of the CLIs |
| `@blueprint-platform/generator-kit` | Helpers for *authoring* generators (add providers, routes, nav links, manifest entries). | Internal — a dependency of the generator packages; never ends up in your project |
| `@blueprint-platform/templates` | Planned composite presets (e.g. admin-dashboard). Not published yet. | — |

You normally only interact with `create-blueprint-app` and `blueprint`. The rest are installed for you.

### Philosophy: you own the code

UI components, layouts, module pages and forms are **copied into your project** as ordinary source files. Edit them freely — nothing is hidden in `node_modules`. Only genuinely external libraries (`@angular/cdk`, `@spartan-ng/brain`, `@ng-icons/*`, Tailwind, …) are real dependencies, and only the ones the code you generated actually uses are added.

## 3. What a generated project looks like

```
src/app/
  core/          app-wide singletons: interceptors, guards, config, theme/language services
  shared/ui/     UI components copied by `add component` (imported as @blueprint-platform/ui/<name>)
  features/      modules and your own business features (features never import other features)
  layout/        the app shell chosen with `add layout`
  global/        cross-cutting concerns no single feature owns
src/environments/   environment.ts + dev / test / stg / prd variants
src/styles/         theme.scss (design tokens), tailwind-theme.css, _utilities.scss
.blueprint/manifest.json   what was generated, with which versions
```

Highlights: standalone components only, `provideZonelessChangeDetection()`, Tailwind v4 next to SCSS (both driven by the same CSS variables), light/dark theme, optional multi-language with RTL driven by a language registry, a root-relative API interceptor and an Orval config for generating API clients.

`.blueprint/manifest.json` records installed components, modules, layouts and forms. The CLI reads it to tell you when something is already added.

## 4. Command reference

### 4.1 Create a project

```bash
npx create-blueprint-app
```

| Prompt | Meaning |
|---|---|
| Project name | Folder and Nx project name |
| Starting point | **Blank** — you pick layout/switchers. **Admin Dashboard** — sidebar layout, both switchers, plus `auth`, `rbac` and `user-management` already added |
| Release channel | `stable` (recommended) or `latest` (may include unreleased changes) |
| Enable RTL | Right-to-left support from the start |
| Layout *(Blank)* | `sidebar-shell`, `floating-shell`, `inset-shell`, `topbar-shell` or `none` |
| Theme / language switching *(Blank, with a layout)* | Adds the switchers to the shell |

Using `create-nx-workspace` directly exposes the full preset option list:

| Option | Default | Description |
|---|---|---|
| `--name` | — | Project name (required) |
| `--palette` | `default` | Colour palette |
| `--rtl` | `false` | Enable RTL |
| `--layout` | `none` | `sidebar-shell` \| `floating-shell` \| `inset-shell` \| `topbar-shell` \| `none` |
| `--showThemeSwitcher` | `true` | Theme switcher in the shell |
| `--showLanguageSwitcher` | `true` | Installs ngx-translate and the language switcher |
| `--languages` | `en,ar` | Any of `en, ar, fr, es, de, he, fa, ur` (only `en` and `ar` ship real translations; other codes get English placeholders marked with a `_note` key) |
| `--apiUrl` | `""` | Backend **origin only** (e.g. `https://api.example.com`) — never a path |
| `--appVersion` | `0.1.0` | Written to `environment.ts` |

### 4.2 `blueprint add layout`

```bash
npx blueprint add layout
```

Shows the available app shells and adds your choice: the shell, the UI components it needs, the account menu, and the welcome page as its index route. The shell wraps your existing routes. Existing `auth` pages stay outside it.

| Shell | Description |
|---|---|
| `sidebar-shell` | Collapsible icon-rail sidebar |
| `floating-shell` | Floating, off-canvas sidebar |
| `inset-shell` | Inset content area beside the sidebar |
| `topbar-shell` | Top bar with sidebar |

Selecting one that's already installed just warns — nothing is regenerated.

### 4.3 `blueprint add component`

```bash
npx blueprint add component
```

A multi-select over the full UI catalog (accordion, alert, button, calendar, card, carousel, combobox, data-entry controls, dialog, dropdown-menu, sidebar, table, tabs, tooltip, … ~64 in total). The dependencies of what you pick (other components and npm packages) are added automatically; components already present are skipped.

Import them with the generated path alias:

```ts
import { HlmButtonImports } from '@blueprint-platform/ui/button';
```

### 4.4 `blueprint add module`

```bash
npx blueprint add module
```

Pick one module. Each is **fully independent** — none requires another, in any order. Each adds its own link(s) to the app shell menu if a shell exists (`auth` adds none: its pages live outside the shell).

| Module | What you get | Prompts |
|---|---|---|
| **`auth`** | Mock-backed login, optional signup / forgot-password (email → code → new password) / change-password forms, JWT or session strategy with interceptor, token store, and a split or centered auth layout, mounted at `/auth` | Strategy (`jwt`/`session`), token storage (`local`/`memory`), layout (`split`/`centered`), and whether to include signup, forgot-password, change-password. Login is always included |
| **`rbac`** | Roles and permissions admin pages, a permission guard, a `/forbidden` page, and a `CURRENT_USER_PERMISSIONS` token to plug in your own permission source | Route prefix (default `admin` → `admin/permissions`, `admin/roles`) |
| **`user-management`** | User list with add / edit / details / change-role / deactivate | Route prefix (default `admin/users`) |

The generated data layers use mock storage so the pages work immediately; replace the services with real API calls when ready. Domain models and services land in `src/app/features/<module>/{models,services}/`; cross-cutting pieces (guards, interceptors, tokens) in `src/app/core/<module>/`.

To protect routes with RBAC, replace the default permissions source with your own:

```ts
providers: [{ provide: CURRENT_USER_PERMISSIONS, useClass: MyPermissionsService }]
```

### 4.5 `blueprint add form`

```bash
npx blueprint add form
```

Generates a reusable form component from a **model file you write** (see [section 6](#6-writing-a-form-model-bpmodels)). Prompts:

| Prompt | Default | Notes |
|---|---|---|
| Form name | — | kebab-case, e.g. `user-form`; selector becomes `app-user-form` |
| Model path | `bp.models/<name>.ts` | Relative to the project root; must exist |
| Destination | `features/forms` | Relative to `src/app/`; the form is written to `<destination>/<name>/` |

Output: `<name>.ts`, `<name>.html`, `<name>.scss` — a standalone component with a typed `FormGroup`, validators and error messages. No routes or menu entries are added; import the component wherever you need it. Any UI components the form needs are installed automatically.

## 5. Using the Nx generators directly

Everything the CLI does is a plain Nx generator, handy for scripts and CI (`--no-interactive`):

```bash
# layouts
npx nx g @blueprint-platform/foundation:layout --name=sidebar-shell
npx nx g @blueprint-platform/foundation:layout --list

# components
npx nx g @blueprint-platform/components:ui --components=button,card,dialog
npx nx g @blueprint-platform/components:ui --all
npx nx g @blueprint-platform/components:ui --list

# modules
npx nx g @blueprint-platform/modules:auth --authType=session --storeType=memory --authLayout=centered \
         --includeSignup=false --includeForgotPassword=true --includeChangePassword=true
npx nx g @blueprint-platform/modules:rbac --routePrefix=admin
npx nx g @blueprint-platform/modules:user-management --routePrefix=admin/users

# form
npx nx g @blueprint-platform/modules:form --name=user-form --model=bp.models/user.ts --directory=features/users
```

Running a module generator twice is safe: `auth` detects it is already installed and does nothing.

## 6. Writing a form model (`bp.models`)

A model is a plain TypeScript file exporting an array of field entries. The generator reads it **statically** (it is never executed), so only literal values are allowed — no spreads, computed keys, function calls or imported constants.

```ts
// bp.models/user.ts
import type { FieldModelEntry } from '@blueprint-platform/modules';

export const fields: FieldModelEntry[] = [
  {
    type: 'textInput',
    formControlName: 'email',
    label: 'Email',
    colSpan: 12, colSpanSm: 12, colSpanMd: 6,
    validators: { required: true, email: true },
  },
  {
    type: 'select',
    formControlName: 'role',
    label: 'Role',
    colSpan: 12, colSpanSm: 12, colSpanMd: 6,
    validators: { required: { message: 'Pick a role' } },
  },
  {
    type: 'group',
    formControlName: 'address',
    label: 'Address',
    colSpan: 12, colSpanSm: 12, colSpanMd: 12,
    fields: [
      { type: 'textInput', formControlName: 'street', label: 'Street', colSpan: 12, colSpanSm: 12, colSpanMd: 6 },
    ],
  },
  {
    type: 'button',
    label: 'Save',
    handler: 'onSave',
    variant: 'primary',
    colSpan: 12, colSpanSm: 12, colSpanMd: 12,
  },
];
```

**Field types:** `textInput`, `numberInput`, `timePicker`, `select`, `selectMultiple`, `combobox`, `comboboxMultiple`, `datePicker`, `dateRangePicker`, `inputOtp`, `attachment`, `radioGroup`, `slider`, `switchToggle`, `checkbox`, plus `button`, `group` (nested `FormGroup`) and `array` (repeatable `FormArray` with add/remove).

**Common properties:** `formControlName` (unique among siblings, valid identifier), `label`, `colSpan` / `colSpanSm` / `colSpanMd` (12-column grid, all required), optional `defaultValue`, optional `validators`.

**Validators** are declarative. Each key takes a value or `{ value, message }`; flag keys (`required`, `requiredTrue`, `email`) take `true`, `false` or a custom message string. Built-ins map to Angular's `Validators`; the rest (`minDate`/`maxDate`, `minRangeDays`/`maxRangeDays`, `minSelected`/`maxSelected`, `maxFileSizeMb`/`allowedExtensions`/`maxFiles`) are generated into `src/app/shared/forms/custom-validators.ts`, which you own. Allowed keys depend on the field type, and TypeScript flags mistakes in your model file.

**Buttons** call a handler method; the generator creates an empty `onSave(): void { /* TODO */ }` stub per unique handler name for you to implement.

**Arrays:** `itemTemplate` describes one row; `minItems` (default 1), `maxItems`, `addButtonLabel`, `removeButtonLabel` customise it. Add/remove logic is generated and enforces the limits. Groups and arrays can nest to any depth.

**Attachments:** the generated component has `onAttachmentsSelected` / `removeAttachment` stubs — call `setValue` on the control with the chosen `File[]` so validators and error messages work.

## 7. Configuration, environments and API

- **Config:** `src/app/core/config/template-config.ts` holds `BLUEPRINT_CONFIG` (theme/language switcher flags and more); override via `provideBlueprint(...)` in `app.config.ts`.
- **Theme:** edit colour values in `src/styles/tokens/_palette-*.scss`. Component styling uses spartan's variable names (`--primary`, `--background`, …), so a new brand needs no template edits.
- **Environments:** `environment.{dev,test,stg,prd}.ts` are swapped in by build configurations. Run `npx nx build <app> -c prd` or `npx nx serve <app> -c dev`. Fill in each file's `apiUrl`.
- **API origin only:** `apiUrl` must be scheme + host + port, no path. Generated API methods already carry their own `/api/...` prefix; a path in `apiUrl` would double it.
- **API interceptor:** prefixes `API_URL` onto root-relative (`/…`) requests; absolute URLs pass through.
- **Dev proxy:** `proxy.config.json` forwards `/api` to your backend origin during `serve`.
- **API client generation:** `npm run generate:api` runs Orval (`orval.config.ts`) against your backend's OpenAPI document (`ORVAL_API_URL` overrides the source).

## 8. Release channels and versions

Each package has its own semantic version. Two npm dist-tags are used:

- **`latest`** — newest published build.
- **`stable`** — a set of versions tested together. `create-blueprint-app` defaults to it.

A generated project's `.blueprint/manifest.json` and its `devDependencies` pin the exact `components`, `modules` and `cli` versions it was generated from, so `npx blueprint add …` always uses generators compatible with your project.

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `blueprint add …` says a layout/module is "already added" | It is in `.blueprint/manifest.json`; nothing to do |
| Generator seems to run but changes nothing (Nx dev environment) | An inherited `NX_WORKSPACE_ROOT_PATH` makes Nx load generator sources from a different workspace. Unset it (the CLI already does this for you) |
| Requests go to `/api/api/...` | `apiUrl` contains a path. Use the origin only |
| Build error `Cannot find module '@blueprint-platform/ui/<name>'` | Run `npx blueprint add component` and pick `<name>` |
| Added a module before a layout and the menu has no link | Links are only injected when a shell already exists. Add the layout first, or add the link to the shell template by hand |
| Overlay components throw `valueSignal is not a function` | Project generated before foundation `0.1.31`; add `readonly valueSignal = this.dir;` to `core/language/language.service.ts` or regenerate |
| Form error messages never show for an attachment field | Call `setValue` on its control from `onAttachmentsSelected` |
