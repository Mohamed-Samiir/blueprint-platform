jest.mock('@clack/prompts', () => ({
  select: jest.fn(),
  confirm: jest.fn(),
  text: jest.fn(),
  isCancel: jest.fn(() => false),
  cancel: jest.fn(),
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));

jest.mock('@blueprint-platform/cli-core', () => ({
  listModules: jest.fn(),
  readManifest: jest.fn(),
  runModule: jest.fn(),
}));

import { confirm, isCancel, log, select, text } from '@clack/prompts';
import { listModules, readManifest, runModule } from '@blueprint-platform/cli-core';
import { addModule } from './add-module.js';

const mockSelect = select as unknown as jest.Mock;
const mockConfirm = confirm as unknown as jest.Mock;
const mockText = text as unknown as jest.Mock;
const mockIsCancel = isCancel as unknown as jest.Mock;
const mockListModules = listModules as unknown as jest.Mock;
const mockReadManifest = readManifest as unknown as jest.Mock;
const mockRunModule = runModule as unknown as jest.Mock;

const MODULES = [
  { name: 'auth', description: 'auth desc' },
  { name: 'rbac', description: 'rbac desc' },
  { name: 'user-management', description: 'um desc' },
];

describe('addModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCancel.mockReturnValue(false);
    mockListModules.mockResolvedValue(MODULES);
    mockReadManifest.mockReturnValue({ components: [], modules: [], layouts: [] });
  });

  it('rbac: prompts only for routePrefix and passes it through as a flag', async () => {
    mockSelect.mockResolvedValueOnce('rbac');
    mockText.mockResolvedValueOnce('admin');
    await addModule('/proj', undefined);

    expect(mockRunModule).toHaveBeenCalledWith('/proj', 'rbac', { routePrefix: 'admin' }, undefined);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('user-management: prompts for routePrefix with its own default', async () => {
    mockSelect.mockResolvedValueOnce('user-management');
    mockText.mockResolvedValueOnce('admin/users');
    await addModule('/proj', undefined);

    expect(mockText).toHaveBeenCalledWith(
      expect.objectContaining({ initialValue: 'admin/users' }),
    );
    expect(mockRunModule).toHaveBeenCalledWith(
      '/proj',
      'user-management',
      { routePrefix: 'admin/users' },
      undefined,
    );
  });

  it('auth: surfaces all six flag prompts and assembles them into the run call', async () => {
    mockSelect
      .mockResolvedValueOnce('auth') // module choice
      .mockResolvedValueOnce('session') // authType
      .mockResolvedValueOnce('memory') // storeType
      .mockResolvedValueOnce('centered'); // authLayout
    mockConfirm
      .mockResolvedValueOnce(false) // includeSignup
      .mockResolvedValueOnce(true) // includeForgotPassword
      .mockResolvedValueOnce(false); // includeChangePassword

    await addModule('/proj', undefined);

    expect(mockRunModule).toHaveBeenCalledWith(
      '/proj',
      'auth',
      {
        authType: 'session',
        storeType: 'memory',
        authLayout: 'centered',
        includeSignup: false,
        includeForgotPassword: true,
        includeChangePassword: false,
      },
      undefined,
    );
  });

  it('short-circuits with a clear message and never prompts flags when the module is already added', async () => {
    mockReadManifest.mockReturnValue({ components: [], modules: ['rbac'], layouts: [] });
    mockSelect.mockResolvedValueOnce('rbac');
    await addModule('/proj', undefined);

    expect(mockRunModule).not.toHaveBeenCalled();
    expect(mockText).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('already added'));
  });

  it('does nothing when the module choice itself is cancelled', async () => {
    mockIsCancel.mockReturnValueOnce(true);
    mockSelect.mockResolvedValueOnce(Symbol('cancel'));
    await addModule('/proj', undefined);
    expect(mockRunModule).not.toHaveBeenCalled();
  });

  it('does nothing when an auth flag prompt is cancelled partway through', async () => {
    mockSelect
      .mockResolvedValueOnce('auth')
      .mockResolvedValueOnce('jwt')
      .mockResolvedValueOnce('local')
      .mockResolvedValueOnce(Symbol('cancel')); // authLayout cancelled
    mockIsCancel.mockImplementation((v: unknown) => typeof v === 'symbol');

    await addModule('/proj', undefined);
    expect(mockRunModule).not.toHaveBeenCalled();
  });
});
