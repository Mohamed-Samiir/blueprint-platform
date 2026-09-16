import { cancel, isCancel, log, multiselect, spinner } from '@clack/prompts';
import { listComponents, readManifest, runComponentsUi } from '@blueprint-platform/cli-core';

/**
 * `npx blueprint add component` — multi-select over the real, dynamically
 * discovered UI-kit catalog (`listComponents`, never hardcoded here — see
 * `addLayout`'s doc comment for why). Already-added components stay
 * selectable (marked with a hint) but are filtered out of the actual
 * `runComponentsUi` call rather than re-added — the underlying generator is
 * idempotent anyway, but skipping avoids a pointless subprocess round trip
 * and lets this print a clearer "already added, skipping: X" message.
 */
export async function addComponent(cwd: string, registry: string | undefined): Promise<void> {
  const manifest = readManifest(cwd);
  const already = new Set(manifest?.components ?? []);

  const components = await listComponents(registry, cwd);
  if (components.length === 0) {
    log.error('No components are available — is this a Blueprint project with components installed?');
    return;
  }

  const selected = await multiselect({
    message: 'Which UI component(s) do you want to add?',
    options: components.map((c) => ({
      value: c,
      label: c,
      hint: already.has(c) ? 'already added' : undefined,
    })),
    required: true,
  });

  if (isCancel(selected)) {
    cancel('Cancelled.');
    return;
  }

  const toAdd = selected.filter((c) => !already.has(c));
  const skipped = selected.filter((c) => already.has(c));

  if (skipped.length > 0) {
    log.warn(`Already added, skipping: ${skipped.join(', ')}`);
  }
  if (toAdd.length === 0) {
    log.info('Nothing new to add.');
    return;
  }

  const s = spinner();
  s.start(`Adding ${toAdd.join(', ')}...`);
  try {
    await runComponentsUi(cwd, toAdd, registry);
    s.stop(`Added ${toAdd.join(', ')}.`);
  } catch (err) {
    s.stop('Failed to add components.');
    throw err;
  }
}
