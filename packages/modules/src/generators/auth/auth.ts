import { Tree, formatFiles, generateFiles, joinPathFragments, logger, readJson } from '@nx/devkit';
import { addLayoutBranch, appendProvider, appendToManifest } from '@blueprint-platform/generator-kit';
import { loadLayoutGenerator } from '../shared/load-layout-generator';
import { loadUiGenerator } from '../shared/load-ui-generator';
import { patchGlobalStyles } from './lib/patch-global-styles';
import { scanUiImports } from './lib/scan-ui-imports';
import { AuthGeneratorSchema } from './schema';

/** Read a component's real exported class name from its own copied source. */
function readClassName(tree: Tree, path: string): string {
  const source = tree.read(path, 'utf-8');
  if (!source) {
    throw new Error(`modules:auth: expected ${path} to exist after copying it.`);
  }
  const match = source.match(/export\s+class\s+([A-Za-z0-9_$]+)/);
  if (!match) {
    throw new Error(`modules:auth: could not find an exported class in ${path}`);
  }
  return match[1];
}

/**
 * Add the auth module to an existing project: the chosen strategy's service +
 * interceptor, the storage seam, the mock backend, every form, one of the two
 * auth layouts (composed into `foundation:layout`, content-only — see its
 * `wireRoutes`/`withAccountMenu` options), and the `auth` route branch (a
 * protected top-level sibling — see `generator-kit`'s `addLayoutBranch`, and
 * `task-auth-module-platform-sync-v2.md` Task 1 for why that matters).
 */
export default async function (tree: Tree, options: AuthGeneratorSchema) {
  const appRoot = '.';
  const authType = options.authType ?? 'jwt';
  const storeType = options.storeType ?? 'local';
  const authLayout = options.authLayout ?? 'split';

  // Not meant to be run twice against the same project — a second run would
  // duplicate the `auth` route branch and the app.config.ts providers (neither
  // `addLayoutBranch` nor `appendProvider` de-duplicate; that's the caller's job
  // here, same as `ui`'s own "nothing to do" short-circuit).
  const manifestPath = `${appRoot}/.blueprint/manifest.json`;
  if (tree.exists(manifestPath)) {
    const manifest = readJson<Record<string, unknown>>(tree, manifestPath);
    if (Array.isArray(manifest.modules) && manifest.modules.includes('auth')) {
      logger.info('modules:auth: the auth module is already present in this project — nothing to do.');
      return;
    }
  }

  // 1. Core auth files — service/interceptor for BOTH strategies, storage seam,
  // mock backend, models — copied once, then the strategy that wasn't chosen is
  // dropped (mirrors the "copy then delete what doesn't apply" idiom already
  // used elsewhere in this project, e.g. the language-switcher cleanup in
  // `foundation:layout`).
  const authCoreDir = `${appRoot}/src/app/core/auth`;
  generateFiles(tree, joinPathFragments(__dirname, 'files/core/auth'), authCoreDir, {});
  if (authType === 'jwt') {
    tree.delete(`${authCoreDir}/session-auth.service.ts`);
    tree.delete(`${authCoreDir}/session-auth.interceptor.ts`);
  } else {
    tree.delete(`${authCoreDir}/jwt-auth.service.ts`);
    tree.delete(`${authCoreDir}/jwt-auth.interceptor.ts`);
  }

  // 2. Forms — always, regardless of parameters. `login-form.ts.template` is the
  // only one that varies with `authType` (which service it injects).
  const formsDir = `${appRoot}/src/app/features/auth/forms`;
  generateFiles(tree, joinPathFragments(__dirname, 'files/features/auth/forms'), formsDir, {
    authType,
  });

  // 3. Auth layout shell — composed into `foundation:layout` rather than owning
  // a second copy of the shell/UI-dependency-resolution logic. `wireRoutes:
  // false` / `withAccountMenu: false` because this shell must NOT become the
  // app's root wrapper and has no signed-in user yet — this generator wires its
  // own routes below via `addLayoutBranch`.
  const layoutGenerator = loadLayoutGenerator();
  const layoutName = `auth-${authLayout}`;
  const layoutDest = `${appRoot}/src/app/layout/${layoutName}`;
  if (!tree.exists(layoutDest)) {
    await layoutGenerator(tree, {
      name: layoutName,
      wireRoutes: false,
      withAccountMenu: false,
    });
  }
  const layoutClassName = readClassName(tree, `${layoutDest}/${layoutName}.ts`);

  // The forms' own UI-component needs (`alert`, `spinner`, `card` via the
  // layout shell, …) — computed from what's actually imported, not hardcoded,
  // same discipline as `foundation:layout`'s `shellUiImports`. Anything already
  // present (e.g. from `preset`'s starter set) is skipped by `ui` itself.
  const uiGenerator = loadUiGenerator();
  await uiGenerator(tree, {
    components: scanUiImports(tree, formsDir).join(','),
    skipFormat: true,
    skipInstall: true,
  });

  // 4. Route wiring — a brand-new, protected top-level `auth` branch, never
  // swept into whatever main shell exists now or gets added later.
  addLayoutBranch(tree, appRoot, {
    path: 'auth',
    layoutImportPath: `./layout/${layoutName}/${layoutName}`,
    layoutClassName,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        componentImportPath: './features/auth/forms/login-form/login-form',
        componentClassName: 'LoginForm',
      },
      {
        path: 'signup',
        componentImportPath: './features/auth/forms/signup-form/signup-form',
        componentClassName: 'SignupForm',
      },
      {
        path: 'forgot-password',
        children: [
          { path: '', redirectTo: 'email', pathMatch: 'full' },
          {
            path: 'email',
            componentImportPath:
              './features/auth/forms/forgot-password-email-form/forgot-password-email-form',
            componentClassName: 'ForgotPasswordEmailForm',
          },
          {
            path: 'code',
            componentImportPath:
              './features/auth/forms/forgot-password-code-form/forgot-password-code-form',
            componentClassName: 'ForgotPasswordCodeForm',
          },
          {
            path: 'new',
            componentImportPath:
              './features/auth/forms/forgot-password-new-password-form/forgot-password-new-password-form',
            componentClassName: 'ForgotPasswordNewPasswordForm',
          },
        ],
      },
      {
        path: 'change-password',
        componentImportPath: './features/auth/forms/change-password-form/change-password-form',
        componentClassName: 'ChangePasswordForm',
      },
    ],
  });

  // 5. app.config.ts patching — token-storage provider + the chosen
  // interceptor. Each is its own `appendProvider` call (rather than trying to
  // merge into the `provideHttpClient(withInterceptors([apiInterceptor]))` that
  // `foundation`'s `patch-app-config.ts` already added) — `HTTP_INTERCEPTOR_FNS`
  // is a multi-provider token, so a second `provideHttpClient(...)` call is
  // functionally additive, and this keeps `modules:auth` fully decoupled from
  // what `preset.ts` already wrote (it never has to parse or know about it).
  appendProvider(tree, appRoot, {
    imports: [{ names: 'provideAuth', from: './core/auth/provide-auth' }],
    providerExpression:
      storeType === 'memory' ? "provideAuth({ tokenStore: 'memory' })" : 'provideAuth()',
  });
  if (authType === 'jwt') {
    appendProvider(tree, appRoot, {
      imports: [
        { names: ['provideHttpClient', 'withInterceptors'], from: '@angular/common/http' },
        { names: 'jwtAuthInterceptor', from: './core/auth/jwt-auth.interceptor' },
      ],
      providerExpression: 'provideHttpClient(withInterceptors([jwtAuthInterceptor]))',
    });
  } else {
    appendProvider(tree, appRoot, {
      imports: [
        { names: ['provideHttpClient', 'withInterceptors'], from: '@angular/common/http' },
        { names: 'sessionAuthInterceptor', from: './core/auth/session-auth.interceptor' },
      ],
      providerExpression: 'provideHttpClient(withInterceptors([sessionAuthInterceptor]))',
    });
  }

  // 6. Global styles — two general-purpose `hlm-input-group`/autofill fixes
  // found while syncing this module (see patch-global-styles.ts) that hadn't
  // made it into foundation's utility layer yet.
  patchGlobalStyles(tree, appRoot);

  // 7. No net-new npm dependencies — every import here resolves to Angular
  // core/forms/router/rxjs (already present) or an `@blueprint-platform/ui/*`
  // component (added by the `ui` generator call above).

  // 8. Manifest. `layouts` / `protectedRouteBranches` were already populated as
  // a side effect of steps 3 and 4 (the `layout` and `addLayoutBranch` calls).
  appendToManifest(tree, appRoot, 'modules', 'auth');

  await formatFiles(tree);
}
