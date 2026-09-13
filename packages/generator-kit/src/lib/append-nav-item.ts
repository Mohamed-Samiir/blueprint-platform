import { Tree } from '@nx/devkit';
import { Project, SyntaxKind } from 'ts-morph';

const MARKER = '<!-- BP:NAV_ITEMS -->';

/**
 * Insert one nav item into a layout shell's template, immediately before the
 * `<!-- BP:NAV_ITEMS -->` marker `preset.ts`'s shell catalog places right
 * after the last existing item (see `find-main-shell.ts` and Task 1's marker
 * retrofit). There's no AST tool in this project for editing Angular HTML the
 * way `ts-morph` handles TypeScript, so this is a deliberate plain string
 * insertion — safe specifically because the marker is a stable, unique
 * anchor, not because HTML editing by string is generally a good idea.
 *
 * The markup matches the real shape every existing shell's own "Welcome" item
 * uses (`hlmSidebarMenuItem`/`hlmSidebarMenuButton`, `routerLinkActive`-driven
 * `[isActive]`, a `[tooltip]` for the collapsed-rail hover state, and an
 * `<ng-icon>` — a bare `<a routerLink=… class="…">` would look structurally
 * broken next to it) — confirmed against the real files, not assumed.
 *
 * **Also registers `item.icon` in the shell's own `.ts` file** (derived by
 * swapping `.html` → `.ts` on `layoutFilePath`) — an `<ng-icon>` whose name
 * isn't in that component's `provideIcons({…})` call silently fails to
 * render, so "append a nav item" has to mean a fully working one, not just a
 * text insertion with a broken icon. Uses the same import-merge idiom
 * `appendProvider` uses (add the name to an existing `@ng-icons/lucide`
 * import if one exists, otherwise a fresh import) plus the equivalent for the
 * `provideIcons({…})` object literal's shorthand properties.
 *
 * **Idempotent**: skips the HTML insertion silently if this exact
 * `routerLink` already appears anywhere in the file, so re-running a module's
 * generator (or a manual second run) never produces a duplicate entry — the
 * icon-registration step is separately idempotent (checked directly against
 * the import/`provideIcons` contents, not gated on the same routerLink
 * check), so a shared icon across two nav items is only ever registered once.
 * Does nothing if the marker itself is missing (e.g. an older project
 * generated before Task 1's marker retrofit) — not an error, just nothing to
 * anchor on.
 */
export function appendNavItem(
  tree: Tree,
  layoutFilePath: string,
  item: { label: string; routerLink: string; icon: string },
) {
  const content = tree.read(layoutFilePath, 'utf-8');
  if (!content) return;

  if (!content.includes(`routerLink="${item.routerLink}"`) && content.includes(MARKER)) {
    const newItem = `<li hlmSidebarMenuItem>
              <a
                hlmSidebarMenuButton
                routerLink="${item.routerLink}"
                routerLinkActive
                #rla="routerLinkActive"
                [isActive]="rla.isActive"
                [tooltip]="'${item.label}'"
              >
                <ng-icon name="${item.icon}" />
                <span>${item.label}</span>
              </a>
            </li>
            ${MARKER}`;

    tree.write(layoutFilePath, content.replace(MARKER, newItem));
  }

  registerIcon(tree, layoutFilePath.replace(/\.html$/, '.ts'), item.icon);
}

/** Add `iconName` to the shell's `@ng-icons/lucide` import and `provideIcons({…})` call, if not already present. */
function registerIcon(tree: Tree, tsPath: string, iconName: string) {
  const source = tree.read(tsPath, 'utf-8');
  if (!source || source.includes(iconName)) return;

  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(tsPath, source);

  const existingImport = file.getImportDeclaration(
    (d) => d.getModuleSpecifierValue() === '@ng-icons/lucide',
  );
  if (existingImport) {
    existingImport.addNamedImport(iconName);
  } else {
    file.addImportDeclaration({
      namedImports: [iconName],
      moduleSpecifier: '@ng-icons/lucide',
    });
  }

  const provideIconsCall = file
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((c) => c.getExpression().getText() === 'provideIcons');
  const iconsObject = provideIconsCall
    ?.getArguments()[0]
    ?.asKind(SyntaxKind.ObjectLiteralExpression);
  iconsObject?.addShorthandPropertyAssignment({ name: iconName });

  tree.write(tsPath, file.getFullText());
}
