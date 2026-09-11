import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { appendToManifest } from './append-to-manifest';

describe('appendToManifest', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('is a no-op if .blueprint/manifest.json does not exist', () => {
    expect(() => appendToManifest(tree, '.', 'layouts', 'sidebar-shell')).not.toThrow();
    expect(tree.exists('.blueprint/manifest.json')).toBe(false);
  });

  it('creates the category array and adds the entry', () => {
    writeJson(tree, '.blueprint/manifest.json', { components: [] });
    appendToManifest(tree, '.', 'layouts', 'sidebar-shell');
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.layouts).toEqual(['sidebar-shell']);
  });

  it('is idempotent — adding the same entry twice does not duplicate it', () => {
    writeJson(tree, '.blueprint/manifest.json', { layouts: ['sidebar-shell'] });
    appendToManifest(tree, '.', 'layouts', 'sidebar-shell');
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.layouts).toEqual(['sidebar-shell']);
  });

  it('sorts the resulting array', () => {
    writeJson(tree, '.blueprint/manifest.json', { components: ['switch'] });
    appendToManifest(tree, '.', 'components', 'button');
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.components).toEqual(['button', 'switch']);
  });

  it('keeps categories independent of each other', () => {
    writeJson(tree, '.blueprint/manifest.json', { components: ['button'], modules: [] });
    appendToManifest(tree, '.', 'layouts', 'sidebar-shell');
    const manifest = readJson(tree, '.blueprint/manifest.json');
    expect(manifest.components).toEqual(['button']);
    expect(manifest.modules).toEqual([]);
    expect(manifest.layouts).toEqual(['sidebar-shell']);
  });
});
