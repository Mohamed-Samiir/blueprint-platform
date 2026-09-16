import { cancel, isCancel, log, select, spinner } from '@clack/prompts';
import { listLayouts, readManifest, runFoundationLayout } from '@blueprint-platform/cli-core';

/**
 * `npx blueprint add layout` — prompt for one of the four real app-shell
 * names (via `listLayouts`, which already excludes `auth-split`/
 * `auth-centered` per the generator's own `--list` — this package never
 * hardcodes the catalog, so it can't go stale the way a copy-pasted list
 * would). Already-added shells are still offered (a project could
 * legitimately want to inspect the option again) but marked with a hint, and
 * choosing one short-circuits with a clear message instead of silently
 * re-running the generator.
 */
export async function addLayout(cwd: string, registry: string | undefined): Promise<void> {
  const manifest = readManifest(cwd);
  const already = new Set(manifest?.layouts ?? []);

  const layouts = await listLayouts(registry, cwd);
  if (layouts.length === 0) {
    log.error('No layouts are available — is this a Blueprint project with foundation installed?');
    return;
  }

  const name = await select({
    message: 'Which layout shell do you want to add?',
    options: layouts.map((l) => ({
      value: l,
      label: l,
      hint: already.has(l) ? 'already added' : undefined,
    })),
  });

  if (isCancel(name)) {
    cancel('Cancelled.');
    return;
  }

  if (already.has(name)) {
    log.warn(`"${name}" is already added to this project — nothing to do.`);
    return;
  }

  const s = spinner();
  s.start(`Adding layout "${name}"...`);
  try {
    await runFoundationLayout(cwd, name, registry);
    s.stop(`Added layout "${name}".`);
  } catch (err) {
    s.stop(`Failed to add layout "${name}".`);
    throw err;
  }
}
