import { cancel, confirm, isCancel, log, select, spinner, text } from '@clack/prompts';
import { listModules, readManifest, runModule } from '@blueprint-platform/cli-core';

type ModuleName = 'auth' | 'rbac' | 'user-management';

/** The `authType`/`storeType`/`authLayout`/`include*` flag prompts — the first CLI surface actually exposing these interactively, per the task's own instruction. Defaults match the generator's own schema defaults exactly. */
async function promptAuthFlags(): Promise<Record<string, unknown> | symbol> {
  const authType = await select({
    message: 'Auth strategy?',
    options: [
      { value: 'jwt', label: 'jwt', hint: 'access/refresh token pair, Authorization header' },
      { value: 'session', label: 'session', hint: 'opaque session id via X-Session-Id' },
    ],
    initialValue: 'jwt',
  });
  if (isCancel(authType)) return authType;

  const storeType = await select({
    message: 'Where should tokens live?',
    options: [
      { value: 'local', label: 'local', hint: 'localStorage, survives reload' },
      { value: 'memory', label: 'memory', hint: 'in-memory only, recommended for production' },
    ],
    initialValue: 'local',
  });
  if (isCancel(storeType)) return storeType;

  const authLayout = await select({
    message: 'Which auth layout?',
    options: [
      { value: 'split', label: 'split', hint: 'two-pane brand panel' },
      { value: 'centered', label: 'centered', hint: 'single centered card' },
    ],
    initialValue: 'split',
  });
  if (isCancel(authLayout)) return authLayout;

  const includeSignup = await confirm({ message: 'Include the signup form?', initialValue: true });
  if (isCancel(includeSignup)) return includeSignup;

  const includeForgotPassword = await confirm({
    message: 'Include the forgot-password flow?',
    initialValue: true,
  });
  if (isCancel(includeForgotPassword)) return includeForgotPassword;

  const includeChangePassword = await confirm({
    message: 'Include the change-password form?',
    initialValue: true,
  });
  if (isCancel(includeChangePassword)) return includeChangePassword;

  return { authType, storeType, authLayout, includeSignup, includeForgotPassword, includeChangePassword };
}

async function promptRoutePrefix(defaultValue: string): Promise<Record<string, unknown> | symbol> {
  const routePrefix = await text({
    message: 'Route prefix?',
    placeholder: defaultValue,
    initialValue: defaultValue,
  });
  if (isCancel(routePrefix)) return routePrefix;
  return routePrefix ? { routePrefix } : {};
}

/**
 * `npx blueprint add module` — single-select over the fixed three-module
 * list (`listModules` — no real catalog to discover dynamically, see
 * `cli-core`'s own documented judgment call on this). Already-added modules
 * stay selectable (marked with a hint) but short-circuit with a clear
 * message rather than re-running the generator — modules aren't meant to be
 * added twice (each generator's own manifest check would just no-op with a
 * log line the user would otherwise never see, since this CLI doesn't stream
 * the underlying `nx g` process's own stdout live).
 */
export async function addModule(cwd: string, registry: string | undefined): Promise<void> {
  const manifest = readManifest(cwd);
  const already = new Set(manifest?.modules ?? []);

  const modules = await listModules(registry);

  const name = await select({
    message: 'Which module do you want to add?',
    options: modules.map((m) => ({
      value: m.name,
      label: m.name,
      hint: already.has(m.name) ? 'already added' : m.description,
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

  let flags: Record<string, unknown> = {};

  if (name === 'auth') {
    const result = await promptAuthFlags();
    if (isCancel(result)) {
      cancel('Cancelled.');
      return;
    }
    flags = result as Record<string, unknown>;
  } else if (name === 'rbac') {
    const result = await promptRoutePrefix('admin');
    if (isCancel(result)) {
      cancel('Cancelled.');
      return;
    }
    flags = result as Record<string, unknown>;
  } else if (name === 'user-management') {
    const result = await promptRoutePrefix('admin/users');
    if (isCancel(result)) {
      cancel('Cancelled.');
      return;
    }
    flags = result as Record<string, unknown>;
  }

  const s = spinner();
  s.start(`Adding module "${name}"...`);
  try {
    await runModule(cwd, name as ModuleName, flags, registry);
    s.stop(`Added module "${name}".`);
  } catch (err) {
    s.stop(`Failed to add module "${name}".`);
    throw err;
  }
}
