import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface BlueprintManifest {
  components: string[];
  modules: string[];
  layouts: string[];
  [key: string]: unknown;
}

/**
 * `.blueprint/manifest.json` is the generated project's own source of truth
 * for "what's already installed" — both CLI binaries read this first to
 * avoid re-prompting for (or silently re-adding) something already present,
 * rather than relying on each generator's own idempotency no-op alone (which
 * happens, but gives the user no feedback about *why* nothing changed).
 * Returns `null` if the manifest doesn't exist or isn't valid JSON — never
 * throws, since "no manifest yet" is a normal state for a directory that
 * isn't actually a generated Blueprint project.
 */
export function readManifest(cwd: string): BlueprintManifest | null {
  const path = join(cwd, '.blueprint', 'manifest.json');
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    return {
      components: Array.isArray(parsed.components) ? parsed.components : [],
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
      layouts: Array.isArray(parsed.layouts) ? parsed.layouts : [],
      ...parsed,
    };
  } catch {
    return null;
  }
}
