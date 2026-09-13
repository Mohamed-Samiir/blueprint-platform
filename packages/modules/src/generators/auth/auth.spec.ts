import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import authGenerator from './auth';

const ROUTES_TEMPLATE = `import { Routes } from '@angular/router';

export const routes: Routes = [
  // Feature routes are added here automatically when you generate a
  // module (e.g. \`nx g @blueprint-platform/modules:auth\`).
];
`;

const APP_CONFIG_TEMPLATE = `import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiInterceptor } from './core/api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
};
`;

function makeTree(): Tree {
  const tree = createTreeWithEmptyWorkspace();
  tree.write('src/app/app.routes.ts', ROUTES_TEMPLATE);
  tree.write('src/app/app.config.ts', APP_CONFIG_TEMPLATE);
  tree.write('src/styles/_utilities.scss', '/* utilities */\n');
  writeJson(tree, 'package.json', { dependencies: {}, devDependencies: {} });
  writeJson(tree, '.blueprint/manifest.json', {
    components: [],
    modules: [],
    layouts: [],
    protectedRouteBranches: [],
  });
  return tree;
}

describe('modules:auth generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = makeTree();
  });

  it('copies only the chosen strategy (jwt default) and drops the other', async () => {
    await authGenerator(tree, {});
    expect(tree.exists('src/app/core/auth/jwt-auth.service.ts')).toBe(true);
    expect(tree.exists('src/app/core/auth/jwt-auth.interceptor.ts')).toBe(true);
    expect(tree.exists('src/app/core/auth/session-auth.service.ts')).toBe(false);
    expect(tree.exists('src/app/core/auth/session-auth.interceptor.ts')).toBe(false);
  });

  it('copies only the session strategy when authType is session', async () => {
    await authGenerator(tree, { authType: 'session' });
    expect(tree.exists('src/app/core/auth/session-auth.service.ts')).toBe(true);
    expect(tree.exists('src/app/core/auth/session-auth.interceptor.ts')).toBe(true);
    expect(tree.exists('src/app/core/auth/jwt-auth.service.ts')).toBe(false);
    expect(tree.exists('src/app/core/auth/jwt-auth.interceptor.ts')).toBe(false);
  });

  it('always copies the shared core files and every form', async () => {
    await authGenerator(tree, {});
    for (const f of [
      'models.ts',
      'auth-mock.data.ts',
      'token-store.ts',
      'local-storage-token-store.ts',
      'in-memory-token-store.ts',
      'provide-auth.ts',
    ]) {
      expect(tree.exists(`src/app/core/auth/${f}`)).toBe(true);
    }
    for (const form of [
      'login-form',
      'signup-form',
      'forgot-password-email-form',
      'forgot-password-code-form',
      'forgot-password-new-password-form',
      'change-password-form',
    ]) {
      expect(tree.exists(`src/app/features/auth/forms/${form}/${form}.ts`)).toBe(true);
    }
    expect(tree.exists('src/app/features/auth/forms/password-match.validator.ts')).toBe(true);
  });

  it('renders login-form.ts against the chosen authType (jwt)', async () => {
    await authGenerator(tree, { authType: 'jwt' });
    const out = tree.read('src/app/features/auth/forms/login-form/login-form.ts', 'utf-8') ?? '';
    expect(out).toContain('JwtAuthService');
    expect(out).not.toContain('SessionAuthService');
  });

  it('renders login-form.ts against the chosen authType (session)', async () => {
    await authGenerator(tree, { authType: 'session' });
    const out = tree.read('src/app/features/auth/forms/login-form/login-form.ts', 'utf-8') ?? '';
    expect(out).toContain('SessionAuthService');
    expect(out).not.toContain('JwtAuthService');
  });

  it('adds the requested auth-split layout shell, content-only (no account menu, no route sweep)', async () => {
    await authGenerator(tree, { authLayout: 'split' });
    expect(tree.exists('src/app/layout/auth-split/auth-split.ts')).toBe(true);
    expect(tree.exists('src/app/shared/ui/user-menu')).toBe(false);
    expect(tree.exists('src/app/shared/ui/theme-switcher')).toBe(false);
  });

  it('adds the auth-centered layout shell when requested', async () => {
    await authGenerator(tree, { authLayout: 'centered' });
    expect(tree.exists('src/app/layout/auth-centered/auth-centered.ts')).toBe(true);
  });

  it('adds the forms UI dependencies (alert, spinner, card, …)', async () => {
    await authGenerator(tree, {});
    for (const c of ['alert', 'spinner', 'card', 'button', 'field', 'input', 'input-group', 'checkbox']) {
      expect(tree.exists(`src/app/shared/ui/${c}`)).toBe(true);
    }
  });

  it('adds the auth route branch as a protected top-level sibling', async () => {
    await authGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).toContain(`path: 'auth'`);
    expect(out).toContain('LoginForm');
    expect(out).toContain('SignupForm');
    expect(out).toContain('ForgotPasswordEmailForm');
    expect(out).toContain(`path: 'forgot-password'`);

    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.protectedRouteBranches).toEqual(['auth']);
  });

  it('records the module in the manifest', async () => {
    await authGenerator(tree, {});
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.modules).toEqual(['auth']);
  });

  it('wires provideAuth() and the jwt interceptor into app.config.ts', async () => {
    await authGenerator(tree, { authType: 'jwt', storeType: 'local' });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    expect(out).toContain('provideAuth()');
    expect(out).toContain('provideHttpClient(withInterceptors([jwtAuthInterceptor]))');
  });

  it('wires provideAuth({ tokenStore: "memory" }) when storeType is memory', async () => {
    await authGenerator(tree, { storeType: 'memory' });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    expect(out).toContain("provideAuth({ tokenStore: 'memory' })");
  });

  it('wires the session interceptor when authType is session', async () => {
    await authGenerator(tree, { authType: 'session' });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    expect(out).toContain('provideHttpClient(withInterceptors([sessionAuthInterceptor]))');
  });

  it('appends the global input-group/autofill style fixes once, idempotently', async () => {
    await authGenerator(tree, {});
    const first = tree.read('src/styles/_utilities.scss', 'utf-8') ?? '';
    expect(first).toContain("[data-slot='input-group'] [data-slot='input-group-control']");

    await authGenerator(tree, {});
    const second = tree.read('src/styles/_utilities.scss', 'utf-8') ?? '';
    expect(second.split("[data-slot='input-group'] [data-slot='input-group-control']").length).toBe(2);
  });

  it('always copies login-form and auth-features.token.ts regardless of flags', async () => {
    await authGenerator(tree, {
      includeSignup: false,
      includeForgotPassword: false,
      includeChangePassword: false,
    });
    expect(tree.exists('src/app/features/auth/forms/login-form/login-form.ts')).toBe(true);
    expect(tree.exists('src/app/core/auth/auth-features.token.ts')).toBe(true);
  });

  it('omits signup-form when includeSignup is false, keeps it by default', async () => {
    await authGenerator(tree, { includeSignup: false });
    expect(tree.exists('src/app/features/auth/forms/signup-form')).toBe(false);
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).not.toContain('SignupForm');
    expect(out).not.toContain(`path: 'signup'`);
  });

  it('includes signup-form by default (includeSignup defaults to true)', async () => {
    await authGenerator(tree, {});
    expect(tree.exists('src/app/features/auth/forms/signup-form')).toBe(true);
  });

  it('omits all three forgot-password steps together when includeForgotPassword is false', async () => {
    await authGenerator(tree, { includeForgotPassword: false });
    for (const form of [
      'forgot-password-email-form',
      'forgot-password-code-form',
      'forgot-password-new-password-form',
    ]) {
      expect(tree.exists(`src/app/features/auth/forms/${form}`)).toBe(false);
    }
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).not.toContain(`path: 'forgot-password'`);
    expect(out).not.toContain('ForgotPasswordEmailForm');
  });

  it('omits change-password-form when includeChangePassword is false', async () => {
    await authGenerator(tree, { includeChangePassword: false });
    expect(tree.exists('src/app/features/auth/forms/change-password-form')).toBe(false);
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    expect(out).not.toContain('ChangePasswordForm');
    expect(out).not.toContain(`path: 'change-password'`);
  });

  it('renders auth-features.token.ts with the chosen flag values substituted', async () => {
    await authGenerator(tree, {
      includeSignup: false,
      includeForgotPassword: true,
      includeChangePassword: false,
    });
    const out = tree.read('src/app/core/auth/auth-features.token.ts', 'utf-8') ?? '';
    expect(out).toContain('signup: false');
    expect(out).toContain('forgotPassword: true');
    expect(out).toContain('changePassword: false');
  });

  it('login-form.ts injects AUTH_FEATURES regardless of which flags are set', async () => {
    await authGenerator(tree, { includeSignup: false });
    const out = tree.read('src/app/features/auth/forms/login-form/login-form.ts', 'utf-8') ?? '';
    expect(out).toContain('AUTH_FEATURES');
    expect(out).toContain('inject(AUTH_FEATURES)');
  });

  it('records the three flags in manifest.authConfig alongside authType/storeType/authLayout', async () => {
    await authGenerator(tree, {
      authType: 'session',
      storeType: 'memory',
      authLayout: 'centered',
      includeSignup: false,
      includeForgotPassword: true,
      includeChangePassword: false,
    });
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.authConfig).toEqual({
      name: 'auth',
      authType: 'session',
      storeType: 'memory',
      authLayout: 'centered',
      features: { signup: false, forgotPassword: true, changePassword: false },
    });
    // The generic idempotency array is untouched by the richer record.
    expect(manifest.modules).toEqual(['auth']);
  });

  it('is a no-op on a second run — does not duplicate the auth route branch', async () => {
    await authGenerator(tree, {});
    await authGenerator(tree, {});
    const out = tree.read('src/app/app.routes.ts', 'utf-8') ?? '';
    // Only one 'auth' branch should exist — the second run short-circuits
    // because the manifest already lists 'auth' under `modules`.
    expect(out.split(`path: 'auth'`).length).toBe(2);
  });
});
