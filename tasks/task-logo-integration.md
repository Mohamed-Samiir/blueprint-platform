# Task list: Integrate logo + favicon into foundation

Read `CLAUDE.md` first. **Explicitly excludes the usual build/publish/generate-scratch-project/click-through verification cycle** — this task list stops at "correctly wired and visually placed," not "proven end to end via a real published package." Add that as a separate, later task list when ready.

## The one technical risk to get right before anything else

`generateFiles` treats file content as an EJS template — safe for `.ts`/`.scss`/`.json`, risky for binary image bytes (a template-parse attempt on arbitrary binary data can corrupt it, or at minimum re-encode it incorrectly if read/written as text instead of a raw buffer). **These two files must be copied via direct `Buffer` read/write in `preset.ts` code, never through a `generateFiles` call.**

---

## Task 0 — Discovery

0.1. Confirm the exact current header/brand area markup in each of the six layouts already synced (`sidebar-shell`, `floating-shell`, `inset-shell`, `topbar-shell`, `auth-split`, `auth-centered`) — read the real files in both `blueprint-reference` and `blueprint-platform`, don't assume a consistent header slot exists in all six just because it exists in some.
0.2. Confirm whether `blueprint-reference` currently has any placeholder logo/branding element already, to avoid ending up with two competing brand marks in one layout.

---

## Task 1 — Place the source files

```
packages/foundation/src/generators/preset/assets/favicon.ico
packages/foundation/src/generators/preset/assets/branding/logo.png
```

---

## Task 2 — Copy logic in `preset.ts` (Buffer-based, unconditional)

```ts
import { readFileSync } from 'fs';

// unconditional — branding is foundation-level, not gated behind layout
// or any other option, unlike the theme/language switcher pieces
const assetsDir = joinPathFragments(__dirname, 'assets');
tree.write(`${appRoot}/public/favicon.ico`, readFileSync(joinPathFragments(assetsDir, 'favicon.ico')));
tree.write(`${appRoot}/public/branding/logo.png`, readFileSync(joinPathFragments(assetsDir, 'branding/logo.png')));
```
Confirm `tree.write` correctly accepts a `Buffer` (it should — the `Tree` API is not string-only) rather than assuming and finding out only once the file is inspected later.

---

## Task 3 — Asset glob rules for the build

Add explicit rules for these binary extensions in `package.json`'s `nx.targets.build.options.assets` — given this project's history of glob rules silently not matching, don't assume the existing `files/**` rules cover a differently-named `assets/` folder:
```json
{
  "input": "./packages/foundation/src/generators/preset/assets",
  "glob": "**/*.{ico,png}",
  "output": "./generators/preset/assets"
}
```
Verify with a real build (`nx build foundation`, inspect `dist` directly) that both files land in `dist` as real binary files, not corrupted or zero-byte — open the built PNG/ICO from `dist` and confirm it's actually a valid image before moving on, not just that a file with the right name exists.

---

## Task 4 — Add the logo to each layout, in `blueprint-reference` first

This is a real visual placement decision (size, spacing, alignment in each layout's specific header shape), not a config-only change — do it in `blueprint-reference` first and look at it, per this project's normal discipline for anything with a visual outcome. This is a lighter check than a full sync-ready pass (no need for a `SYNC_LOG.md` entry or RTL/palette matrix here — just "does it look right and not obviously broken"), not the full verification cycle this task list is otherwise skipping.

For each of the six layouts, add to the header/brand slot:
```html
<img src="branding/logo.png" alt="Blueprint" class="h-8 w-auto" />
```
(Tailwind sizing class — adjust per layout if the header area's height differs; confirm against Task 0.1's real findings rather than assuming one size fits all six.)

For `auth-split`/`auth-centered` specifically: the logo likely belongs above the form card, not in a sidebar-style header slot — place it appropriately for each layout's actual composition rather than copy-pasting the app-shell placement blind.

---

## Task 5 — Sync the updated layout files into `blueprint-platform`

Re-sync all six layout files (now containing the `<img>` tag) into `packages/foundation/src/generators/preset/files/layout/*/`, following the same working method as prior syncs (read real content, compute any import-path correction, show diff, write, read back and confirm) — the `src` attribute path (`branding/logo.png`) needs no translation between the two repos since both use the same `public/`-relative convention.

---

## Task 6 — Confirm `index.html`'s favicon reference

Check the generated project's `index.html` (from the base Angular scaffold) already has `<link rel="icon" href="favicon.ico">` pointing at the right relative location given the `public/` folder convention — if Angular's default scaffold already handles this correctly (likely, since `favicon.ico` at `public/favicon.ico` is exactly where Angular's own default scaffold puts its placeholder favicon), no code change is needed here, just confirmation.

---

## Task 7 — Update `CLAUDE.md`

Record: the `assets/` (not `files/`) source folder convention for binary files and why (EJS-templating risk), the Buffer-based copy mechanism in `preset.ts`, and that branding is unconditional across every layout.

---

## Explicitly out of scope for this task list

No build/publish to Verdaccio, no dist-tag changes, no generating a real scratch project to click through and confirm the logo renders correctly in a live served app. Add that as a follow-up task list before promoting any version to `stable`.
