# Task list: ngx-translate v18, generalized multi-language support

Read `CLAUDE.md` first. This replaces the direction-only `LanguageService` built earlier with a real translation engine, generalized beyond Arabic/English to any configured set of languages, with direction always derived from a per-language registry — never a hardcoded "is it Arabic" check.

## Key design decision — gating is split, not all-or-nothing

- **The translation engine itself** (`LanguageService`, the language registry, `ngx-translate` dependencies, i18n JSON assets, `app.config.ts` provider wiring) is gated on **`showLanguageSwitcher` alone**, independent of `layout`. A `layout: none` project can still request `showLanguageSwitcher: true` and get full translation infrastructure with no pre-built switcher UI, for a developer building their own shell.
- **The pre-built `language-switcher` dropdown component** stays gated on **both** `showLanguageSwitcher` and `layout !== 'none'`, since it needs a place to live (inside `user-menu`, inside layout chrome) — same as before.

Confirm this distinction is actually implemented as two separate conditions in `preset.ts`, not one combined check copied from the theme-switcher's existing gating.

---

## Task 0 — Discovery

0.1. Read the **existing** `language.service.ts` and `language-switcher.ts` already sitting in `blueprint-reference` (the simpler, direction-only versions built earlier) purely for informational context on current shape/conventions — **do not treat this task as requiring new reference-app work**. Per explicit instruction, translation content (`en.json`/`ar.json`, the ngx-translate wiring, the generalized registry-driven service) is authored **directly in `blueprint-platform`** this round, with no parallel `blueprint-reference` build-and-sync step. The existing reference-app files stay untouched.
0.2. Confirm exactly how `showLanguageSwitcher` is currently gated in `preset.ts` (should currently be combined with `layout !== 'none'`) — this needs to split per the design decision above.

---

## Task 1 — Language registry (new file)

`core/language/language-registry.ts` — a static map of known language codes to their metadata. This is what makes direction "follow the language" automatically for any future language, not just Arabic:

```ts
export interface LanguageDefinition {
  code: string;
  label: string;
  dir: 'ltr' | 'rtl';
}

// Extend this list as needed — anything not RTL defaults to 'ltr'.
export const LANGUAGE_REGISTRY: Record<string, LanguageDefinition> = {
  en: { code: 'en', label: 'English', dir: 'ltr' },
  ar: { code: 'ar', label: 'العربية', dir: 'rtl' },
  fr: { code: 'fr', label: 'Français', dir: 'ltr' },
  es: { code: 'es', label: 'Español', dir: 'ltr' },
  de: { code: 'de', label: 'Deutsch', dir: 'ltr' },
  he: { code: 'he', label: 'עברית', dir: 'rtl' },
  fa: { code: 'fa', label: 'فارسی', dir: 'rtl' },
  ur: { code: 'ur', label: 'اردو', dir: 'rtl' },
  // add more as needed — this registry, not per-language conditionals
  // elsewhere in the code, is the single source of truth for direction.
};
```

---

## Task 2 — New schema option: `languages`

```json
"languages": {
  "type": "array",
  "items": { "type": "string" },
  "default": ["en", "ar"]
}
```

**Explicit acceptance check — don't just trust the JSON Schema default silently applies:** when `showLanguageSwitcher` is `true` and `--languages` is omitted entirely from generation, confirm `options.languages` genuinely resolves to `['en', 'ar']` inside `preset.ts` at runtime (log/inspect it during testing, don't just assume the schema default always propagates correctly — this project has hit more than one case of an assumed default not behaving as expected). Add this as an explicit case in Task 9's test matrix, not just an assumption baked into the schema file.

In `preset.ts`, validate every requested code exists in `LANGUAGE_REGISTRY` (import it at generator-build time, not generation-time, since it's part of the generator's own source) — **fail with a clear error** listing valid codes if an unknown one is requested, rather than silently generating a broken/undirected language:
```ts
const unknown = options.languages.filter((l) => !(l in LANGUAGE_REGISTRY));
if (unknown.length) {
  throw new Error(`Unknown language code(s): ${unknown.join(', ')}. Valid: ${Object.keys(LANGUAGE_REGISTRY).join(', ')}`);
}
```

---

## Task 3 — Rewrite `LanguageService`, generalized for N languages

```ts
// core/language/language.service.ts
import { Injectable, signal, effect, inject, DOCUMENT } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LANGUAGE_REGISTRY, LanguageDefinition } from './language-registry';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private document = inject(DOCUMENT);
  private translate = inject(TranslateService);

  readonly available: LanguageDefinition[]; // populated from options.languages at generation time — see Task 5
  private currentCode = signal<string>('en'); // default substituted at generation time

  readonly current = this.currentCode.asReadonly();

  constructor() {
    effect(() => {
      const def = LANGUAGE_REGISTRY[this.currentCode()];
      this.document.documentElement.dir = def.dir;
      this.document.documentElement.lang = def.code;
      this.translate.use(def.code);
    });
  }

  setLanguage(code: string) {
    if (!(code in LANGUAGE_REGISTRY)) return;
    this.currentCode.set(code);
    localStorage.setItem('bp-language', code); // persistence — confirm this matches whatever the original service already did in Task 0.1, don't silently change existing behavior without checking
  }
}
```

Note: **direction is looked up from the registry every time**, never an `if (code === 'ar')` check anywhere in this file or elsewhere — this is the actual mechanism satisfying "direction should follow the language needs" for any future language added to the registry.

`available` needs to be populated from the generation-time `languages` option, not hardcoded — confirm the cleanest way to inject this (a generation-time substituted array literal in a `.template` file, versus a separate generated `available-languages.ts` constant file) and pick one, documenting the choice.

---

## Task 4 — Rewrite `language-switcher` as a dropdown, not a binary toggle

Since this is now N languages, not a two-way toggle, it needs to render a list — use spartan's dropdown-menu primitive (same one `user-menu` already uses, for consistency):

```html
<hlm-dropdown-menu>
  <button hlmBtn variant="ghost" [hlmDropdownMenuTrigger]="menu">
    {{ currentLabel() }}
  </button>
  <ng-template #menu>
    <hlm-dropdown-menu-content>
      @for (lang of languageService.available; track lang.code) {
        <button hlmDropdownMenuItem (click)="languageService.setLanguage(lang.code)">
          {{ lang.label }}
        </button>
      }
    </hlm-dropdown-menu-content>
  </ng-template>
</hlm-dropdown-menu>
```
Adjust to match whatever the real spartan dropdown API looks like in this project's actual generated components (check `user-menu.ts`'s real markup rather than assuming this sketch is exact).

---

## Task 5 — i18n JSON asset scaffolding (dynamic, per selected language)

Unlike every prior `generateFiles` call in this project (static folder-to-folder), this one is **dynamic** — the file set depends on `options.languages` at runtime, so it needs a loop, not a single `generateFiles` call:

```ts
for (const code of options.languages) {
  const sourceContent = (code === 'en' || code === 'ar')
    ? tree.read(joinPathFragments(__dirname, `files/i18n/${code}.json`), 'utf-8') // authored directly as generator source — no blueprint-reference sync for this piece, per explicit scope decision
    : tree.read(joinPathFragments(__dirname, 'files/i18n/en.json'), 'utf-8'); // placeholder: English fallback content for any language without real translations yet

  tree.write(`${appRoot}/src/assets/i18n/${code}.json`, sourceContent);
}
```
Only `en.json` and `ar.json` need to exist as real files in the generator's own `files/i18n/` — write their actual translated content directly there (covering whatever strings the existing `shared/ui` components — `user-menu`, `theme-switcher`, `language-switcher` itself, etc. — actually need). Anything else requested gets English content as a starting placeholder. Add a top-of-file comment in any placeholder-sourced language file noting it needs real translation.

---

## Task 6 — Dependencies (conditional on `showLanguageSwitcher` only)

```ts
if (options.showLanguageSwitcher) {
  json.dependencies['@ngx-translate/core'] = '^18.0.0';
  json.dependencies['@ngx-translate/http-loader'] = '^18.0.0';
}
```

---

## Task 7 — `app.config.ts` wiring (new `lib/patch-translate.ts`, conditional)

```ts
import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

export function patchTranslateProviders(tree: Tree, appRoot: string) {
  const path = `${appRoot}/src/app/app.config.ts`;
  const source = tree.read(path, 'utf-8');
  if (!source) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  file.addImportDeclaration({ namedImports: ['provideTranslateService'], moduleSpecifier: '@ngx-translate/core' });
  file.addImportDeclaration({ namedImports: ['provideTranslateHttpLoader'], moduleSpecifier: '@ngx-translate/http-loader' });
  // confirm exact v18 provider/loader function names and import paths
  // against real installed package types before finalizing — v18 is
  // recent enough that assumed names here may not be exact.

  const arrayLiteral = file
    .getVariableDeclarationOrThrow('appConfig')
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  arrayLiteral.addElement(`provideTranslateService({ loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }) })`);
  // exact call shape needs verifying against v18's real API — don't
  // assume this matches v17-era HttpLoaderFactory patterns found in
  // older tutorials, per the earlier discussion about stale v17 docs.

  tree.write(path, file.getFullText());
}
```
Call this from `preset.ts` only inside the `if (options.showLanguageSwitcher)` branch — `provideHttpClient()` should already exist from the earlier Orval work, so no duplicate registration needed, just confirm it's actually present before assuming.

---

## Task 8 — Manifest

Add `languages: options.languages` to the manifest write block.

---

## Task 9 — Build, publish, and end-to-end test

9.1. Standard clean build/publish cycle per `CLAUDE.md`.

9.2. Test **at least these combinations**:
```bash
--layout=none --showLanguageSwitcher=true --languages=en,ar,fr
--layout=sidebar-shell --showLanguageSwitcher=true --languages=en,ar
--layout=sidebar-shell --showLanguageSwitcher=true          # languages omitted entirely — confirm default
--layout=sidebar-shell --showLanguageSwitcher=false
```

For the **omitted-`languages`** case specifically: confirm `assets/i18n/` contains exactly `en.json` and `ar.json`, nothing else, and `.blueprint/manifest.json` records `languages: ['en', 'ar']` — this is the concrete proof the schema default actually applies, not just an assumption.

For the first: confirm `core/language/`, i18n assets for all three languages, and `ngx-translate` dependencies exist, but **no** `shared/ui/language-switcher/` component (since `layout: none`) — this is the split-gating design from the top of this document, verify it holds.

For the second: confirm the switcher dropdown lists all languages from the registry that were requested, selecting `fr`-equivalent-style entries correctly flips `dir` per the registry (test with `ar` specifically — confirm `dir="rtl"` applied) and non-`ar` selections correctly revert to `dir="ltr"`.

For the third: confirm **none** of this task's additions exist at all.

9.3. Specifically test a language beyond `en`/`ar` (e.g. `fr`) and confirm its JSON file contains the English-placeholder content with the "needs translation" comment, not an empty or broken file.

Only after all pass, add the `stable` dist-tag.

---

## Task 10 — Update `CLAUDE.md`

Record the language-registry pattern, the split gating rule (engine vs. switcher UI), the placeholder-language convention, and confirm the real `@ngx-translate/core` v18 API names used in Task 7 (correcting the sketch above once verified against the real package).
