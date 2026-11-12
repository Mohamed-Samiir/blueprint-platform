import { Tree, formatFiles, generateFiles, joinPathFragments } from '@nx/devkit';
import { join, posix } from 'node:path';
import { appendToManifest } from '@blueprint-platform/generator-kit';
import { loadUiGenerator } from '../shared/load-ui-generator';
import { scanUiImports } from '../shared/scan-ui-imports';
import { buildForm } from './lib/build-form';
import { parseFieldModel } from './lib/parse-model';
import { FormGeneratorSchema } from './schema';

/** `order-form` → `OrderForm`. Assumes kebab-case input, same trust level `--name` gets everywhere else in this project. */
function toPascalCase(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Destination directory for the generated component, relative to `src/app/`
 * — never a filename; the component's own `<name>/` subfolder is appended by
 * the caller. Strips a leading slash and a redundant leading `src/app/`
 * prefix (a caller might reasonably pass either), so `--directory=/src/app/
 * features/orders`, `--directory=src/app/features/orders`, and
 * `--directory=features/orders` all resolve identically. Unlike
 * `modules:rbac`/`modules:user-management` (whose destination is always a
 * fixed `features/<module>` computed from the module's own name — neither
 * has a `directory` option at all, confirmed by reading their schemas before
 * writing this), `modules:form` genuinely needs a configurable destination
 * since a single reusable component, unlike a whole feature/page tree,
 * reasonably lives anywhere the developer's own `features/` organization
 * puts it.
 */
function normalizeDirectory(directory: string | undefined): string {
  const value = directory ?? 'features/forms';
  return value.replace(/^\/+/, '').replace(/^src\/app\//, '').replace(/\/+$/, '');
}

/**
 * Add a scaffolded, reusable form component to an existing project, built
 * from a developer-authored `bp.models/<name>.ts` file (see
 * `lib/field-model.types.ts`'s own doc comment for that file's shape) —
 * statically parsed via `ts-morph` (`lib/parse-model.ts`), **never**
 * `require()`/dynamically `import()`/`eval`'d, since it's arbitrary code
 * living in the developer's own project, not generator payload.
 *
 * Validators declared in the model are attached to the generated
 * `FormGroup`'s controls and rendered inline as `<hlm-field-error>`s;
 * `'button'` entries become real buttons with stubbed click handlers.
 *
 * **Deliberately produces no routes and no nav entry** — unlike
 * `modules:rbac`/`modules:user-management`, this generator's output is a
 * reusable form COMPONENT, not a page in the app shell, so it never calls
 * `findExistingMainShell`/`appendNavItem` or
 * `appendChildRoutes`/`addLayoutBranch`. Just the three component files plus
 * a `.blueprint/manifest.json` `forms` record. Do not "fix" this later by
 * adding routing/nav wiring without the user explicitly asking for it.
 */
export default async function (tree: Tree, options: FormGeneratorSchema) {
  const appRoot = '.';
  const directory = normalizeDirectory(options.directory);
  const destDir = `${appRoot}/src/app/${directory}/${options.name}`;

  // `parseFieldModel` reads the developer's model file directly off disk —
  // it's a pre-existing file already sitting in the generated project's
  // source tree, not part of this generator's own Tree writes, so it's read
  // by real filesystem path, not through the Nx `Tree` API. `tree.root` is
  // the generated project's own root on disk.
  const modelPath = join(tree.root, options.model);
  const entries = parseFieldModel(modelPath);

  const built = buildForm(entries);

  const importStatementsBlock = built.imports
    .map(({ specifier, names }) => `import { ${names.join(', ')} } from '${specifier}';`)
    .join('\n');

  // `custom-validators` is generator payload (it imports `@angular/forms`, which
  // `modules` itself can't compile — so it ships as a `.ts.template` under
  // `files/shared/`, not compiled `lib/` code). One shared copy per project,
  // written only when a model actually needs it and left alone once it exists
  // (the developer owns it).
  const customValidatorsDir = `${appRoot}/src/app/shared/forms`;
  const customValidatorsImportPath = (() => {
    const rel = posix.relative(`src/app/${directory}/${options.name}`, 'src/app/shared/forms/custom-validators');
    return rel.startsWith('.') ? rel : `./${rel}`;
  })();
  if (built.customValidatorFns.length > 0 && !tree.exists(`${customValidatorsDir}/custom-validators.ts`)) {
    generateFiles(tree, joinPathFragments(__dirname, 'files/shared'), customValidatorsDir, {});
  }

  const componentImportsNames = [
    'ReactiveFormsModule',
    ...(built.needsIcons ? ['NgIcon'] : []),
    ...built.imports.flatMap((i) => i.names),
  ];
  const componentImportsBlock = componentImportsNames.map((n) => `    ${n},`).join('\n');

  generateFiles(tree, joinPathFragments(__dirname, 'files/component'), destDir, {
    name: options.name,
    className: toPascalCase(options.name),
    selector: `app-${options.name}`,
    modelPath: options.model,
    needsIcons: built.needsIcons,
    iconImportNames: built.iconNames.join(', '),
    importStatementsBlock,
    componentImportsBlock,
    formControlsCode: built.formControlsCode,
    needsAttachmentHandlers: built.needsAttachmentHandlers,
    needsFormArray: built.needsFormArray,
    arrayMembersCode: built.arrayMembersCode,
    usesBuiltInValidators: built.usesBuiltInValidators,
    customValidatorFns: built.customValidatorFns,
    customValidatorsImportPath,
    handlerNames: built.handlerNames,
  });

  // The `.html` output is one big pre-computed string (every field's real
  // markup, already rendered by `field-renderers.ts`'s own functions) — not
  // a template with static wrapper text around a handful of substitutions,
  // so it's written directly via `tree.write` rather than routed through
  // EJS (no existing generator in this project had this exact "one giant
  // precomputed string into a brand-new file" shape to match, so this is a
  // considered choice, not a copied convention: `tree.write` sidesteps any
  // risk of EJS's own `<% %>` delimiters colliding with arbitrary content,
  // whereas the `.ts` output above has genuine per-import conditional logic
  // that only EJS was ever a good fit for). Wrapped in a 12-column grid
  // `<form>` — every render function's `class="${gridSpanClass(config)}"`
  // output is a `col-span-*` class, meaningless without a `grid` parent.
  tree.write(
    `${destDir}/${options.name}.html`,
    `<form [formGroup]="form" class="grid grid-cols-12 gap-4">\n${built.fieldsHtml}\n</form>\n`,
  );

  // The generated component's own UI-kit needs — computed from what's
  // actually imported (same `scanUiImports(tree, destDir)` + `components:ui`
  // pattern `auth`/`rbac`/`user-management` all use), not hardcoded. This
  // matters here specifically: unlike those three, nothing else in this
  // generator's own flow (no shell, no layout) would otherwise guarantee
  // `field`/`input`/`select`/etc. actually exist in the target project's
  // `src/app/shared/ui/` before the generated `.ts` imports from them —
  // skipping this would leave a real build failure waiting for whoever
  // generates a form using a component `preset`'s starter set didn't
  // already install. Anything already present is skipped by `ui` itself.
  const uiGenerator = loadUiGenerator();
  await uiGenerator(tree, {
    components: scanUiImports(tree, destDir).join(','),
    skipFormat: true,
    skipInstall: true,
  });

  appendToManifest(tree, appRoot, 'forms', options.name);

  await formatFiles(tree);
}
