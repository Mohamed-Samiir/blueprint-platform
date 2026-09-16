import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  logger,
  readJson,
  updateJson,
} from '@nx/devkit';
import {
  addLayoutBranch,
  appendProvider,
  appendToManifest,
  LayoutBranchChild,
} from '@blueprint-platform/generator-kit';
import { loadLayoutGenerator } from '../shared/load-layout-generator';
import { loadUiGenerator } from '../shared/load-ui-generator';
import { scanUiImports } from '../shared/scan-ui-imports';
import { patchGlobalStyles } from './lib/patch-global-styles';
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
  // No real file-based catalog to discover (unlike layout/components) — a
  // fixed one-line self-description, for interface consistency with `--list`
  // elsewhere. See tasks/task-cli-core-and-cli.md Part B3.
  if (options.list) {
    console.log(
      'auth — JWT or session authentication, with login/signup/forgot-password/change-password forms and its own layout.',
    );
    return;
  }

  const appRoot = '.';
  const authType = options.authType ?? 'jwt';
  const storeType = options.storeType ?? 'local';
  const authLayout = options.authLayout ?? 'split';
  const includeSignup = options.includeSignup ?? true;
  const includeForgotPassword = options.includeForgotPassword ?? true;
  const includeChangePassword = options.includeChangePassword ?? true;

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

  // 1a. Core auth files that stay under `core/` — the interceptor pair, the
  // storage seam, the mock backend, and the `AUTH_FEATURES` token
  // (`auth-features.token.ts.template` — the one file here that's genuinely
  // EJS-substituted, always copied regardless of which of the three flags
  // below are set, since the always-present `login-form` always depends on
  // it). `core/` stays reserved for cross-cutting app-wide singletons — an
  // interceptor, the storage seam, the DI provider setup — never a module's
  // own domain models/services (see 1b).
  const authCoreDir = `${appRoot}/src/app/core/auth`;
  generateFiles(tree, joinPathFragments(__dirname, 'files/core/auth'), authCoreDir, {
    includeSignup,
    includeForgotPassword,
    includeChangePassword,
  });

  // 1b. Models + services live under the module's OWN `features/auth/`, not
  // `core/` — this platform's convention for a module's domain models/
  // services (see the same choice in `modules:rbac`/`modules:user-management`).
  // Both service strategies are copied, then the one `authType` didn't select
  // is dropped, same idiom as the interceptor pair above.
  const authModelsDir = `${appRoot}/src/app/features/auth/models`;
  generateFiles(tree, joinPathFragments(__dirname, 'files/features/auth/models'), authModelsDir, {});

  const authServicesDir = `${appRoot}/src/app/features/auth/services`;
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files/features/auth/services'),
    authServicesDir,
    {},
  );

  if (authType === 'jwt') {
    tree.delete(`${authCoreDir}/session-auth.interceptor.ts`);
    tree.delete(`${authServicesDir}/session-auth.service.ts`);
  } else {
    tree.delete(`${authCoreDir}/jwt-auth.interceptor.ts`);
    tree.delete(`${authServicesDir}/jwt-auth.service.ts`);
  }

  // 2. Forms. `login-form` is always copied — it's the one form with no flag of
  // its own. `login-form.ts.template` varies with `authType` (which service it
  // injects) and always reads `AUTH_FEATURES` to decide whether to render its
  // "Sign up" / "Forgot password?" links (see the token above). Every other
  // form is copied unconditionally here too, then dropped per its own flag —
  // same "copy then delete" idiom as step 1, chosen over teaching `generateFiles`
  // a per-subfolder skip list. Forgot-password's three steps are gated together
  // (one linear flow, one flag — partial steps don't make sense standalone).
  const formsDir = `${appRoot}/src/app/features/auth/forms`;
  generateFiles(tree, joinPathFragments(__dirname, 'files/features/auth/forms'), formsDir, {
    authType,
  });
  if (!includeSignup) {
    tree.delete(`${formsDir}/signup-form`);
  }
  if (!includeForgotPassword) {
    tree.delete(`${formsDir}/forgot-password-email-form`);
    tree.delete(`${formsDir}/forgot-password-code-form`);
    tree.delete(`${formsDir}/forgot-password-new-password-form`);
  }
  if (!includeChangePassword) {
    tree.delete(`${formsDir}/change-password-form`);
  }

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
  // swept into whatever main shell exists now or gets added later. `children`
  // is assembled conditionally: `login` is always first (no flag of its own),
  // everything else is pushed only if its flag is true — mirrors the
  // conditional copying in step 2 above, one-to-one.
  const children: LayoutBranchChild[] = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
      path: 'login',
      componentImportPath: './features/auth/forms/login-form/login-form',
      componentClassName: readClassName(tree, `${formsDir}/login-form/login-form.ts`),
    },
  ];
  if (includeSignup) {
    children.push({
      path: 'signup',
      componentImportPath: './features/auth/forms/signup-form/signup-form',
      componentClassName: readClassName(tree, `${formsDir}/signup-form/signup-form.ts`),
    });
  }
  if (includeForgotPassword) {
    children.push({
      path: 'forgot-password',
      children: [
        { path: '', redirectTo: 'email', pathMatch: 'full' },
        {
          path: 'email',
          componentImportPath:
            './features/auth/forms/forgot-password-email-form/forgot-password-email-form',
          componentClassName: readClassName(
            tree,
            `${formsDir}/forgot-password-email-form/forgot-password-email-form.ts`,
          ),
        },
        {
          path: 'code',
          componentImportPath:
            './features/auth/forms/forgot-password-code-form/forgot-password-code-form',
          componentClassName: readClassName(
            tree,
            `${formsDir}/forgot-password-code-form/forgot-password-code-form.ts`,
          ),
        },
        {
          path: 'new',
          componentImportPath:
            './features/auth/forms/forgot-password-new-password-form/forgot-password-new-password-form',
          componentClassName: readClassName(
            tree,
            `${formsDir}/forgot-password-new-password-form/forgot-password-new-password-form.ts`,
          ),
        },
      ],
    });
  }
  if (includeChangePassword) {
    children.push({
      path: 'change-password',
      componentImportPath: './features/auth/forms/change-password-form/change-password-form',
      componentClassName: readClassName(
        tree,
        `${formsDir}/change-password-form/change-password-form.ts`,
      ),
    });
  }

  addLayoutBranch(tree, appRoot, {
    path: 'auth',
    layoutImportPath: `./layout/${layoutName}/${layoutName}`,
    layoutClassName,
    children,
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
  // `modules` (the generic idempotency array every pillar generator pushes a
  // plain name into, via `appendToManifest` — also what the no-op check at the
  // top of this function reads) only ever holds the string `'auth'`; the
  // richer per-module record — which strategy, which flags — doesn't fit that
  // shared string-array shape, so it lives in its own `authConfig` field
  // instead, written directly.
  appendToManifest(tree, appRoot, 'modules', 'auth');
  if (tree.exists(manifestPath)) {
    updateJson(tree, manifestPath, (json) => {
      json.authConfig = {
        name: 'auth',
        authType,
        storeType,
        authLayout,
        features: {
          signup: includeSignup,
          forgotPassword: includeForgotPassword,
          changePassword: includeChangePassword,
        },
      };
      return json;
    });
  }

  await formatFiles(tree);
}
