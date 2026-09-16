import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  installPackagesTask,
  updateJson,
} from '@nx/devkit';
import { applicationGenerator } from '@nx/angular/generators';
import { patchAppConfig } from './lib/patch-app-config';
import { patchAppComponent } from './lib/patch-app-component';
import { patchProjectEnvironments } from './lib/patch-project-environments';
import { patchTranslateProviders } from './lib/patch-translate';
import { LANGUAGE_REGISTRY } from './lib/language-registry';
import { PresetGeneratorSchema } from './schema';
import layoutGenerator from '../layout/layout';
import { loadUiGenerator } from '../shared/load-ui-generator';
import {
  renderLanguageRegistryModule,
  renderAvailableLanguagesModule,
} from '../shared/render-language-files';
// import * as compatibility from '../../../compatibility.json';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The starter UI kit `preset` ships: `utils`, every form control, and the
 * overlay ("popup") family. Transitive in-kit deps (`calendar`, `separator`, …)
 * are pulled in automatically by the `ui` generator. Everything else is added
 * on demand later via `nx g @blueprint-platform/components:ui <name>`.
 */
const STARTER_UI = [
  'utils',
  // used unconditionally by files/welcome/welcome.html's three pillar cards
  'card',
  // form controls
  'button',
  'checkbox',
  'input',
  'input-group',
  'input-otp',
  'label',
  'field',
  'native-select',
  'radio-group',
  'select',
  'slider',
  'switch',
  'textarea',
  'toggle',
  'toggle-group',
  'combobox',
  'autocomplete',
  'date-picker',
  // overlay / popup family
  'popover',
  'dialog',
  'sheet',
  'drawer',
  'tooltip',
  'hover-card',
  'dropdown-menu',
  'context-menu',
  'alert-dialog',
];

/**
 * `environment.apiUrl` and the proxy target must be an **origin only** (no path).
 * Orval-generated service methods already carry their own `/api/...` prefix, so a
 * path suffix here would double it. Strip anything past the origin; leave `''`.
 */
function toOrigin(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}

export default async function (tree: Tree, options: PresetGeneratorSchema) {
  const appRoot = '.';
  const palette = options.palette ?? 'default';
  const rtl = options.rtl ?? false;
  const layout = options.layout ?? 'none';
  const showThemeSwitcher = options.showThemeSwitcher ?? true;
  const showLanguageSwitcher = options.showLanguageSwitcher ?? true;
  // `?? ['en', 'ar']` belt-and-braces: don't rely on the JSON Schema array
  // default silently propagating (this project has been bitten by that before).
  const languages = options.languages ?? ['en', 'ar'];
  const unknownLanguages = languages.filter((l) => !(l in LANGUAGE_REGISTRY));
  if (unknownLanguages.length) {
    throw new Error(
      `Unknown language code(s): ${unknownLanguages.join(', ')}. ` +
        `Valid: ${Object.keys(LANGUAGE_REGISTRY).join(', ')}`,
    );
  }
  const defaultLanguage = languages[0] ?? 'en';

  // Split gating, three tiers (see task-ngx-translate.md + the layout-shells
  // follow-up): the BASE `LanguageService` (direction tracking, no ngx-translate)
  // exists whenever there's a layout OR `showLanguageSwitcher` — layout shells
  // inject it unconditionally for RTL/LTR, same tier as `ThemeService`. The
  // ngx-translate ENGINE (deps, i18n assets, provider, the translate-augmented
  // service variant) follows `showLanguageSwitcher` alone. The pre-built
  // `language-switcher` UI needs the full engine + a layout — the `layout`
  // generator (called below) reflects that itself, checking `src/assets/i18n`.
  const translationEngine = showLanguageSwitcher;
  const hasLanguageService = layout !== 'none' || showLanguageSwitcher;

  const apiUrl = toOrigin(options.apiUrl ?? '');
  const appVersion = options.appVersion ?? '0.1.0';
  const compatibility = JSON.parse(
    readFileSync(join(__dirname, '../../../compatibility.json'), 'utf-8'),
  );
  const uiGenerator = loadUiGenerator();

  await applicationGenerator(tree, {
    name: options.name,
    directory: '.',
    rootProject: true,
    style: 'scss',
    // standalone: true,
    routing: false,
  });

  // Branding: favicon + logo — unconditional, not gated behind `layout` or any
  // other option (unlike the theme/language switcher pieces). Read + written as
  // raw `Buffer`s, never through `generateFiles` — `generateFiles` treats file
  // content as an EJS template, and running that parse over arbitrary binary
  // image bytes risks corrupting or mis-re-encoding them. `assets/` (not
  // `files/`) is a deliberately different source folder name from every other
  // `files/**` payload tree in this generator, so it's never accidentally swept
  // up by a `files/**` glob rule. `applicationGenerator` above already scaffolds
  // a placeholder `public/favicon.ico` and an `index.html` `<link rel="icon">`
  // pointing at it — this overwrites that placeholder with the real one rather
  // than adding a second favicon reference.
  const assetsDir = joinPathFragments(__dirname, 'assets');
  tree.write(
    `${appRoot}/public/favicon.ico`,
    readFileSync(joinPathFragments(assetsDir, 'favicon.ico')),
  );
  tree.write(
    `${appRoot}/public/branding/logo.png`,
    readFileSync(joinPathFragments(assetsDir, 'branding/logo.png')),
  );

  updateJson(tree, 'package.json', (json) => {
    json.dependencies ??= {};
    json.devDependencies ??= {};
    // Base runtime deps every generated project needs regardless of which UI
    // components ship. The spartan / cva / clsx / ng-icons / embla / scrollbar
    // deps are added by the `ui` generator for exactly the components it copies.
    json.dependencies['@angular/cdk'] = '^22.0.0';
    // `files/welcome/welcome.html`'s three pillar cards use lucide icons
    // directly — welcome.ts isn't part of the `ui` generator's own catalog
    // scan (npm-deps.ts only scans copied UI-kit components), so this one
    // stays an explicit base dep rather than relying on it arriving
    // incidentally via whichever STARTER_UI components happen to use icons.
    json.dependencies['@ng-icons/core'] = '^32.0.0';
    json.dependencies['@ng-icons/lucide'] = '^32.0.0';
    json.devDependencies['tailwindcss'] = '^4.0.0';
    json.devDependencies['@tailwindcss/postcss'] = '^4.0.0';
    json.devDependencies['postcss'] = '^8.4.0';
    // The `ui` generator lives here — kept as a devDependency so the project can
    // add more components later (`nx g @blueprint-platform/components:ui <name>`).
    json.devDependencies['@blueprint-platform/components'] =
      compatibility.components;
    // The `modules` pillar's on-demand generators (e.g. `modules:auth`) live
    // here — kept as a devDependency so the project can add one later
    // (`nx g @blueprint-platform/modules:auth`), same as `components` above.
    json.devDependencies['@blueprint-platform/modules'] = compatibility.modules;
    // The `blueprint` command (`npx blueprint add layout|component|module`) —
    // kept as a devDependency, same reasoning as `components`/`modules` above.
    // `@blueprint-platform/cli-core` (the library `cli` itself depends on) is
    // deliberately NEVER pinned here — same category as `generator-kit`, a
    // generator/CLI-authoring dependency, not something a generated project
    // ever needs directly.
    json.devDependencies['@blueprint-platform/cli'] = compatibility.cli;

    // Orval — OpenAPI → typed Angular API client (`npm run generate:api`).
    json.devDependencies['orval'] = '^8.28.1';

    // Per-environment build/serve + API client generation.
    json.scripts = {
      ...(json.scripts ?? {}),
      'build:dev': 'nx build --configuration=dev',
      'build:test': 'nx build --configuration=test',
      'build:stg': 'nx build --configuration=stg',
      'build:prd': 'nx build --configuration=prd',
      'serve:dev': 'nx serve --configuration=dev',
      'serve:test': 'nx serve --configuration=test',
      'serve:stg': 'nx serve --configuration=stg',
      'serve:prd': 'nx serve --configuration=prd',
      'generate:api': 'orval',
    };
    return json;
  });

  tree.write(
    `${appRoot}/.postcssrc.json`,
    JSON.stringify({ plugins: { '@tailwindcss/postcss': {} } }, null, 2),
  );

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/styles'),
    `${appRoot}/src/styles`,
    { palette },
  );
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/config'),
    `${appRoot}/src/app/core/config`,
    { rtl, palette, showThemeSwitcher, showLanguageSwitcher },
  );

  // Environments (+ the `API_URL` token) — unconditional; API access is not a
  // layout concern. Only `environment.ts` gets a generation-time value; the
  // dev/test/stg/prd files ship with `apiUrl: ''` for the developer to fill in.
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/environments'),
    `${appRoot}/src/environments`,
    { apiUrl, appVersion },
  );
  // Functional HTTP interceptor that prefixes `API_URL` onto root-relative calls.
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/core-api'),
    `${appRoot}/src/app/core`,
    {},
  );
  // Root-level `orval.config.ts` + `proxy.config.json`.
  generateFiles(tree, joinPathFragments(__dirname, 'files/root'), appRoot, {
    apiUrl,
  });

  // Starter UI kit — delegated to the components pillar's `ui` generator, which
  // copies each component + its in-kit deps, writes the `@blueprint-platform/ui/*`
  // tsconfig paths, and adds the npm deps that set needs.
  await uiGenerator(tree, {
    components: STARTER_UI.join(','),
    skipFormat: true,
    skipInstall: true,
  });

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/app'),
    `${appRoot}/src/app`,
    {},
  );

  // Starter screen — rendered directly by `app.ts` for `layout: 'none'`, or as
  // the shell's index route for a layout (see `patchAppComponent` / the
  // `layout` generator's `wrapRoutesUnderLayout` call below).
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/welcome'),
    `${appRoot}/src/app`,
    { name: options.name },
  );

  for (const dir of ['shared/components', 'features', 'layout', 'global']) {
    tree.write(`${appRoot}/src/app/${dir}/.gitkeep`, '');
  }

  patchAppConfig(tree, appRoot, {
    palette,
    rtl,
    hasLanguageService,
  });
  patchProjectEnvironments(tree, appRoot);

  // --- Translation engine — gated on `showLanguageSwitcher` alone, NOT layout.
  // A `layout: none` project can still opt in and get the full infrastructure
  // (service, registry, i18n assets, providers) with no pre-built switcher UI.
  // (If `showLanguageSwitcher` is false but a layout IS selected, the `layout`
  // generator called below still ensures the BASE — non-translate —
  // `LanguageService` exists, since the shell needs it regardless.)
  if (translationEngine) {
    // `files/language/language.service.ts` is the BASE (direction-only) variant
    // — copy it, then immediately upgrade it to the translate-augmented variant.
    generateFiles(
      tree,
      joinPathFragments(__dirname, 'files/language'),
      `${appRoot}/src/app/core/language`,
      {},
    );
    tree.write(
      `${appRoot}/src/app/core/language/language-registry.ts`,
      renderLanguageRegistryModule(),
    );
    tree.write(
      `${appRoot}/src/app/core/language/available-languages.ts`,
      renderAvailableLanguagesModule(languages),
    );
    tree.write(
      `${appRoot}/src/app/core/language/language.service.ts`,
      readFileSync(
        join(__dirname, 'files/language/language.service.translate.ts'),
        'utf-8',
      ),
    );
    // The `generateFiles` copy above also brought the translate-source file
    // itself along verbatim (it lives beside the base one in files/language/)
    // — it's not meant to ship under its own name, only its content.
    tree.delete(
      `${appRoot}/src/app/core/language/language.service.translate.ts`,
    );

    // Dynamic per-language JSON: real content for en/ar, English placeholder
    // (with a `_note` key) for anything else.
    const enJson = readFileSync(
      join(__dirname, 'files/i18n/en.json'),
      'utf-8',
    );
    const arJson = readFileSync(
      join(__dirname, 'files/i18n/ar.json'),
      'utf-8',
    );
    for (const code of languages) {
      let content: string;
      if (code === 'en') content = enJson;
      else if (code === 'ar') content = arJson;
      else
        content =
          JSON.stringify(
            {
              _note: `AUTO-GENERATED PLACEHOLDER — English content copied as a starting point. Replace with real ${LANGUAGE_REGISTRY[code].label} (${code}) translations.`,
              ...JSON.parse(enJson),
            },
            null,
            2,
          ) + '\n';
      tree.write(`${appRoot}/src/assets/i18n/${code}.json`, content);
    }

    updateJson(tree, 'package.json', (json) => {
      json.dependencies['@ngx-translate/core'] = '^18.0.0';
      json.dependencies['@ngx-translate/http-loader'] = '^18.0.0';
      return json;
    });

    patchTranslateProviders(tree, appRoot, { defaultLanguage });
  }

  // Everything a layout needs — the shell files, its theme service, its own
  // UI deps + the account-menu family, wiring app.routes.ts, recording it in
  // the manifest — lives in the standalone `layout` generator now (also runnable
  // any time later via `nx g @blueprint-platform/foundation:layout --name=…`).
  // `preset.ts` composes into it rather than duplicating the logic: one
  // implementation, two entry points.
  if (layout !== 'none') {
    await layoutGenerator(tree, { name: layout });
  }

  // Swap the Nx starter component for `<app-welcome />` (layout none) or
  // `<router-outlet />` (layout selected) in `app.ts` / `app.html`.
  patchAppComponent(tree, appRoot, { layout });

  const installedUiComponents = tree
    .children(`${appRoot}/src/app/shared/ui`)
    .sort();

  tree.write(
    `${appRoot}/.blueprint/manifest.json`,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        channel: process.env.BLUEPRINT_CHANNEL ?? 'stable',
        versions: { ...compatibility },
        palette,
        rtl,
        layout,
        showThemeSwitcher,
        showLanguageSwitcher,
        languages,
        apiUrl,
        appVersion,
        components: installedUiComponents,
        modules: [],
        // Ground truth, same as `components` above — `layout`'s own
        // `appendToManifest` call is a no-op this early (the manifest file
        // doesn't exist yet at that point in generation), same reason the `ui`
        // generator's manifest calls don't populate `components` either.
        layouts: layout !== 'none' ? [layout] : [],
        // Top-level `app.routes.ts` branches (e.g. `modules:auth`'s `auth`) that
        // must never be swept into a later-added main shell's children — see
        // `generator-kit`'s `addLayoutBranch`/`wrapRoutesUnderLayout`.
        protectedRouteBranches: [],
        template: null,
      },
      null,
      2,
    ),
  );

  // `create-nx-workspace` installs the preset package (`dependencies`) to run
  // it; move it to `devDependencies` afterwards rather than deleting it —
  // `nx g @blueprint-platform/foundation:layout` needs it installed to add a
  // layout standalone later, the same reason `components` is kept below.
  const foundationVersion = JSON.parse(
    readFileSync(join(__dirname, '../../../package.json'), 'utf-8'),
  ).version;
  updateJson(tree, 'package.json', (json) => {
    delete json.dependencies['@blueprint-platform/foundation'];
    json.devDependencies ??= {};
    json.devDependencies['@blueprint-platform/foundation'] = `^${foundationVersion}`;
    return json;
  });

  await formatFiles(tree);
  return () => installPackagesTask(tree);
}
