import {
  Tree,
  generateFiles,
  joinPathFragments,
  formatFiles,
  updateJson,
} from '@nx/devkit';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { wrapRoutesUnderLayout, appendToManifest } from '@blueprint-platform/generator-kit';
import { loadUiGenerator } from '../shared/load-ui-generator';
import { patchUserMenu } from '../preset/lib/patch-user-menu';
import {
  renderLanguageRegistryModule,
  renderAvailableLanguagesModule,
} from '../shared/render-language-files';
import { LayoutGeneratorSchema } from './schema';

/** Default languages for the BASE `LanguageService` this generator ensures exists — same as the preset schema default. Only relevant when the full translate engine isn't already present. */
const DEFAULT_LANGUAGES = ['en', 'ar'];

/** `@blueprint-platform/ui/<name>` specifiers referenced by a layout shell's own source. */
function shellUiImports(tree: Tree, shellDir: string): string[] {
  const names = new Set<string>();
  for (const file of tree.children(shellDir)) {
    if (!file.endsWith('.ts')) continue;
    const src = tree.read(`${shellDir}/${file}`, 'utf-8') ?? '';
    for (const m of src.matchAll(/@blueprint-platform\/ui\/([a-z0-9-]+)/g)) {
      names.add(m[1]);
    }
  }
  return [...names];
}

/** Read the shell's real exported class name from its own copied source. */
function readShellClassName(tree: Tree, shellDir: string, name: string): string {
  const source = tree.read(`${shellDir}/${name}.ts`, 'utf-8');
  if (!source) {
    throw new Error(`layout: expected ${shellDir}/${name}.ts to exist after copying it.`);
  }
  const match = source.match(/export\s+class\s+([A-Za-z0-9_$]+)/);
  if (!match) {
    throw new Error(`layout: could not find an exported class in ${shellDir}/${name}.ts`);
  }
  return match[1];
}

/**
 * Add one layout shell (from the same `files/layout/` catalog `preset` draws
 * from) to an existing project: copies the shell, wires it into
 * `app.routes.ts`, adds the UI components it needs, and records it in the
 * manifest. This is the standalone, run-any-time counterpart to `preset`'s
 * generation-time `layout` option — `preset.ts` composes into this same
 * function rather than duplicating the logic (see its call site).
 */
export default async function (tree: Tree, options: LayoutGeneratorSchema) {
  const appRoot = '.';
  const wireRoutes = options.wireRoutes ?? true;
  const withAccountMenu = options.withAccountMenu ?? true;
  // Same catalog preset.ts draws from: dist/generators/preset/files/layout —
  // this generator's own compiled location is dist/generators/layout/layout.js,
  // so it's a sibling reached via ../preset/files/layout, not the ../../../
  // depth a `packages/foundation/src/...` guess would suggest.
  const catalogDir = joinPathFragments(__dirname, '../preset/files/layout');
  const available = readdirSync(catalogDir).filter((f) =>
    statSync(join(catalogDir, f)).isDirectory(),
  );

  if (!available.includes(options.name)) {
    throw new Error(
      `Unknown layout "${options.name}". Available: ${available.join(', ')}`,
    );
  }

  const uiGenerator = loadUiGenerator();
  const name = options.name;
  const dest = `${appRoot}/src/app/layout/${name}`;

  // The theme service backs `<app-theme-switcher>` (added below via `ui`) and is
  // only meaningful alongside a layout — same file `preset.ts` uses, added here
  // only if some earlier step (or an earlier run of this same generator) hasn't
  // already added it.
  if (!tree.exists(`${appRoot}/src/app/core/theme`)) {
    generateFiles(
      tree,
      joinPathFragments(__dirname, '../preset/files/theme'),
      `${appRoot}/src/app/core/theme`,
      {},
    );
  }

  // Every layout shell injects `LanguageService` unconditionally for its own
  // RTL/LTR side computation — same tier as `ThemeService`, so ensure at least
  // the BASE (non-translate) variant exists. If the full ngx-translate engine
  // is already here (from `preset.ts`'s `showLanguageSwitcher`), this is a
  // no-op — that variant already satisfies the same shape.
  if (!tree.exists(`${appRoot}/src/app/core/language`)) {
    generateFiles(
      tree,
      joinPathFragments(__dirname, '../preset/files/language'),
      `${appRoot}/src/app/core/language`,
      {},
    );
    tree.write(
      `${appRoot}/src/app/core/language/language-registry.ts`,
      renderLanguageRegistryModule(),
    );
    tree.write(
      `${appRoot}/src/app/core/language/available-languages.ts`,
      renderAvailableLanguagesModule(DEFAULT_LANGUAGES),
    );
    // The catalog copy also brings the translate-source file along verbatim —
    // it's only meant to be read for its content (see preset.ts), not shipped.
    tree.delete(
      `${appRoot}/src/app/core/language/language.service.translate.ts`,
    );
  }

  generateFiles(tree, joinPathFragments(catalogDir, name), dest, {});

  // Determine the real exported class name from the copied component file
  // rather than assuming a naming convention.
  const className = readShellClassName(tree, dest, name);

  // The account-menu family, plus whatever UI pieces the shell itself imports
  // (`sidebar`, `dropdown-menu`, `collapsible`, …) — added via the same `ui`
  // generator `preset.ts` uses, so their in-kit deps + npm deps + tsconfig paths
  // are resolved identically and anything already present is skipped.
  // `language-switcher` is only included when the full ngx-translate engine is
  // present (`src/assets/i18n` — NOT just `core/language/`, which now also
  // exists for the BASE, non-translate variant this generator just ensured
  // above) — this generator has no `showLanguageSwitcher` option of its own; it
  // reflects whatever `preset.ts` already decided for this project.
  // `withAccountMenu: false` (e.g. `modules:auth`'s auth-split/auth-centered —
  // there is no signed-in user yet on those pages) skips this whole family.
  const hasTranslateEngine = tree.exists(`${appRoot}/src/assets/i18n`);
  const uiExtras = withAccountMenu
    ? ['user-menu', 'theme-switcher', ...(hasTranslateEngine ? ['language-switcher'] : [])]
    : [];
  await uiGenerator(tree, {
    components: [...shellUiImports(tree, dest), ...uiExtras].join(','),
    skipFormat: true,
    skipInstall: true,
  });

  // `user-menu.ts` imports `theme-switcher`/`language-switcher` via a *relative*
  // sibling path, not the `@blueprint-platform/ui/*` alias — so `ui`'s own
  // dependency-closure resolver treats `language-switcher` as a hard dependency
  // of `user-menu` and copies it regardless of `uiExtras` above, even though
  // `showLanguageSwitcher` said not to. (It would actually compile fine against
  // the BASE `LanguageService` — the switcher only touches its public
  // available/current/setLanguage shape, not ngx-translate directly — but the
  // developer explicitly opted out of the switcher UI, so honor that.) Strip
  // `user-menu`'s wiring to it, delete the file, and un-record it. N/A when
  // `withAccountMenu` is false — `user-menu` was never added in the first place.
  if (withAccountMenu && !hasTranslateEngine) {
    patchUserMenu(tree, appRoot);
    const switcherDir = `${appRoot}/src/app/shared/ui/language-switcher`;
    if (tree.exists(switcherDir)) {
      tree.delete(switcherDir);
      const manifestPath = `${appRoot}/.blueprint/manifest.json`;
      if (tree.exists(manifestPath)) {
        updateJson(tree, manifestPath, (json) => {
          json.components = (json.components ?? []).filter(
            (c: string) => c !== 'language-switcher',
          );
          return json;
        });
      }
    }
  }

  // Sweep the project's existing top-level routes under this shell and wire the
  // welcome/starter screen (preset.ts always generates one, regardless of
  // layout) as its index route, so `/` shows something instead of a blank
  // `<router-outlet>`. Skipped when `wireRoutes` is false — a content-only shell
  // (e.g. an auth shell) must never become the app's root wrapper; its own
  // caller wires its routes separately (see `addLayoutBranch`).
  if (wireRoutes) {
    const welcomePath = `${appRoot}/src/app/welcome.ts`;
    wrapRoutesUnderLayout(tree, appRoot, {
      layoutImportPath: `./layout/${name}/${name}`,
      layoutClassName: className,
      indexRoute: tree.exists(welcomePath)
        ? { importPath: './welcome', className: 'Welcome' }
        : undefined,
    });
  }

  appendToManifest(tree, appRoot, 'layouts', name);

  await formatFiles(tree);
}
