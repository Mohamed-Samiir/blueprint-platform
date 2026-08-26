import { Tree, updateJson } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

export function patchAppConfig(
  tree: Tree,
  appRoot: string,
  options: { palette: string; rtl: boolean; labelPosition: string },
) {
  const path = `${appRoot}/src/app/app.config.ts`;
  const source = tree.read(path, 'utf-8');
  if (!source) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  file.addImportDeclaration({
    namedImports: ['provideZonelessChangeDetection'],
    moduleSpecifier: '@angular/core',
  });
  file.addImportDeclaration({
    namedImports: ['provideRouter'],
    moduleSpecifier: '@angular/router',
  });
  file.addImportDeclaration({
    namedImports: ['routes'],
    moduleSpecifier: './app.routes',
  });
  file.addImportDeclaration({
    namedImports: ['provideBlueprint'],
    moduleSpecifier: './core/config/provide-blueprint',
  });

  const arrayLiteral = file
    .getVariableDeclarationOrThrow('appConfig')
    .getFirstDescendantByKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  arrayLiteral.addElement('provideZonelessChangeDetection()');
  arrayLiteral.addElement('provideRouter(routes)');
  arrayLiteral.addElement(
    `...provideBlueprint({ palette: '${options.palette}', rtl: ${options.rtl}, labelPosition: '${options.labelPosition}' })`,
  );

  tree.write(path, file.getFullText());

  // Nx-generated Angular apps have a per-project project.json, not a
  // single workspace-wide angular.json — the styles array lives at
  // targets.build.options.styles inside it.
  updateJson(tree, `${appRoot}/project.json`, (json) => {
    json.targets.build.options.styles = [
      `${appRoot}/src/styles/theme.scss`,
      `${appRoot}/src/styles/tailwind-theme.css`,
    ];
    return json;
  });
}
