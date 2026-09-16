#!/usr/bin/env node
import { intro, log, outro } from '@clack/prompts';
import { addComponent } from './lib/add-component.js';
import { addLayout } from './lib/add-layout.js';
import { addModule } from './lib/add-module.js';

function usage(): never {
  console.error('Usage: blueprint add <layout|component|module>');
  process.exit(1);
}

async function main() {
  const [command, target] = process.argv.slice(2);
  if (command !== 'add' || !target) usage();

  const cwd = process.cwd();
  // Set BLUEPRINT_REGISTRY for local Verdaccio testing, e.g.
  // BLUEPRINT_REGISTRY=http://localhost:4873 npx blueprint add layout —
  // omitted entirely resolves through the real npm registry, matching the
  // generator conventions documented in command-reference.md.
  const registry = process.env.BLUEPRINT_REGISTRY;

  intro('blueprint add');

  try {
    switch (target) {
      case 'layout':
        await addLayout(cwd, registry);
        break;
      case 'component':
        await addComponent(cwd, registry);
        break;
      case 'module':
        await addModule(cwd, registry);
        break;
      default:
        usage();
    }
    outro('Done.');
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    outro('Failed.');
    process.exitCode = 1;
  }
}

main();
