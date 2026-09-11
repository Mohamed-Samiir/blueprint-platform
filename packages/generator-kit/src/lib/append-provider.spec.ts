import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { appendProvider } from './append-provider';

describe('appendProvider', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write(
      'src/app/app.config.ts',
      `import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners()],
};
`,
    );
  });

  it('does nothing if app.config.ts does not exist', () => {
    const empty = createTreeWithEmptyWorkspace();
    expect(() =>
      appendProvider(empty, '.', { providerExpression: 'x()' }),
    ).not.toThrow();
  });

  it('adds a single-name import and pushes the provider expression', () => {
    appendProvider(tree, '.', {
      imports: [{ names: 'provideZonelessChangeDetection', from: '@angular/core' }],
      providerExpression: 'provideZonelessChangeDetection()',
    });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    // Merged into the fixture's existing `@angular/core` import rather than
    // adding a second one — see the "merges into an existing import" test.
    expect(out).toContain('provideZonelessChangeDetection');
    expect(out).toContain('@angular/core');
    expect(out).toContain('provideZonelessChangeDetection()');
  });

  it('adds a fresh import declaration when the module has no existing import', () => {
    appendProvider(tree, '.', {
      imports: [{ names: 'provideRouter', from: '@angular/router' }],
      providerExpression: 'provideRouter(routes)',
    });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    expect(out).toContain(`import { provideRouter } from "@angular/router"`);
  });

  it('supports multiple named imports from one module in one call', () => {
    appendProvider(tree, '.', {
      imports: [
        { names: ['provideHttpClient', 'withInterceptors'], from: '@angular/common/http' },
      ],
      providerExpression: 'provideHttpClient(withInterceptors([]))',
    });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    expect(out).toContain(
      `import { provideHttpClient, withInterceptors } from "@angular/common/http"`,
    );
  });

  it('supports multiple imports from different modules for one provider', () => {
    appendProvider(tree, '.', {
      imports: [
        { names: 'Directionality', from: '@angular/cdk/bidi' },
        { names: 'LanguageService', from: './core/language/language.service' },
      ],
      providerExpression: '{ provide: Directionality, useExisting: LanguageService }',
    });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    expect(out).toContain(`import { Directionality } from "@angular/cdk/bidi"`);
    expect(out).toContain(
      `import { LanguageService } from "./core/language/language.service"`,
    );
    expect(out).toContain(
      '{ provide: Directionality, useExisting: LanguageService }',
    );
  });

  it('supports a provider expression with no new import (e.g. a spread)', () => {
    appendProvider(tree, '.', {
      imports: [{ names: 'provideBlueprint', from: './core/config/provide-blueprint' }],
      providerExpression: "...provideBlueprint({ palette: 'default' })",
    });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    expect(out).toContain("...provideBlueprint({ palette: 'default' })");
  });

  it('merges into an existing import from the same module instead of duplicating it', () => {
    appendProvider(tree, '.', {
      imports: [
        { names: ['provideHttpClient', 'withInterceptors'], from: '@angular/common/http' },
        { names: 'apiInterceptor', from: './core/api.interceptor' },
      ],
      providerExpression: 'provideHttpClient(withInterceptors([apiInterceptor]))',
    });
    // A second, independent caller (e.g. modules:auth) needs the same two
    // names from the same module, plus its own interceptor import.
    appendProvider(tree, '.', {
      imports: [
        { names: ['provideHttpClient', 'withInterceptors'], from: '@angular/common/http' },
        { names: 'jwtAuthInterceptor', from: './core/auth/jwt-auth.interceptor' },
      ],
      providerExpression: 'provideHttpClient(withInterceptors([jwtAuthInterceptor]))',
    });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    const importLines = out
      .split('\n')
      .filter((l) => l.includes(`from "@angular/common/http"`));
    expect(importLines.length).toBe(1);
    expect(importLines[0]).toContain('provideHttpClient');
    expect(importLines[0]).toContain('withInterceptors');
    expect(out).toContain('provideHttpClient(withInterceptors([apiInterceptor]))');
    expect(out).toContain('provideHttpClient(withInterceptors([jwtAuthInterceptor]))');
  });

  it('does not re-add a name already imported from that module', () => {
    appendProvider(tree, '.', {
      imports: [{ names: 'provideZonelessChangeDetection', from: '@angular/core' }],
      providerExpression: 'provideZonelessChangeDetection()',
    });
    appendProvider(tree, '.', {
      imports: [{ names: 'provideZonelessChangeDetection', from: '@angular/core' }],
      providerExpression: 'provideZonelessChangeDetection()',
    });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    const importLines = out
      .split('\n')
      .filter((l) => l.startsWith('import') && l.includes(`from '@angular/core'`));
    expect(importLines.length).toBe(1);
    expect(importLines[0].match(/provideZonelessChangeDetection/g)?.length).toBe(1);
  });

  it('accumulates across multiple calls, preserving push order in the array', () => {
    appendProvider(tree, '.', { providerExpression: 'a()' });
    appendProvider(tree, '.', { providerExpression: 'b()' });
    appendProvider(tree, '.', { providerExpression: 'c()' });
    const out = tree.read('src/app/app.config.ts', 'utf-8') ?? '';
    const providersLine = out.split('\n').find((l) => l.includes('providers:')) ?? '';
    expect(providersLine.indexOf('a()')).toBeLessThan(providersLine.indexOf('b()'));
    expect(providersLine.indexOf('b()')).toBeLessThan(providersLine.indexOf('c()'));
  });
});
