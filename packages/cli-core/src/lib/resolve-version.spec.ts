jest.mock('./exec');

import { npmView } from './exec';
import { resolveFoundationVersion } from './resolve-version';

const mockNpmView = npmView as unknown as jest.Mock;

describe('resolveFoundationVersion', () => {
  beforeEach(() => {
    mockNpmView.mockReset();
  });

  it('returns the version a dist-tag currently points to', async () => {
    mockNpmView.mockResolvedValue('0.1.36');
    const version = await resolveFoundationVersion('latest');
    expect(version).toBe('0.1.36');
    expect(mockNpmView).toHaveBeenCalledWith(
      '@blueprint-platform/foundation',
      ['dist-tags.latest'],
      undefined,
    );
  });

  it('passes the registry through', async () => {
    mockNpmView.mockResolvedValue('0.1.33');
    await resolveFoundationVersion('stable', 'http://localhost:4873');
    expect(mockNpmView).toHaveBeenCalledWith(
      '@blueprint-platform/foundation',
      ['dist-tags.stable'],
      'http://localhost:4873',
    );
  });

  it('throws a clear error when the tag resolves to nothing', async () => {
    mockNpmView.mockResolvedValue('');
    await expect(resolveFoundationVersion('stable')).rejects.toThrow(/no "stable" dist-tag/);
  });
});
