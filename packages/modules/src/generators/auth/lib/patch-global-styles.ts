import { Tree } from '@nx/devkit';

/**
 * Two global rules discovered while syncing the auth module from
 * `blueprint-reference` (its `styles.scss`) that aren't auth-specific but
 * weren't yet carried into `foundation`'s token/utility layer — both matter a
 * lot here because the auth forms are the heaviest `hlm-input-group` /
 * `hlmInput` users in the generated project so far.
 *
 * 1. Kill the inner control's own focus/invalid ring inside `hlm-input-group`
 *    (the wrapping group already renders one; without this an invalid password
 *    field shows a square ring nested inside the group's rounded one).
 * 2. Neutralize the browser's autofill repaint on `[data-slot='input']` /
 *    `[data-slot='input-group-control']` so an autofilled field stays visually
 *    identical to an empty one, in both palettes.
 *
 * Appended to `src/styles/_utilities.scss` — the same hand-authored global
 * class registry `theme.scss` already `@use`s — idempotent (a no-op if already
 * present, e.g. a second `modules:auth` run or a future foundation release that
 * folds this in directly).
 */
const AUTH_GLOBAL_STYLES = `
/*
 * spartan \`hlm-input-group\` — kill the inner control's own ring.
 *
 * The wrapping \`hlm-input-group\` is what renders the focus / invalid ring
 * (\`has-[…]:ring-3\`, rounded to match the group). The inner control
 * (\`hlmInputGroupInput\`) carries \`ring-0\` / \`focus-visible:ring-0\` /
 * \`data-[matches-spartan-invalid=true]:ring-0\` to suppress its own — but those
 * lose to the \`HlmInput\` host directive's \`ring-3\` on Tailwind source order,
 * so an invalid password field shows a square (\`rounded-none\`) ring inside the
 * group's rounded one. Force the inner ring off; \`hlm-input-group\` still rings.
 */
[data-slot='input-group'] [data-slot='input-group-control'] {
  --tw-ring-shadow: 0 0 #0000 !important;
}

/*
 * Browser autofill (Chrome / Safari). The UA paints its own opaque background
 * and forces a near-black text colour on autofilled inputs via a rule that a
 * normal \`background\` can't beat — it ignores the field's \`bg-transparent\` /
 * \`dark:bg-input/30\` and its \`border-radius\`, and inside \`hlm-input-group\` the
 * \`rounded-none\` inner input then shows square corners against the rounded group.
 *
 * Keep an autofilled field pixel-identical to an empty one: the ~forever
 * \`background-color\` transition parks the UA fill animation so its background
 * never actually paints (the field's real, themed background shows through),
 * while \`-webkit-text-fill-color\` / \`caret-color\` restore the theme text colour
 * (otherwise autofilled text is invisible in dark mode).
 */
[data-slot='input']:-webkit-autofill,
[data-slot='input']:-webkit-autofill:hover,
[data-slot='input']:-webkit-autofill:focus,
[data-slot='input']:-webkit-autofill:active,
[data-slot='input-group-control']:-webkit-autofill,
[data-slot='input-group-control']:-webkit-autofill:hover,
[data-slot='input-group-control']:-webkit-autofill:focus,
[data-slot='input-group-control']:-webkit-autofill:active {
  -webkit-text-fill-color: var(--foreground);
  caret-color: var(--foreground);
  transition:
    background-color 600000s 0s,
    color 600000s 0s;
}
`;

export function patchGlobalStyles(tree: Tree, appRoot: string): void {
  const path = `${appRoot}/src/styles/_utilities.scss`;
  const current = tree.read(path, 'utf-8');
  if (current === null) return;
  if (current.includes("[data-slot='input-group'] [data-slot='input-group-control']")) return;
  tree.write(path, current + AUTH_GLOBAL_STYLES);
}
