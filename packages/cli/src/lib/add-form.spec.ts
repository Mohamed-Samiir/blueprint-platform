jest.mock('node:fs', () => ({ existsSync: jest.fn(() => true) }));
jest.mock('@clack/prompts', () => ({
  confirm: jest.fn(),
  text: jest.fn(),
  isCancel: jest.fn(() => false),
  cancel: jest.fn(),
  log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
}));
jest.mock('@blueprint-platform/cli-core', () => ({
  readManifest: jest.fn(),
  runForm: jest.fn(),
}));

import { confirm, isCancel, text } from '@clack/prompts';
import { readManifest, runForm } from '@blueprint-platform/cli-core';
import { addForm } from './add-form.js';

const mockText = text as unknown as jest.Mock;
const mockConfirm = confirm as unknown as jest.Mock;
const mockIsCancel = isCancel as unknown as jest.Mock;
const mockReadManifest = readManifest as unknown as jest.Mock;
const mockRunForm = runForm as unknown as jest.Mock;

describe('addForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCancel.mockReturnValue(false);
    mockReadManifest.mockReturnValue({ components: [], modules: [], layouts: [], forms: [] });
  });

  it('prompts for name, model, directory and calls runForm', async () => {
    mockText
      .mockResolvedValueOnce('user-form')
      .mockResolvedValueOnce('bp.models/user.ts')
      .mockResolvedValueOnce('features/users');
    await addForm('/proj', undefined);
    expect(mockRunForm).toHaveBeenCalledWith(
      '/proj',
      { name: 'user-form', model: 'bp.models/user.ts', directory: 'features/users' },
      undefined,
    );
  });

  it('asks before regenerating an existing form and stops on "no"', async () => {
    mockReadManifest.mockReturnValue({ forms: ['user-form'] });
    mockText.mockResolvedValueOnce('user-form');
    mockConfirm.mockResolvedValueOnce(false);
    await addForm('/proj', undefined);
    expect(mockRunForm).not.toHaveBeenCalled();
  });

  it('does nothing when cancelled at the first prompt', async () => {
    mockText.mockResolvedValueOnce(Symbol('cancel'));
    mockIsCancel.mockReturnValueOnce(true);
    await addForm('/proj', undefined);
    expect(mockRunForm).not.toHaveBeenCalled();
  });
});
