import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * Add zero or more named imports, then push one provider expression into
 * `app.config.ts`'s `appConfig` array literal.
 *
 * Generalized from the repeated "add an import, push an element into the
 * `appConfig` array" pattern in `foundation`'s `patch-app-config.ts`. `imports`
 * is a list (not a single `{ importName, importPath }` pair) because a single
 * provider expression there routinely needs more than one import — sometimes
 * several names from the *same* module in one `import { a, b } from '...'`
 * statement (e.g. `provideHttpClient` + `withInterceptors`), sometimes names
 * from *different* modules (e.g. `Directionality` from `@angular/cdk/bidi` and
 * `LanguageService` from a local path) for one `{ provide: …, useExisting: … }`
 * expression. Pass `imports: []` (or omit it) for a provider that needs no new
 * import (e.g. it reuses a name a previous `appendProvider` call already added).
 *
 * **Import merging.** If `app.config.ts` already has an import declaration for
 * the same `from` module (e.g. a previous `appendProvider` call, or
 * `patch-app-config.ts`'s own unconditional `provideHttpClient`/
 * `withInterceptors` import for `apiInterceptor`), the requested names are
 * merged into that existing declaration — only the names not already present
 * are added — instead of emitting a second `import { ... } from '...'` for the
 * same module, which would be a TS "duplicate identifier" error. This is what
 * lets two independent `appendProvider` calls (e.g. `foundation`'s own
 * `apiInterceptor` wiring and `modules:auth`'s interceptor wiring) both need
 * `provideHttpClient`/`withInterceptors` from `@angular/common/http` without
 * either caller having to know about the other.
 */
export function appendProvider(
  tree: Tree,
  appRoot: string,
  options: {
    imports?: Array<{ names: string | string[]; from: string }>;
    providerExpression: string;
  },
) {
  const path = `${appRoot}/src/app/app.config.ts`;
  const source = tree.read(path, 'utf-8');
  if (!source) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  for (const imp of options.imports ?? []) {
    const names = Array.isArray(imp.names) ? imp.names : [imp.names];
    const existing = file.getImportDeclaration(
      (d) => d.getModuleSpecifierValue() === imp.from,
    );
    if (existing) {
      const already = new Set(existing.getNamedImports().map((n) => n.getName()));
      const toAdd = names.filter((n) => !already.has(n));
      if (toAdd.length) existing.addNamedImports(toAdd);
    } else {
      file.addImportDeclaration({ namedImports: names, moduleSpecifier: imp.from });
    }
  }

  const arrayLiteral = file
    .getVariableDeclarationOrThrow('appConfig')
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  arrayLiteral.addElement(options.providerExpression);

  tree.write(path, file.getFullText());
}
