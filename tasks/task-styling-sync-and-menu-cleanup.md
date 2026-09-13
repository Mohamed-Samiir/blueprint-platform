# Task list: Sync styling enhancements to platform + platform-only menu cleanup

**Run from `blueprint-platform`, with `blueprint-reference` added via `/add-dir`.** Read `CLAUDE.md` first. This task list has two distinct halves: **Tasks 1–6 sync real reference-verified work** (per `STYLES_AND_UTILITIES_CHANGELOG.md`); **Tasks 7–8 are platform-only changes with no reference-app equivalent**, per explicit instruction — flagged clearly since this is a deliberate deviation from the normal reference-first discipline, not an oversight.

---

## Working method (reused)

Read → state destination → compute any import correction → show diff → write → read back and confirm.

---

## Part A — Syncing the reference-verified styling work

### Task 0 — Discovery

0.1. Read `STYLES_AND_UTILITIES_CHANGELOG.md` in full from `blueprint-reference` — this is the authoritative list of what actually changed; don't re-derive it by diffing whole files.
0.2. Confirm whether `packages/foundation/src/generators/preset/files/styles/_utilities.scss` already exists in `blueprint-platform` (it was designed but its actual creation status in the platform repo hasn't been confirmed) — if missing, this is a first-time addition, not an update.
0.3. Read the current state of all four app-shell layout files, `user-menu`, `permissions-list`, `roles-list`, `users-list`, and the welcome component (or its absence) in `blueprint-platform`, to know exactly what's stale versus genuinely new.
0.4. Confirm where the welcome component currently lives, if anywhere, in a generated project — check whether `applicationGenerator`'s default scaffold output is what's still there untouched, or whether an earlier task already introduced a custom one.

### Task 1 — `_utilities.scss`

Add (or create the file with) the `.bp-scrollbar-hidden` class exactly as recorded in the changelog. If the file is new, add its `@use` into `theme.scss`'s barrel and confirm the asset/build wiring for `files/styles/` already covers a new file in that folder (it should, per the existing broad rule, but verify with a real build rather than assume, per this project's established pattern).

### Task 2 — `styles.scss`

Sync whatever the changelog's `styles.scss` section actually lists — per the reference task list's own prediction, this section may be empty (everything achieved via Tailwind utility classes). Confirm which case actually applies before writing anything here.

### Task 3 — Re-sync the layout shells

Re-sync only the shells the changelog says were actually touched (scrollbar-hidden + overflow on the collapsed menu in `sidebar-shell`/`topbar-shell`; sticky topbar in `topbar-shell` specifically) — don't blindly re-copy all four if only some changed.

### Task 4 — Re-sync `user-menu`

The collapsed-state avatar and logo padding/sizing fixes.

### Task 5 — Re-sync the three list components

`permissions-list`, `roles-list`, `users-list` — the full-width container change and whichever large-count handling approach (pagination vs. scroll-container) the changelog recorded per component. Sync into their real current locations: `packages/modules/src/generators/rbac/files/features/rbac/...` and `packages/modules/src/generators/user-management/files/features/user-management/...`.

### Task 6 — Welcome component

Per Task 0.4's finding: either add it fresh to `foundation`'s `files/` (if nothing custom existed there before) or update what's already there. Sync the logo + three-pillar-card version. Confirm it correctly excludes `templates` (dropped as a pillar) and `generator-kit` (internal-only) — re-check this explicitly rather than trust the reference version got it right, since this is exactly the kind of stale assumption worth double-checking at the sync boundary.

---

## Part B — Platform-only changes (no reference-app equivalent, per explicit instruction)

**Note this divergence plainly:** after this part, `blueprint-platform`'s layout shells will not match `blueprint-reference`'s — the reference app still has its original placeholder menu links. This is a deliberate, instructed exception to the normal reference-first sync discipline, not an inconsistency to silently ignore. Record it in Task 9's `CLAUDE.md` update so it's a tracked decision, and consider (as a separate, later, optional task) applying the same cleanup back to `blueprint-reference` so the two don't stay permanently divergent on this point.

### Task 7 — Remove placeholder menu links

In **all four app-shell layouts** (`sidebar-shell`, `floating-shell`, `inset-shell`, `topbar-shell`) **only** — not the two auth layouts (`auth-split`/`auth-centered`), which don't have general app navigation to clean up. Remove every placeholder nav item (the "Dashboard"/"Settings"/"Reports"-style placeholders seeded when these shells were first built) from each shell's menu markup.

### Task 8 — Add the one real "Welcome" link, and confirm it actually resolves

8.1. Add a single nav item labeled "Welcome" to each of the four shells' menus, in place of what Task 7 removed.

8.2. **Before wiring the link, confirm a real route exists for it to point to.** Check `app.routes.ts`'s current skeleton (from `preset.ts`) — if there's no root/default route rendering the welcome component yet, add one now as part of this task; the link is worthless without a real destination. Don't assume the route already exists — verify directly.

8.3. Wire each shell's "Welcome" link to that real route (`routerLink` pointing at whatever path the confirmed route in 8.2 actually uses — likely `/` or `/welcome`, confirmed, not guessed).

---

## Task 9 — Build, publish, and test

9.1. Standard clean build/publish cycle for both `foundation` and `modules` (whichever pillars actually changed — `foundation` for the shells/welcome/utilities, `modules` for the RBAC/user-management list changes).

9.2. Generate at least one scratch project (any layout, with `modules:rbac` and `modules:user-management` both added) and confirm: the collapsed menu scrolls with no visible scrollbar, the topbar is sticky, avatar/logo look correct collapsed, the three lists are full-width, the welcome page shows the logo and exactly three pillar cards, and — specifically for Part B — the side menu shows **only** the Welcome link, which actually navigates to a working welcome page with no console errors.

9.3. Test with `layout=none` too, confirming nothing in Part A/B's changes assumes a shell exists where one doesn't (the welcome route/component itself should still work regardless of layout choice, even though the menu-link changes obviously don't apply when there's no shell at all).

Only after this passes, tag `stable`.

---

## Task 10 — Update `CLAUDE.md`

Record: the `.bp-scrollbar-hidden` utility, the sticky-topbar/collapsed-avatar-and-logo fixes, the full-width list convention, the large-count handling decision per RBAC/user-management component, the welcome component's three-card content, and — explicitly — the Part B divergence between `blueprint-reference` and `blueprint-platform` on the side-menu content, including a note that reference still has the old placeholder links and platform does not.
