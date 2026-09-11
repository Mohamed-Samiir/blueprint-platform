import { Tree, readJson, writeJson } from '@nx/devkit';

export type ManifestCategory = 'components' | 'modules' | 'layouts';

/**
 * Ensure `.blueprint/manifest.json`'s `<category>` array contains `entry`
 * (idempotent — already-present is a no-op; result is sorted, matching the
 * merge behaviour this generalizes). A no-op if the manifest doesn't exist
 * (e.g. this generator was pointed at a project foundation never generated).
 *
 * Generalized from the hand-written read/ensure-array/push/write JSON pattern
 * repeated at every "record what I just added" call site.
 */
export function appendToManifest(
  tree: Tree,
  appRoot: string,
  category: ManifestCategory,
  entry: string,
) {
  const path = `${appRoot}/.blueprint/manifest.json`;
  if (!tree.exists(path)) return;

  const manifest = readJson<Record<string, unknown>>(tree, path);
  const current = Array.isArray(manifest[category])
    ? (manifest[category] as string[])
    : [];
  if (!current.includes(entry)) {
    manifest[category] = [...current, entry].sort();
    writeJson(tree, path, manifest);
  }
}
