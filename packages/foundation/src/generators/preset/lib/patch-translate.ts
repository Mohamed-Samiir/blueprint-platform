import { Tree, updateJson } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * Wire ngx-translate v18 into `app.config.ts` and register `src/assets` as a
 * build asset so `assets/i18n/<lang>.json` is served.
 *
 * Call only when the translation engine is being generated (gated on
 * `showLanguageSwitcher`). `provideHttpClient()` is already added by
 * `patch-app-config.ts`, so it is not registered again here.
 *
 * v18 API — verified against `@ngx-translate/core@18` / `@ngx-translate/http-loader@18`:
 *   `provideTranslateService({ lang, fallbackLang, loader: provideTranslateHttpLoader({ prefix, suffix }) })`
 * (`RootTranslateServiceConfig.loader` accepts the `Provider[]` that
 * `provideTranslateHttpLoader` returns; `setDefaultLang` is gone — it's
 * `fallbackLang` / `setFallbackLang` now.)
 */
export function patchTranslateProviders(
  tree: Tree,
  appRoot: string,
  options: { defaultLanguage: string },
) {
  const path = `${appRoot}/src/app/app.config.ts`;
  const source = tree.read(path, 'utf-8');
  if (!source) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  file.addImportDeclaration({
    namedImports: ['provideTranslateService'],
    moduleSpecifier: '@ngx-translate/core',
  });
  file.addImportDeclaration({
    namedImports: ['provideTranslateHttpLoader'],
    moduleSpecifier: '@ngx-translate/http-loader',
  });

  const arrayLiteral = file
    .getVariableDeclarationOrThrow('appConfig')
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  arrayLiteral.addElement(
    `provideTranslateService({ lang: '${options.defaultLanguage}', fallbackLang: '${options.defaultLanguage}', loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }) })`,
  );

  tree.write(path, file.getFullText());

  // The modern Angular builder only ships `public/` by default — add `src/assets`
  // so the i18n JSON the loader fetches from `./assets/i18n/` is actually served.
  updateJson(tree, `${appRoot}/project.json`, (json) => {
    const assets: unknown[] = json.targets.build.options.assets ?? [];
    const present = assets.some(
      (a) =>
        typeof a === 'object' &&
        a !== null &&
        (a as { input?: string }).input === 'src/assets',
    );
    if (!present) {
      assets.push({ glob: '**/*', input: 'src/assets', output: 'assets' });
    }
    json.targets.build.options.assets = assets;
    return json;
  });
}
