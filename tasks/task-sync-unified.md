# Task list: Cross-repo sync — user-menu, theme/language services (unified, self-verifying)

Read `CLAUDE.md` first. **This task list supersedes the previous one** (`task-sync-user-menu-services.md`) — same destination mapping and conventions, but restructured so Claude Code reads and verifies real file contents directly from both repos at each step, rather than working from paths and snippets relayed through chat. Use this version.

**Prerequisite:** both `blueprint-reference` and `blueprint-platform` must be accessible in this session (both folders added, e.g. via `/add-dir` or a multi-root workspace). Confirm you can read files from both before starting Task 1 — if only one is accessible, stop and report rather than proceeding on assumptions about the other.

---

## Working method for every file touched in this task list

For each file being synced, follow this exact sequence — do not skip the "show" steps, they are what makes this task list self-verifying instead of guess-based:

1. **Read** the real current file from `blueprint-reference`.
2. **State** its destination path in `blueprint-platform` (per the mapping table in Task 1) and, if the file has imports crossing into `template-config`/`theme.service`/`language.service`, **compute** the corrected import path by comparing the source file's depth in the reference repo against its destination's depth in the generated-project structure (not the platform-template location — imports must be correct for where the file ends up *after generation*, i.e. `src/app/...`, not for where the `.ts` sits inside `files/...`).
3. **Show** the diff between original and corrected import lines before writing anything, so it's checkable — a short "before/after" for just the changed lines is enough, not a full file dump.
4. **Write** the corrected file to its platform destination.
5. **Read back** the file you just wrote and confirm it matches what was shown in step 3 — catches a mismatched edit before it's discovered three steps later during a build.

---

## Task 1 — Destination mapping (unchanged from the prior task list, confirmed correct)

| Source (blueprint-reference) | Platform template source | Generated project destination |
|---|---|---|
| `shared/ui/user-menu/` | `files/shared/ui/user-menu/` | `src/app/shared/ui/user-menu/` |
| `shared/ui/theme-switcher/` | `files/shared/ui/theme-switcher/` | `src/app/shared/ui/theme-switcher/` |
| `shared/ui/language-switcher/` | `files/shared/ui/language-switcher/` | `src/app/shared/ui/language-switcher/` |
| `shared/theme.service.ts` | `files/theme/theme.service.ts` (new top-level `files/theme/` — distinct from the existing `files/styles/`, which holds SCSS/Tailwind) | `src/app/core/theme/theme.service.ts` |
| `shared/language.service.ts` | `files/language/language.service.ts` (new top-level `files/language/`) | `src/app/core/language/language.service.ts` |
| `config/template-config.ts` | `files/config/template-config.ts.template` (already exists — update in place) | `src/app/core/config/template-config.ts` |
| `layout/sidebar-shell/`, `floating-shell/`, `inset-shell/`, `topbar-shell/` | `files/layout/<name>-shell/` (already exist — re-sync, they're stale since the reference versions changed to use `user-menu`) | `src/app/layout/<name>-shell/` |

The four `shared/ui/*`-family destinations need no new `generateFiles`/asset plumbing — already covered by the existing broad rule for `files/shared/ui`. `files/theme/` and `files/language/` are genuinely new and need new wiring (Tasks 5–6).

---

## Task 2 — Discovery pass (read-only, no writes yet)

2.1. Confirm current state of `schema.json`/`preset.ts` regarding `layout` — don't re-add what's already there.

2.2. Using the working method above, read (don't yet copy) every file listed in Task 1's left column, plus the current contents of each of the four layout shells already sitting in `blueprint-platform`'s `files/layout/`. Produce a short summary: which platform-side files are missing entirely, which exist but are stale (differ from the reference version), and which imports in each will need correction per the working method's step 2.

2.3. Report this summary before proceeding to Task 3 — this is the checkpoint where a wrong assumption gets caught before any file is actually written.

---

## Task 3 — Copy and correct, file by file

Using the working method, process each file from Task 1's mapping in this order: the two services first (they're the target of most import corrections, so having them finalized first makes checking the dependent files' corrected imports easier), then the three `shared/ui/*` components, then the four layout shells, then `template-config.ts.template`.

For `template-config.ts.template` specifically: this is a template update, not a plain copy — preserve the existing `<%= palette %>`/`<%= rtl %>`/`<%= labelPosition %>` EJS placeholders exactly as they are, and add:
```ts
showThemeSwitcher: <%= showThemeSwitcher %>,
showLanguageSwitcher: <%= showLanguageSwitcher %>,
```
to both the `BlueprintConfig` interface and `DEFAULT_BLUEPRINT_CONFIG`. Keep `labelPosition` — it's being removed from the CLI's prompts only, not the platform schema, per earlier instruction to defer that removal.

---

## Task 4 — Schema and manifest

4.1. Add to `schema.json`, alongside the existing `layout` property:
```json
"showThemeSwitcher": { "type": "boolean", "default": true },
"showLanguageSwitcher": { "type": "boolean", "default": true }
```

4.2. Add both fields to the manifest write block at the bottom of `preset.ts`.

---

## Task 5 — Update `preset.ts`

5.1. Read `showThemeSwitcher`/`showLanguageSwitcher` from options, default `true` each; pass both into the existing `files/config` `generateFiles` substitution object.

5.2. Conditional on `layout !== 'none'` (matching the CLI's existing logic — services/switchers have nowhere to be used without layout chrome): add two `generateFiles` calls, `files/theme` → `src/app/core/theme` and `files/language` → `src/app/core/language`.

5.3. Confirm the existing `shared/ui` `generateFiles` call needs no code change to pick up the three new component folders — verify with a real build in Task 7, don't assume here.

---

## Task 6 — Update `package.json` asset rules

Add:
```json
{
  "input": "./packages/foundation/src/generators/preset/files/theme",
  "glob": "**/*.ts",
  "output": "./generators/preset/files/theme"
},
{
  "input": "./packages/foundation/src/generators/preset/files/language",
  "glob": "**/*.ts",
  "output": "./generators/preset/files/language"
}
```

---

## Task 7 — Build, publish, verify (per `CLAUDE.md`'s established process)

7.1. Clean build (`rm -rf dist`, `--skip-nx-cache`), inspect `dist` directly for the new folders — don't assume the asset rules worked, `find` and look.
7.2. `npm pack --dry-run`, then publish to Verdaccio using the scoped-override syntax, tag `latest` only.
7.3. Generate at least: `--layout=sidebar-shell --showThemeSwitcher=true --showLanguageSwitcher=true`, `--layout=topbar-shell --showThemeSwitcher=false --showLanguageSwitcher=true`, and `--layout=none`.
7.4. For each non-`none` case: read the generated project's actual compiled output or run `nx serve` and check the browser console — confirm no import-resolution errors specifically (the exact class of bug this whole task list exists to prevent), and confirm clicking the theme/language switchers actually changes the `dark` class / `dir` attribute.
7.5. For the `none` case: confirm `core/theme/`, `core/language/`, and all three new `shared/ui/*` folders are completely absent.
7.6. Only after all pass, add the `stable` dist-tag.

---

## Task 8 — Update `CLAUDE.md`

Record the new `files/theme/`/`files/language/` source folders, the `core/theme/`/`core/language/` destination convention, and the two new schema options.
