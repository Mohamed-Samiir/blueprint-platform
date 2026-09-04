import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { UI_FILES_DIR } from './resolve-deps';

/**
 * npm packages a synced UI component may import, mapped to the range the
 * generated project should pin. `@spartan-ng/brain` covers every `@spartan-ng/brain/*`
 * subpath (one package, many entry points). `@angular/*`, `clsx` type-only, `rxjs`
 * etc. are provided by the Angular app itself and are intentionally absent.
 */
export const UI_NPM_DEPS: Record<string, string> = {
  '@spartan-ng/brain': '^1.0.0',
  '@ng-icons/core': '^32.0.0',
  '@ng-icons/lucide': '^32.0.0',
  'class-variance-authority': '^0.7.0',
  clsx: '^2.1.0',
  'tailwind-merge': '^2.5.0',
  'embla-carousel': '^8.0.0',
  'embla-carousel-angular': '^22.0.0',
  'ngx-scrollbar': '^19.1.0',
};

/** Bare module specifiers matched against `from '<spec>'` in a component's source. */
const SPECIFIER_TO_PKG: { test: RegExp; pkg: string }[] = [
  { test: /^@spartan-ng\/brain(\/|$)/, pkg: '@spartan-ng/brain' },
  { test: /^@ng-icons\/core(\/|$)/, pkg: '@ng-icons/core' },
  { test: /^@ng-icons\/lucide(\/|$)/, pkg: '@ng-icons/lucide' },
  { test: /^class-variance-authority(\/|$)/, pkg: 'class-variance-authority' },
  { test: /^clsx(\/|$)/, pkg: 'clsx' },
  { test: /^tailwind-merge(\/|$)/, pkg: 'tailwind-merge' },
  { test: /^embla-carousel-angular(\/|$)/, pkg: 'embla-carousel-angular' },
  { test: /^embla-carousel(\/|$)/, pkg: 'embla-carousel' },
  { test: /^ngx-scrollbar(\/|$)/, pkg: 'ngx-scrollbar' },
];

const IMPORT_RE = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g;

function tsFilesOf(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFilesOf(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * Scan the given components' source for third-party imports and return the
 * `{ package: range }` map the generated project needs. Only real `from '...'`
 * specifiers count — doc-comment mentions do not.
 */
export function npmDepsForComponents(names: string[]): Record<string, string> {
  const found = new Set<string>();
  for (const name of names) {
    for (const file of tsFilesOf(join(UI_FILES_DIR, name))) {
      const src = readFileSync(file, 'utf-8');
      let m: RegExpExecArray | null;
      while ((m = IMPORT_RE.exec(src)) !== null) {
        const spec = m[1];
        const hit = SPECIFIER_TO_PKG.find((s) => s.test.test(spec));
        if (hit) found.add(hit.pkg);
      }
    }
  }
  const result: Record<string, string> = {};
  for (const pkg of found) result[pkg] = UI_NPM_DEPS[pkg];
  return result;
}
