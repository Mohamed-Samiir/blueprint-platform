jest.mock('./exec', () => ({
  ...jest.requireActual('./exec'),
  runGenerator: jest.fn(),
}));

import { runGenerator } from './exec';
import { listComponents, listLayouts, listModules } from './list';

const mockRunGenerator = runGenerator as unknown as jest.Mock;

describe('list', () => {
  beforeEach(() => {
    mockRunGenerator.mockReset();
  });

  describe('listLayouts', () => {
    it('runs foundation:layout --list against cwd and parses newline-separated names', async () => {
      mockRunGenerator.mockResolvedValue(
        'sidebar-shell\nfloating-shell\ninset-shell\ntopbar-shell',
      );
      const result = await listLayouts(undefined, '/proj');
      expect(mockRunGenerator).toHaveBeenCalledWith(
        '/proj',
        '@blueprint-platform/foundation:layout',
        ['--list'],
        undefined,
      );
      expect(result).toEqual(['sidebar-shell', 'floating-shell', 'inset-shell', 'topbar-shell']);
    });

    it('defaults cwd to process.cwd() when not given', async () => {
      mockRunGenerator.mockResolvedValue('sidebar-shell');
      await listLayouts();
      expect(mockRunGenerator).toHaveBeenCalledWith(
        process.cwd(),
        '@blueprint-platform/foundation:layout',
        ['--list'],
        undefined,
      );
    });
  });

  describe('listComponents', () => {
    it('runs components:ui --list and filters blank lines', async () => {
      mockRunGenerator.mockResolvedValue('button\n\naccordion\n');
      const result = await listComponents(undefined, '/proj');
      expect(mockRunGenerator).toHaveBeenCalledWith(
        '/proj',
        '@blueprint-platform/components:ui',
        ['--list'],
        undefined,
      );
      expect(result).toEqual(['button', 'accordion']);
    });
  });

  describe('listModules', () => {
    it('returns the fixed three-module list without shelling out (no real file-based catalog to discover)', async () => {
      const result = await listModules();
      expect(mockRunGenerator).not.toHaveBeenCalled();
      expect(result.map((m) => m.name).sort()).toEqual(['auth', 'rbac', 'user-management']);
      expect(
        result.every((m) => typeof m.description === 'string' && m.description.length > 0),
      ).toBe(true);
    });
  });
});
