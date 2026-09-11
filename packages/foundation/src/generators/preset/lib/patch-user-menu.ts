import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * Remove the `<app-language-switcher>` wiring from the generated `user-menu.ts`.
 *
 * `user-menu` (from the components pillar) hard-imports `LanguageSwitcher`. When
 * a layout is generated but `showLanguageSwitcher` is false, the switcher
 * component and the whole translation engine are intentionally NOT generated, so
 * that import would dangle — strip the import, the `imports:` array entry and the
 * template block. `theme-switcher` is left untouched.
 */
export function patchUserMenu(tree: Tree, appRoot: string) {
  const path = `${appRoot}/src/app/shared/ui/user-menu/user-menu.ts`;
  const source = tree.read(path, 'utf-8');
  if (!source || !source.includes('LanguageSwitcher')) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(path, source);

  file
    .getImportDeclaration((d) =>
      d.getModuleSpecifierValue().endsWith('/language-switcher/language-switcher'),
    )
    ?.remove();

  const importsArray = file
    .getClasses()[0]
    ?.getDecorator('Component')
    ?.getCallExpression()
    ?.getArguments()[0]
    ?.asKind(SyntaxKind.ObjectLiteralExpression)
    ?.getProperty('imports')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

  if (importsArray) {
    const idx = importsArray
      .getElements()
      .findIndex((el) => el.getText() === 'LanguageSwitcher');
    if (idx >= 0) importsArray.removeElement(idx);
  }

  // Drop the `@if (config.showLanguageSwitcher) { … <app-language-switcher /> … }`
  // block from the inline template (single-level braces, no nesting inside it).
  const templateProp = file
    .getClasses()[0]
    ?.getDecorator('Component')
    ?.getCallExpression()
    ?.getArguments()[0]
    ?.asKind(SyntaxKind.ObjectLiteralExpression)
    ?.getProperty('template')
    ?.asKind(SyntaxKind.PropertyAssignment);
  const initializer = templateProp?.getInitializerIfKind(
    SyntaxKind.NoSubstitutionTemplateLiteral,
  );
  if (initializer) {
    const literal = initializer.getLiteralValue();
    const stripped = literal.replace(
      /\n[ \t]*@if \(config\.showLanguageSwitcher\) \{[^}]*\}/,
      '',
    );
    if (stripped !== literal) {
      initializer.setLiteralValue(stripped);
    }
  }

  tree.write(path, file.getFullText());
}
