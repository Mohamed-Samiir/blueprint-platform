<!--
================================================================================
 Spartan sidebar — generated-output inspection (Task 1)
================================================================================

Component was generated with `ng g @spartan-ng/cli:ui --name=sidebar` (style: nova,
import alias `@blueprint-platform/ui`). Output lives in
`src/app/ui/sidebar/src/`. Nothing below was restyled — spartan's own
`--sidebar*` / `bg-sidebar` variable naming is used verbatim; the only project-side
change was wiring those token names into the existing token layer (see "Token
wiring" note at the bottom), no template edits.

--------------------------------------------------------------------------------
 1. Every generated subcomponent file and what it's for
--------------------------------------------------------------------------------

Structural / shell:
  hlm-sidebar.ts                 <hlm-sidebar> — the sidebar surface itself.
                                 Inputs: side, variant, collapsible,
                                 sidebarWidthMobile, sidebarContainerClass.
                                 On desktop renders a fixed gap div + fixed
                                 container + inner surface; on mobile (service
                                 .isMobile()) swaps to <hlm-sheet> off-canvas.
  hlm-sidebar-wrapper.ts         [hlmSidebarWrapper] / <hlm-sidebar-wrapper> —
                                 outermost flex wrapper. Sets `--sidebar-width`
                                 and `--sidebar-width-icon` CSS vars from config.
                                 `has-data-[variant=inset]:bg-sidebar` here is
                                 what paints the inset gutter.
  hlm-sidebar-inset.ts           main[hlmSidebarInset] — the content pane that
                                 sits next to the sidebar. Carries the
                                 `peer-data-[variant=inset]` margin/rounding/shadow
                                 that produces the "inset" look.
  hlm-sidebar-rail.ts            button[hlmSidebarRail] — thin click strip on the
                                 sidebar edge that toggles collapse.
  hlm-sidebar-trigger.ts         button[hlmSidebarTrigger] — icon button
                                 (lucidePanelLeft) that toggles the sidebar.
                                 hostDirective: HlmButton.

Regions:
  hlm-sidebar-header.ts          [hlmSidebarHeader] — top region (flex col, p-2).
  hlm-sidebar-footer.ts          [hlmSidebarFooter] — bottom region (flex col, p-2).
  hlm-sidebar-content.ts         [hlmSidebarContent] — scrollable middle region.
  hlm-sidebar-separator.ts       [hlmSidebarSeparator] — hostDirective HlmSeparator,
                                 `bg-sidebar-border`.
  hlm-sidebar-input.ts           input[hlmSidebarInput] — hostDirective HlmInput,
                                 sidebar-tuned search field.

Groups:
  hlm-sidebar-group.ts           [hlmSidebarGroup] — a titled section.
  hlm-sidebar-group-label.ts     div/button[hlmSidebarGroupLabel] — group heading;
                                 collapses to 0 opacity in `collapsible=icon`.
  hlm-sidebar-group-content.ts   div[hlmSidebarGroupContent] — group body.
  hlm-sidebar-group-action.ts    button[hlmSidebarGroupAction] — action button
                                 pinned to the group's top-right (end-3).

Menu:
  hlm-sidebar-menu.ts            ul[hlmSidebarMenu] — menu list.
  hlm-sidebar-menu-item.ts       li[hlmSidebarMenuItem] — menu row wrapper
                                 (`group/menu-item`).
  hlm-sidebar-menu-button.ts     button/a[hlmSidebarMenuButton] — the clickable
                                 row. cva variants: variant (default|outline),
                                 size (default|sm|lg). Inputs: isActive,
                                 closeMobileSidebarOnClick. hostDirective:
                                 BrnTooltip (label shown only when collapsed to
                                 icon rail).
  hlm-sidebar-menu-action.ts     button[hlmSidebarMenuAction] — per-row action
                                 button; input showOnHover.
  hlm-sidebar-menu-badge.ts      [hlmSidebarMenuBadge] — per-row count/badge.
  hlm-sidebar-menu-skeleton.ts   <hlm-sidebar-menu-skeleton> — loading placeholder
                                 row; input showIcon; hostDirective HlmSkeleton.
  hlm-sidebar-menu-sub.ts        ul[hlmSidebarMenuSub] — nested sub-list; hidden
                                 in `collapsible=icon`. Has explicit
                                 `rtl:-translate-x-px`.
  hlm-sidebar-menu-sub-item.ts   li[hlmSidebarMenuSubItem] — sub row wrapper.
  hlm-sidebar-menu-sub-button.ts a/button[hlmSidebarMenuSubButton] — sub row link;
                                 inputs size (sm|md), isActive,
                                 closeMobileSidebarOnClick.

Non-component files:
  hlm-sidebar.service.ts         HlmSidebarService, `providedIn: 'root'`. Holds
                                 open / openMobile / isMobile / variant / state
                                 signals, cookie persistence of the open state,
                                 the `Ctrl/Cmd+B` shortcut, and the
                                 `(max-width: mobileBreakpoint)` media-query watch.
                                 Exports type `SidebarVariant`.
  hlm-sidebar.token.ts           HlmSidebarConfig interface + defaults, the
                                 InjectionToken, `provideHlmSidebarConfig()` and
                                 `injectHlmSidebarConfig()`. (see point 2)
  index.ts                       Barrel. Re-exports every symbol above and exports
                                 the `HlmSidebarImports` array (all 22 directives/
                                 components) for standalone `imports: [...]`.

--------------------------------------------------------------------------------
 2. DI provider function
--------------------------------------------------------------------------------

YES — `provideHlmSidebarConfig(config: Partial<HlmSidebarConfig>): ValueProvider`
in `hlm-sidebar.token.ts`.

Difference from the `OVERLAY_DEFAULT_CONFIG` pattern in
`src/app/ui/utils/src/lib/provide-spartan-hlm.ts`: that one returns
`makeEnvironmentProviders([...])` (EnvironmentProviders). `provideHlmSidebarConfig`
is lighter — it just returns a plain `ValueProvider`
`{ provide: HlmSidebarConfigToken, useValue: { ...defaultConfig, ...config } }`.
Consumption is via `injectHlmSidebarConfig()`, which falls back to the module-level
`defaultConfig` when the token is not provided, so providing it is optional.

Config keys (all optional in the partial): defaultOpen (true), sidebarWidth
("16rem"), sidebarWidthMobile ("18rem"), sidebarWidthIcon ("3rem"),
sidebarCookieName ("sidebar_state"), sidebarCookieMaxAge (7 days),
sidebarKeyboardShortcut ("b"), mobileBreakpoint ("768px"),
closeMobileSidebarOnMenuButtonClick (false).

The trigger also provides `provideIcons({ lucidePanelLeft })` and
`provideBrnButtonConfig(...)`; the menu-button provides
`provideBrnTooltipDefaultOptions(...)`. Those are component-scoped, not app-level
DI functions.

--------------------------------------------------------------------------------
 3. Exact input names / values
--------------------------------------------------------------------------------

`variant`     on <hlm-sidebar>. Type `SidebarVariant = 'sidebar' | 'floating' | 'inset'`.
              Default = `this._sidebarService.variant()` (which itself defaults to
              'sidebar'). An `effect()` in HlmSidebar pushes the input value back
              into the service. Reflected to host as `[attr.data-variant]` (only
              while collapsible !== 'none' and not mobile).

`collapsible` on <hlm-sidebar>. Type `'offcanvas' | 'icon' | 'none'`. Default
              `'offcanvas'`. 'none' => static full-height sidebar, no sheet, no
              collapse. Reflected to host as `[attr.data-collapsible]` with value
              ''` | 'icon' | 'offcanvas'` depending on state.

`side`        on <hlm-sidebar>. Type `'left' | 'right'`. Default `'left'`.
              Reflected as `[attr.data-side]`. NOTE: physical, not logical —
              see point 5 / RTL below. Also accepted on the mobile <hlm-sheet>.

Other inputs seen: sidebarWidthMobile (string), sidebarContainerClass (ClassValue)
on <hlm-sidebar>; sidebarWidth / sidebarWidthIcon on [hlmSidebarWrapper];
variant ('default'|'outline'), size ('default'|'sm'|'lg'), isActive (boolean),
closeMobileSidebarOnClick (boolean) on [hlmSidebarMenuButton]; size ('sm'|'md'),
isActive, closeMobileSidebarOnClick on [hlmSidebarMenuSubButton]; showOnHover on
[hlmSidebarMenuAction]; showIcon on <hlm-sidebar-menu-skeleton>; srOnlyText on
the trigger; aria-label on the rail.

--------------------------------------------------------------------------------
 4. Imports in the generated files vs. existing project dependencies
--------------------------------------------------------------------------------

Full set of `from '...'` targets across `src/app/ui/sidebar/src/lib/*.ts`:

  @angular/common                 Angular (already present)
  @angular/core                   Angular (already present)
  @angular/cdk/coercion           from @angular/cdk — already a dependency
  @spartan-ng/brain/tooltip       from @spartan-ng/brain — already a dependency
  class-variance-authority        already a dependency
  clsx                            already a dependency
  tailwind-merge                  used transitively via @blueprint-platform/ui/utils
                                  — already a dependency
  @ng-icons/core                  already a dependency (^32.2.0) — used by the
                                  trigger (NgIcon, provideIcons)
  @ng-icons/lucide                already a dependency (^32.2.0) — used by the
                                  trigger (lucidePanelLeft)
  @blueprint-platform/ui/button   internal (tsconfig path)
  @blueprint-platform/ui/input    internal
  @blueprint-platform/ui/separator internal
  @blueprint-platform/ui/sheet    internal — sidebar's mobile off-canvas
  @blueprint-platform/ui/skeleton internal
  @blueprint-platform/ui/tooltip  internal
  @blueprint-platform/ui/utils    internal (hlm, classes)

=> NO new third-party dependency is introduced by the sidebar generator. Every
   external import already exists in package.json. The internal
   `@blueprint-platform/ui/*` paths that must already be generated for sidebar to
   compile: button, input, separator, sheet, skeleton, tooltip, utils — all
   present.

--------------------------------------------------------------------------------
 5. RTL behaviour of `side` (Task 2.5 finding)
--------------------------------------------------------------------------------

`side` does NOT auto-flip under `dir="rtl"`. The sidebar container positions
itself with PHYSICAL properties keyed off `data-side`:
  data-[side=left]:left-0 / data-[side=right]:right-0
  group-data-[side=left]:border-r / group-data-[side=right]:border-l
  offcanvas translate uses `var(--sidebar-width)*-1` on left/right physically
The mobile <hlm-sheet> is likewise physical (data-[side=left]:left-0 …).

Only a few descendants carry explicit `rtl:` handling that spartan added by hand:
`hlm-sidebar-rail` (`rtl:-translate-x-1/2`) and `hlm-sidebar-menu-sub`
(`rtl:-translate-x-px`). Inner spacing/text uses logical utilities
(ps-/pe-/text-start/gap) and flips correctly on its own.

Consequence: to get a sidebar anchored to the visual START in RTL you must pass
`side="right"`. The three shells handle this themselves by reading
`Directionality` from `@angular/cdk/bidi` and computing
`side = dir === 'rtl' ? 'right' : 'left'`, so each shell is correct standalone
under both directions with no caller involvement.

--------------------------------------------------------------------------------
 Token wiring note (not a restyle)
--------------------------------------------------------------------------------

The generated files reference `bg-sidebar`, `text-sidebar-foreground`,
`bg-sidebar-accent`, `border-sidebar-border`, `ring-sidebar-ring`, etc. Those
Tailwind v4 utilities resolve only if `--color-sidebar*` exist in the
`@theme inline` block. This project hand-rolls its theme
(`src/styles/tailwind-theme.css`) rather than importing
`@spartan-ng/brain/hlm-tailwind-preset.css`, and the sidebar names were missing.

Added (same mechanism as every other spartan colour in this repo — NOT a
template/class edit to any sidebar file):
  - `src/styles/tokens/_palette-default.scss`  : sidebar* colour values
  - `src/styles/tokens/_palette-brand-x.scss`  : sidebar* colour values
    (brand-x uses a dark sidebar so the preview's palette toggle is visible)
  - `src/styles/tailwind-theme.css`            : `--color-sidebar* : var(--sidebar*)`

The future blueprint-platform sync task list will need to emit the same three
edits into the generated template.
-->

# `src/app/layout/`

Four thin layout-shell components, plus notes. See the comment block above for
the Task 1 inspection of the generated spartan sidebar. The shells are
deliberately independent copies (no shared base class); each is split into
`.ts` + `.html` + `.scss` (the `.scss` carries the `:host { display: block }`
fix — see "Known issues" M1):

| Folder            | Component       | spartan `variant` | notes                                   |
| ----------------- | --------------- | ----------------- | --------------------------------------- |
| `sidebar-shell/`  | `SidebarShell`  | `"sidebar"`       | `collapsible="icon"` + hover flyout (M4) |
| `floating-shell/` | `FloatingShell` | `"floating"`      | `collapsible="offcanvas"`               |
| `inset-shell/`    | `InsetShell`    | `"inset"`         | content bg tracks `--sidebar` (M6)       |
| `topbar-shell/`   | `TopbarShell`   | `"sidebar"`       | adds a self-contained top bar           |

Each renders `hlm-sidebar-wrapper` > (`hlm-sidebar` + `main[hlmSidebarInset]`)
with a header (brand + `hlmSidebarInput`), a full showcase of every spartan
sidebar item type (M5), a user-account dropdown in the footer (M3), an
`hlmSidebarRail`, and a `<router-outlet>` for page content. `sidebar-shell` /
`floating-shell` / `inset-shell` are RTL-aware via `@angular/cdk/bidi`
(`Directionality`); `topbar-shell` instead owns `dir` as its own signal.

### `topbar-shell` specifics

- The **top bar** is the first child of `main[hlmSidebarInset]`, `position: sticky`
  (never `fixed`), so it starts at the sidebar's inner edge and cannot overlap the
  sidebar (A3), in LTR or RTL, collapsed or expanded.
- It hosts: `hlmSidebarTrigger` (collapse/expand), a palette toggle, and a
  language menu (English / العربية).
- The shell is **self-contained**: `dir` and the `theme-brand-x` class are its own
  signals applied to its own `hlm-sidebar-wrapper`. It does not read or depend on
  the `layout-preview` toolbar. On `/layout-preview/topbar` the top bar is
  authoritative and the toolbar's RTL/palette toggles are redundant there (the
  toolbar is left as-is on purpose).
- **No real i18n**: switching language only flips `dir` and the button label —
  this is a reference app, not a translated one.

Preview all four at the `layout-preview` route (see `src/app/layout-preview/`),
which adds a shell switcher, an RTL toggle and a palette (`theme-brand-x`) toggle.

## Known issues

### The `position: fixed` sidebar paints on top of the routed content (M1)

**Symptom:** in the `layout-preview` the sidebar surface overlaps the inset page
content instead of sitting beside it, in all three variants.

**Chain of layout facts:**

1. `layout-preview.ts` renders `<app-*-shell>` inside
   `<div class="min-h-0 flex-1 overflow-auto" [dir] [class.theme-brand-x]>`.
2. Each shell renders
   `hlm-sidebar-wrapper > (hlm-sidebar + main[hlmSidebarInset])`.
   `HlmSidebarWrapper` applies `flex min-h-svh w-full` — it is a flex **row**
   that wants to be `width: 100%` / `min-height: 100svh` of its parent.
3. Inside `<hlm-sidebar>` the visible sidebar surface is
   `data-slot="sidebar-container"` = `fixed inset-y-0 left-0 z-10 …` — it is
   `position: fixed`, pinned to the **viewport** left edge, and contributes
   nothing to layout flow. The only thing reserving horizontal space for it is
   its sibling `data-slot="sidebar-gap"` div (`w-(--sidebar-width)`, i.e. 16rem)
   — an ordinary in-flow block.
4. So the intended row is `[gap 16rem][main flex-1]`, and the fixed surface
   simply overlays the 16rem gap. That only holds if the row actually has a
   definite full width.

**Root cause:** an Angular component host element defaults to `display: inline`.
None of `SidebarShell` / `FloatingShell` / `InsetShell` set a host `display`, so
`<app-*-shell>` is an **inline** box. `hlm-sidebar-wrapper`'s `width: 100%` and
`min-height: 100svh` then resolve against an inline containing block that has no
definite width — the flex row collapses to content width, the 16rem
`sidebar-gap` no longer stretches the row, and `main[hlmSidebarInset]` ends up
starting at x ≈ 0. The `position: fixed` sidebar (also at viewport `left: 0`)
therefore lands directly over the inset content.

`overflow-auto` / `[dir]` on the preview wrapper are **not** the cause — neither
establishes a containing block for `position: fixed`, and the fixed surface would
target the viewport regardless. Spartan's own docs never hit this because they
mount `hlm-sidebar-wrapper` straight onto a block-level page element.

**Fix (applied in M2, not M1):** give each shell `:host { display: block }` (a
`flex`/`grid` host works too). M2 splits every shell into `.ts` / `.html` /
`.scss`, and the new `.scss` is where that one rule now lives. Until M2 lands the
overlap is expected.

### Missing spartan `@custom-variant` declarations (fixed)

`hlmSidebarMenuButton` binds `[attr.data-active]="isActive()"`, so an inactive
button renders `data-active="false"`. spartan's `data-active:` utilities are
meant to match only a *truthy* value — but that behaviour lives in
`@spartan-ng/brain/hlm-tailwind-preset.css`, which this repo does not import. With
the preset absent, Tailwind's default `data-active:` compiled to a bare
`[data-active]` **presence** match, so every menu button (and every other helm
component using `data-open` / `data-closed` / `data-checked` / … ) picked up its
"on" styling permanently — visible as **every sidebar link looking active**.

Fixed by copying spartan's `@custom-variant` block verbatim into
`src/styles/tailwind-theme.css` (same "hand-roll what the preset would have given
us" approach as the `--color-sidebar*` wiring). `dark` is intentionally left out —
this repo switches palettes with `.theme-brand-x`, not `.dark`. The generator's
emitted theme will need this block too.

### Inset pane edge on a dark palette (fixed)

M6 makes the `inset-shell` content pane's fill equal its gutter, so spartan's
`shadow-sm` was the only thing separating them — and a translucent-black shadow is
invisible on `.theme-brand-x`. `inset-shell.scss` now drops that shadow and draws
a `1px solid var(--sidebar-border)` edge instead, which reads in every palette.
