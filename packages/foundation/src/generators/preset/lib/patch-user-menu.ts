import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * Remove the `<app-language-switcher>` wiring from the generated
 * `user-menu.ts` / `.html`.
 *
 * `user-menu` (from the components pillar) hard-imports `LanguageSwitcher`. When
 * a layout is generated but `showLanguageSwitcher` is false, the switcher
 * component and the whole translation engine are intentionally NOT generated, so
 * that import would dangle — strip the import, the `imports:` array entry and the
 * template block. `theme-switcher` is left untouched.
 *
 * `user-menu` is a three-file component (`.ts`/`.html`/`.scss`, not an inline
 * `template:` string) — the import/`imports:`-array edit is still a ts-morph
 * pass over `user-menu.ts`, but the `@if` block lives in the separate
 * `user-menu.html` and is stripped there directly (plain text, not an AST —
 * there's no TypeScript to ts-morph in an external template file).
 */
export function patchUserMenu(tree: Tree, appRoot: string) {
  const tsPath = `${appRoot}/src/app/shared/ui/user-menu/user-menu.ts`;
  const htmlPath = `${appRoot}/src/app/shared/ui/user-menu/user-menu.html`;
  const source = tree.read(tsPath, 'utf-8');
  if (!source || !source.includes('LanguageSwitcher')) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(tsPath, source);

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

  tree.write(tsPath, file.getFullText());

  // Drop the `@if (config.showLanguageSwitcher) { … <app-language-switcher /> … }`
  // block from the external template (single-level braces, no nesting inside it).
  const html = tree.read(htmlPath, 'utf-8');
  if (html) {
    const stripped = html.replace(
      /\n[ \t]*@if \(config\.showLanguageSwitcher\) \{[^}]*\}/,
      '',
    );
    if (stripped !== html) {
      tree.write(htmlPath, stripped);
    }
  }
}
