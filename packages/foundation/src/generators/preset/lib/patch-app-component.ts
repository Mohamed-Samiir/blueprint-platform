import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

/**
 * Rework the root `app.ts` / `app.html` the `@nx/angular` generator produced:
 *
 * - always drop the stock `NxWelcome` starter component (import + `imports:` entry
 *   + the `nx-welcome.ts` file).
 * - `layout: 'none'`  → `app.html` renders `<app-welcome />`; `app.ts` imports it.
 * - `layout: <shell>` → `app.html` renders `<router-outlet />` (so the shell route
 *   mounts); `app.ts` imports `RouterOutlet`. The welcome screen becomes the
 *   shell's index child route (see `patch-app-routes.ts`).
 *
 * ts-morph, never string replacement — the `@Component` decorator shape shifts
 * across Angular/Nx versions (same rule as `patch-app-config.ts`).
 */
export function patchAppComponent(
  tree: Tree,
  appRoot: string,
  options: { layout: string },
) {
  const tsPath = `${appRoot}/src/app/app.ts`;
  const htmlPath = `${appRoot}/src/app/app.html`;
  const source = tree.read(tsPath, 'utf-8');
  if (!source) return;

  const usingLayout = options.layout !== 'none';
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(tsPath, source);

  file
    .getImportDeclaration((d) => d.getModuleSpecifierValue() === './nx-welcome')
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
    const nxIdx = importsArray
      .getElements()
      .findIndex((el) => el.getText() === 'NxWelcome');
    if (nxIdx >= 0) importsArray.removeElement(nxIdx);
  }

  if (usingLayout) {
    file.addImportDeclaration({
      namedImports: ['RouterOutlet'],
      moduleSpecifier: '@angular/router',
    });
    importsArray?.addElement('RouterOutlet');
  } else {
    file.addImportDeclaration({
      namedImports: ['Welcome'],
      moduleSpecifier: './welcome',
    });
    importsArray?.addElement('Welcome');
  }

  tree.write(tsPath, file.getFullText());
  tree.write(
    htmlPath,
    usingLayout ? '<router-outlet />\n' : '<app-welcome />\n',
  );
  tree.delete(`${appRoot}/src/app/nx-welcome.ts`);

  // The Nx-generated spec imports NxWelcome and asserts on its markup — replace
  // it with a minimal "component creates" check so nothing dangles.
  const specPath = `${appRoot}/src/app/app.spec.ts`;
  if (tree.exists(specPath)) {
    tree.write(
      specPath,
      `import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  it('creates', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});
`,
    );
  }
}
