import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { cancel, confirm, isCancel, log, spinner, text } from '@clack/prompts';
import { readManifest, runForm } from '@blueprint-platform/cli-core';

/**
 * `npx blueprint add form` — scaffold a reusable form component from a
 * developer-authored `bp.models/<name>.ts` file (`modules:form`). Unlike
 * layouts/components/modules there is no catalog to choose from: the model
 * file is the input, so this prompts for name, model path and destination.
 * The model path is checked for existence up front (the generator would
 * fail anyway, but with a far less friendly subprocess error).
 */
export async function addForm(cwd: string, registry: string | undefined): Promise<void> {
  const manifest = readManifest(cwd);
  const existing = new Set(Array.isArray(manifest?.['forms']) ? (manifest?.['forms'] as string[]) : []);

  const name = await text({
    message: 'Form name? (drives <name>.ts/.html/.scss and selector app-<name>)',
    placeholder: 'user-form',
    validate: (v) => (!v || !/^[a-z][a-z0-9-]*$/.test(v) ? 'Use kebab-case, e.g. user-form' : undefined),
  });
  if (isCancel(name)) return void cancel('Cancelled.');

  if (existing.has(name)) {
    const overwrite = await confirm({
      message: `A form named "${name}" was already generated. Generate again?`,
      initialValue: false,
    });
    if (isCancel(overwrite) || !overwrite) return void cancel('Cancelled.');
  }

  const model = await text({
    message: 'Path to the model file (relative to the project root)?',
    placeholder: `bp.models/${name}.ts`,
    initialValue: `bp.models/${name}.ts`,
    validate: (v) =>
      !v ? 'Required' : !existsSync(join(cwd, v)) ? `File not found: ${v}` : undefined,
  });
  if (isCancel(model)) return void cancel('Cancelled.');

  const directory = await text({
    message: 'Destination directory (relative to src/app/)?',
    placeholder: 'features/forms',
    initialValue: 'features/forms',
  });
  if (isCancel(directory)) return void cancel('Cancelled.');

  const s = spinner();
  s.start(`Generating form "${name}"...`);
  try {
    await runForm(cwd, { name, model, directory: directory || undefined }, registry);
    s.stop(`Generated form "${name}".`);
    log.info(`Import it from src/app/${directory || 'features/forms'}/${name}/${name}.ts`);
  } catch (err) {
    s.stop(`Failed to generate form "${name}".`);
    throw err;
  }
}
