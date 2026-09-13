# Task list: Nav-link injection in each module's own generator (self-contained)

**Run from `blueprint-platform`.** Read `CLAUDE.md` first. This is a complete, standalone task list — it does not depend on any other task file having been run.

## The design being implemented

Each module generator (`modules:rbac`, `modules:user-management`) should add its own navigation link into whichever app-shell layout is currently present in the generated project, at the moment it runs — unconditionally, regardless of how it was invoked (a CLI sequence, a manual `nx g` call, anything). `modules:auth` deliberately does **not** add a nav link, since its pages (login/signup/etc.) live outside the main shell entirely, not as menu destinations.

---

## Task 0 — Discovery

0.1. Read the real, current nav-item markup in all four app-shell layouts (`sidebar-shell`, `floating-shell`, `inset-shell`, `topbar-shell`) inside `packages/foundation/src/generators/preset/files/layout/` — find exactly how existing links (e.g. "Welcome") are structured in each, since new links need to match each shell's real markup style, not an assumed one.
0.2. Confirm the real folder/file naming pattern for each shell (e.g. `sidebar-shell/sidebar-shell.ts`) — needed for Task 2's shell-detection logic to check real paths, not guessed ones.
0.3. Confirm neither `modules:rbac` nor `modules:user-management` currently does anything with the shell layouts at all — read both generators' current full content to verify.

---

## Task 1 — Add a stable insertion marker to all four app-shell layouts

This doesn't exist yet and is a genuine prerequisite. In each of the four shells' nav-item list, add a marker comment immediately after the last existing nav item (e.g. after "Welcome," per Task 0.1's findings):
```html
<!-- BP:NAV_ITEMS -->
```
This is what lets any future generator find a reliable, consistent insertion point via simple string manipulation, since there's no AST tool in this project for editing Angular HTML templates the way `ts-morph` handles TypeScript.

---

## Task 2 — Two new `generator-kit` helpers

**`packages/generator-kit/src/lib/find-main-shell.ts`:**
```ts
import { Tree } from '@nx/devkit';

const APP_SHELL_NAMES = ['sidebar-shell', 'floating-shell', 'inset-shell', 'topbar-shell'];

export function findExistingMainShell(tree: Tree): { path: string; name: string } | null {
  for (const name of APP_SHELL_NAMES) {
    const path = `src/app/layout/${name}/${name}.ts`; // confirm this matches Task 0.2's real finding — adjust if the actual filename pattern differs
    if (tree.exists(path)) {
      return { path, name };
    }
  }
  return null; // layout=none, or no main shell present
}
```
Deliberately checks only these four names — a project's `auth-split`/`auth-centered` layout (if `modules:auth` was also run) must never be treated as a place for a general nav link.

**`packages/generator-kit/src/lib/append-nav-item.ts`:**
```ts
import { Tree } from '@nx/devkit';

export function appendNavItem(
  tree: Tree,
  layoutFilePath: string,
  item: { label: string; routerLink: string }
) {
  const content = tree.read(layoutFilePath, 'utf-8');
  if (!content) return;

  // Idempotency: skip if this exact link already exists, so re-running
  // a module's generator (or running it after a manual add) never
  // produces a duplicate entry.
  if (content.includes(`routerLink="${item.routerLink}"`)) return;

  const marker = '<!-- BP:NAV_ITEMS -->';
  const newItem = `<a routerLink="${item.routerLink}" class="...">${item.label}</a>\n    ${marker}`;
  // Confirm the exact class/markup style against Task 0.1's real
  // findings per shell before finalizing — the four shells may not
  // share identical nav-item markup.
  tree.write(layoutFilePath, content.replace(marker, newItem));
}
```

Export both from `generator-kit`'s `index.ts`. Build and publish a new `generator-kit` version before proceeding to Task 3.

---

## Task 3 — `modules:rbac` adds its own nav links

At the end of `rbac.ts`'s generator function, after its existing route/manifest logic:
```ts
import { findExistingMainShell, appendNavItem } from '@blueprint-platform/generator-kit';

// ...inside the generator function, after routes/manifest are wired:
const shell = findExistingMainShell(tree);
if (shell) {
  appendNavItem(tree, shell.path, { label: 'Roles', routerLink: `/${options.routePrefix}/roles` });
  appendNavItem(tree, shell.path, { label: 'Permissions', routerLink: `/${options.routePrefix}/permissions` });
}
// If shell is null (layout=none), there's nothing to inject into —
// this is not an error condition, just log an informational message
// so the developer knows why no link appeared.
```

---

## Task 4 — `modules:user-management` adds its own nav link

Same pattern, one link:
```ts
import { findExistingMainShell, appendNavItem } from '@blueprint-platform/generator-kit';

const shell = findExistingMainShell(tree);
if (shell) {
  appendNavItem(tree, shell.path, { label: 'User Management', routerLink: `/${options.routePrefix}` });
}
```

---

## Task 5 — Confirm `modules:auth` adds no nav link (verification only, no code change expected)

Read `auth.ts` and confirm it does not call `appendNavItem` or reference any shell layout at all. If it does, remove that logic — auth's pages are not menu destinations.

---

## Task 6 — A known, deliberate limitation (document, don't solve)

If a project is generated with `layout=none`, has `modules:rbac`/`modules:user-management` added (no nav link possible yet — nothing exists to inject into), and only later gets a real shell via `foundation:layout` — that new shell will **not** automatically gain the already-installed modules' nav links. Fixing this would require `foundation:layout` to know about specific modules' nav-label conventions, which is a worse coupling than not solving it. Leave this as a documented limitation, not a bug to fix now.

---

## Task 7 — Build, publish, and test

7.1. Build and publish `generator-kit` (Task 2's two new helpers), then `foundation` (Task 1's marker retrofit), then `modules` (Tasks 3–5's changes) — in that dependency order.

7.2. Generate a scratch project and run the modules as separate, sequential commands (proving this works with no composition generator involved at all):
```bash
npx create-nx-workspace@latest scratch --preset=@blueprint-platform/foundation@latest --layout=sidebar-shell --registry=<your-registry>
cd scratch
npx nx g @blueprint-platform/modules:auth --includeSignup=false --registry=<your-registry>
npx nx g @blueprint-platform/modules:rbac --registry=<your-registry>
npx nx g @blueprint-platform/modules:user-management --registry=<your-registry>
```
Confirm the sidebar shows **Welcome, Roles, Permissions, User Management** with all links resolving correctly, and that `auth`'s login/signup pages are not present in the menu.

7.3. Test `layout=none` with the same module sequence — confirm no errors, no nav links (correctly, since there's no shell to inject into), and that Task 3/4's informational log actually appears in the generation output.

7.4. Test idempotency directly: run `nx g @blueprint-platform/modules:rbac` a second time on the same project and confirm no duplicate "Roles"/"Permissions" links appear.

Only after all four checks pass, tag `stable` on `generator-kit`, `foundation`, and `modules`.

---

## Task 8 — Update `CLAUDE.md`

Record: the `BP:NAV_ITEMS` marker convention now present in all four app shells; the `findExistingMainShell`/`appendNavItem` helpers in `generator-kit` and their idempotency behavior; that nav-link injection is each module's own responsibility rather than a separate composition step; that `auth` deliberately adds no nav link; and Task 6's documented limitation.
