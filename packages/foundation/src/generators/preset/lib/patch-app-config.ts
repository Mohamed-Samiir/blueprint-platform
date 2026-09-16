import { Tree, updateJson } from '@nx/devkit';
import { appendProvider } from '@blueprint-platform/generator-kit';

export function patchAppConfig(
  tree: Tree,
  appRoot: string,
  options: {
    palette: string;
    rtl: boolean;
    /** Whether `core/language/language.service.ts` will exist — either variant. */
    hasLanguageService: boolean;
  },
) {
  const path = `${appRoot}/src/app/app.config.ts`;
  if (!tree.read(path, 'utf-8')) return;

  appendProvider(tree, appRoot, {
    imports: [{ names: 'provideZonelessChangeDetection', from: '@angular/core' }],
    providerExpression: 'provideZonelessChangeDetection()',
  });
  appendProvider(tree, appRoot, {
    imports: [
      { names: 'provideRouter', from: '@angular/router' },
      { names: 'routes', from: './app.routes' },
    ],
    providerExpression: 'provideRouter(routes)',
  });
  appendProvider(tree, appRoot, {
    imports: [
      { names: ['provideHttpClient', 'withInterceptors'], from: '@angular/common/http' },
      { names: 'apiInterceptor', from: './core/api.interceptor' },
    ],
    providerExpression: 'provideHttpClient(withInterceptors([apiInterceptor]))',
  });

  // `LanguageService` doubles as the app's CDK `Directionality` so overlays stay
  // in lock-step with a runtime direction change. Both the base and
  // translate-augmented variants implement the same Directionality shape, so
  // this is wired whenever either exists — a layout alone (base) or
  // `showLanguageSwitcher` alone (translate, even with `layout: 'none'`).
  if (options.hasLanguageService) {
    appendProvider(tree, appRoot, {
      imports: [
        { names: 'Directionality', from: '@angular/cdk/bidi' },
        { names: 'LanguageService', from: './core/language/language.service' },
      ],
      providerExpression: '{ provide: Directionality, useExisting: LanguageService }',
    });
  }

  appendProvider(tree, appRoot, {
    imports: [{ names: 'provideBlueprint', from: './core/config/provide-blueprint' }],
    providerExpression: `...provideBlueprint({ palette: '${options.palette}', rtl: ${options.rtl} })`,
  });

  // Nx-generated Angular apps have a per-project project.json, not a
  // single workspace-wide angular.json — the styles array lives at
  // targets.build.options.styles inside it.
  updateJson(tree, `${appRoot}/project.json`, (json) => {
    json.targets.build.options.styles = [
      `${appRoot}/src/styles/theme.scss`,
      `${appRoot}/src/styles/tailwind-theme.css`,
      // Nx's default global stylesheet — kept last so app-level overrides win.
      `${appRoot}/src/styles.scss`,
    ];
    return json;
  });
}
