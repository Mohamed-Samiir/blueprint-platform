jest.mock('@clack/prompts', () => ({
  multiselect: jest.fn(),
  isCancel: jest.fn(() => false),
  cancel: jest.fn(),
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));

jest.mock('@blueprint-platform/cli-core', () => ({
  listComponents: jest.fn(),
  readManifest: jest.fn(),
  runComponentsUi: jest.fn(),
}));

import { isCancel, log, multiselect } from '@clack/prompts';
import { listComponents, readManifest, runComponentsUi } from '@blueprint-platform/cli-core';
import { addComponent } from './add-component.js';

const mockMultiselect = multiselect as unknown as jest.Mock;
const mockIsCancel = isCancel as unknown as jest.Mock;
const mockListComponents = listComponents as unknown as jest.Mock;
const mockReadManifest = readManifest as unknown as jest.Mock;
const mockRunComponentsUi = runComponentsUi as unknown as jest.Mock;

describe('addComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCancel.mockReturnValue(false);
    mockListComponents.mockResolvedValue(['button', 'carousel', 'accordion']);
    mockReadManifest.mockReturnValue({ components: [], modules: [], layouts: [] });
  });

  it('adds every newly-selected component in one call', async () => {
    mockMultiselect.mockResolvedValue(['button', 'carousel']);
    await addComponent('/proj', undefined);
    expect(mockRunComponentsUi).toHaveBeenCalledWith('/proj', ['button', 'carousel'], undefined);
  });

  it('filters out already-added selections and warns about them, still adding the rest', async () => {
    mockReadManifest.mockReturnValue({ components: ['button'], modules: [], layouts: [] });
    mockMultiselect.mockResolvedValue(['button', 'carousel']);
    await addComponent('/proj', undefined);

    expect(mockRunComponentsUi).toHaveBeenCalledWith('/proj', ['carousel'], undefined);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('button'));
  });

  it('calls the generator with nothing when every selected component is already added', async () => {
    mockReadManifest.mockReturnValue({ components: ['button', 'carousel'], modules: [], layouts: [] });
    mockMultiselect.mockResolvedValue(['button', 'carousel']);
    await addComponent('/proj', undefined);

    expect(mockRunComponentsUi).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Nothing new'));
  });

  it('does nothing when cancelled', async () => {
    mockIsCancel.mockReturnValue(true);
    mockMultiselect.mockResolvedValue(Symbol('cancel'));
    await addComponent('/proj', undefined);
    expect(mockRunComponentsUi).not.toHaveBeenCalled();
  });
});
