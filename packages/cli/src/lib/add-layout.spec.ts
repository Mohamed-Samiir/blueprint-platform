jest.mock('@clack/prompts', () => ({
  select: jest.fn(),
  isCancel: jest.fn(() => false),
  cancel: jest.fn(),
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));

jest.mock('@blueprint-platform/cli-core', () => ({
  listLayouts: jest.fn(),
  readManifest: jest.fn(),
  runFoundationLayout: jest.fn(),
}));

import { cancel, isCancel, log, select } from '@clack/prompts';
import { listLayouts, readManifest, runFoundationLayout } from '@blueprint-platform/cli-core';
import { addLayout } from './add-layout.js';

const mockSelect = select as unknown as jest.Mock;
const mockIsCancel = isCancel as unknown as jest.Mock;
const mockListLayouts = listLayouts as unknown as jest.Mock;
const mockReadManifest = readManifest as unknown as jest.Mock;
const mockRunFoundationLayout = runFoundationLayout as unknown as jest.Mock;

describe('addLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCancel.mockReturnValue(false);
    mockListLayouts.mockResolvedValue(['sidebar-shell', 'floating-shell', 'inset-shell', 'topbar-shell']);
    mockReadManifest.mockReturnValue({ components: [], modules: [], layouts: [] });
  });

  it('prompts with the dynamically-listed layouts and runs the generator for the selected one', async () => {
    mockSelect.mockResolvedValue('sidebar-shell');
    await addLayout('/proj', undefined);

    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          { value: 'sidebar-shell', label: 'sidebar-shell', hint: undefined },
          { value: 'floating-shell', label: 'floating-shell', hint: undefined },
          { value: 'inset-shell', label: 'inset-shell', hint: undefined },
          { value: 'topbar-shell', label: 'topbar-shell', hint: undefined },
        ],
      }),
    );
    expect(mockRunFoundationLayout).toHaveBeenCalledWith('/proj', 'sidebar-shell', undefined);
  });

  it('marks an already-added layout with a hint but still offers it', async () => {
    mockReadManifest.mockReturnValue({ components: [], modules: [], layouts: ['sidebar-shell'] });
    mockSelect.mockResolvedValue('floating-shell');
    await addLayout('/proj', undefined);

    const options = mockSelect.mock.calls[0][0].options;
    expect(options.find((o: any) => o.value === 'sidebar-shell').hint).toBe('already added');
  });

  it('short-circuits with a clear message instead of re-running the generator when the choice is already added', async () => {
    mockReadManifest.mockReturnValue({ components: [], modules: [], layouts: ['sidebar-shell'] });
    mockSelect.mockResolvedValue('sidebar-shell');
    await addLayout('/proj', undefined);

    expect(mockRunFoundationLayout).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('already added'));
  });

  it('does nothing and does not call the generator when the prompt is cancelled', async () => {
    mockIsCancel.mockReturnValue(true);
    mockSelect.mockResolvedValue(Symbol('cancel'));
    await addLayout('/proj', undefined);

    expect(cancel).toHaveBeenCalled();
    expect(mockRunFoundationLayout).not.toHaveBeenCalled();
  });

  it('passes the registry through to both listLayouts and runFoundationLayout', async () => {
    mockSelect.mockResolvedValue('sidebar-shell');
    await addLayout('/proj', 'http://localhost:4873');

    expect(mockListLayouts).toHaveBeenCalledWith('http://localhost:4873', '/proj');
    expect(mockRunFoundationLayout).toHaveBeenCalledWith(
      '/proj',
      'sidebar-shell',
      'http://localhost:4873',
    );
  });
});
