import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readManifest } from './manifest';

describe('readManifest', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bp-cli-core-manifest-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when there is no .blueprint/manifest.json', () => {
    expect(readManifest(dir)).toBeNull();
  });

  it('returns null when the file is not valid JSON', () => {
    mkdirSync(join(dir, '.blueprint'));
    writeFileSync(join(dir, '.blueprint', 'manifest.json'), '{not json');
    expect(readManifest(dir)).toBeNull();
  });

  it('reads and returns the manifest, defaulting missing arrays to []', () => {
    mkdirSync(join(dir, '.blueprint'));
    writeFileSync(
      join(dir, '.blueprint', 'manifest.json'),
      JSON.stringify({ components: ['button'], modules: ['rbac'], layouts: ['sidebar-shell'] }),
    );
    const manifest = readManifest(dir);
    expect(manifest).toEqual({
      components: ['button'],
      modules: ['rbac'],
      layouts: ['sidebar-shell'],
    });
  });

  it('defaults components/modules/layouts to [] when absent from an otherwise-valid manifest', () => {
    mkdirSync(join(dir, '.blueprint'));
    writeFileSync(join(dir, '.blueprint', 'manifest.json'), JSON.stringify({ palette: 'default' }));
    const manifest = readManifest(dir);
    expect(manifest?.components).toEqual([]);
    expect(manifest?.modules).toEqual([]);
    expect(manifest?.layouts).toEqual([]);
    expect(manifest?.palette).toBe('default');
  });
});
