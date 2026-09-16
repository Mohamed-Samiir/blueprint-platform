jest.mock('./exec', () => ({
  ...jest.requireActual('./exec'),
  runGenerator: jest.fn(),
}));

import { runGenerator } from './exec';
import { runComponentsUi, runFoundationLayout, runModule } from './run-generators';

const mockRunGenerator = runGenerator as unknown as jest.Mock;

describe('run-generators', () => {
  beforeEach(() => {
    mockRunGenerator.mockReset();
    mockRunGenerator.mockResolvedValue('');
  });

  it('runFoundationLayout calls foundation:layout with --name', async () => {
    await runFoundationLayout('/proj', 'sidebar-shell', 'http://localhost:4873');
    expect(mockRunGenerator).toHaveBeenCalledWith(
      '/proj',
      '@blueprint-platform/foundation:layout',
      ['--name=sidebar-shell'],
      'http://localhost:4873',
    );
  });

  it('runComponentsUi joins component names with a comma', async () => {
    await runComponentsUi('/proj', ['carousel', 'accordion']);
    expect(mockRunGenerator).toHaveBeenCalledWith(
      '/proj',
      '@blueprint-platform/components:ui',
      ['--components=carousel,accordion'],
      undefined,
    );
  });

  it('runModule spreads flags into --key=value argv for the right generator', async () => {
    await runModule('/proj', 'auth', { authType: 'session', includeSignup: false });
    expect(mockRunGenerator).toHaveBeenCalledWith(
      '/proj',
      '@blueprint-platform/modules:auth',
      ['--authType=session', '--includeSignup=false'],
      undefined,
    );
  });

  it('runModule works for rbac/user-management with no flags too', async () => {
    await runModule('/proj', 'rbac', {});
    expect(mockRunGenerator).toHaveBeenCalledWith(
      '/proj',
      '@blueprint-platform/modules:rbac',
      [],
      undefined,
    );
  });
});
