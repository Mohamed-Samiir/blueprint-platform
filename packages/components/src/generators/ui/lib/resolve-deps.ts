import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * The bundled component sources. At runtime this file is
 * `dist/generators/ui/lib/resolve-deps.js`, so the payload sits one level up.
 */
export const UI_FILES_DIR = join(__dirname, '..', 'files', 'shared', 'ui');

/**
 * Components with no `src/index.ts` barrel — copied as a single flat file and
 * consumed via relative imports, so they never get a `@blueprint-platform/ui/<name>`
 * tsconfig path.
 */
export const FLAT_COMPONENTS = ['user-menu', 'theme-switcher', 'language-switcher'];

/** Every component folder that ships with the package. */
export function listAllComponents(): string[] {
  return readdirSync(UI_FILES_DIR).filter((name) =>
    statSync(join(UI_FILES_DIR, name)).isDirectory(),
  );
}

export function componentExists(name: string): boolean {
  return existsSync(join(UI_FILES_DIR, name));
}

function tsFilesOf(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFilesOf(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** Direct in-kit dependencies of one component. */
export function directDeps(name: string): string[] {
  const deps = new Set<string>();
  for (const file of tsFilesOf(join(UI_FILES_DIR, name))) {
    const src = readFileSync(file, 'utf-8');
    // `@blueprint-platform/ui/<dep>` — the aliased barrel imports.
    for (const m of src.matchAll(/@blueprint-platform\/ui\/([a-z0-9-]+)/g)) {
      if (m[1] !== name) deps.add(m[1]);
    }
    // Flat-family siblings imported relatively, e.g. `from '../theme-switcher/theme-switcher'`.
    for (const m of src.matchAll(/from\s+['"]\.\.\/([a-z0-9-]+)\/[^'"]+['"]/g)) {
      if (m[1] !== name && componentExists(m[1])) deps.add(m[1]);
    }
  }
  return [...deps];
}

/**
 * Breadth-first transitive closure of the requested components over their
 * in-kit dependencies. Unknown names are returned in `missing`.
 */
export function resolveClosure(requested: string[]): {
  closure: string[];
  missing: string[];
} {
  const missing = requested.filter((n) => !componentExists(n));
  const seen = new Set<string>();
  const queue = requested.filter((n) => componentExists(n));
  while (queue.length) {
    const name = queue.shift() as string;
    if (seen.has(name)) continue;
    seen.add(name);
    for (const dep of directDeps(name)) if (!seen.has(dep)) queue.push(dep);
  }
  return { closure: [...seen], missing };
}
