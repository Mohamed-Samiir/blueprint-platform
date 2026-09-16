import { execFile } from 'node:child_process';

jest.mock('node:child_process');

import { flagsToArgs, npmView, runGenerator } from './exec';

const mockExecFile = execFile as unknown as jest.Mock;

// exec.ts's `run()` always passes the bare command name — `shell: true` (win32
// only) is what lets Windows interpret npx.cmd/npm.cmd, not a renamed binary.
const SHELL_ON_WIN32 = process.platform === 'win32';

function mockSuccess(stdout: string) {
  mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
    cb(null, stdout, '');
  });
}

function mockFailure(message: string, stderr = '') {
  mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
    cb(new Error(message), '', stderr);
  });
}

describe('exec', () => {
  beforeEach(() => {
    mockExecFile.mockReset();
  });

  describe('runGenerator', () => {
    it('runs `nx g <generator> [args] --no-interactive` in the given cwd', async () => {
      mockSuccess('ok');
      await runGenerator('/some/project', '@blueprint-platform/foundation:layout', [
        '--name=sidebar-shell',
      ]);
      const [cmd, args, opts] = mockExecFile.mock.calls[0];
      expect(cmd).toBe('npx');
      expect(args).toEqual([
        'nx',
        'g',
        '@blueprint-platform/foundation:layout',
        '--name=sidebar-shell',
        '--no-interactive',
      ]);
      expect(opts.cwd).toBe('/some/project');
      expect(opts.shell).toBe(SHELL_ON_WIN32);
    });

    it('appends the scoped registry-override flag when a registry is given', async () => {
      mockSuccess('ok');
      await runGenerator('/p', '@blueprint-platform/modules:rbac', [], 'http://localhost:4873');
      const [, args] = mockExecFile.mock.calls[0];
      expect(args).toContain('--@blueprint-platform:registry=http://localhost:4873');
    });

    it('strips NX_WORKSPACE_ROOT_PATH from the child env even if this process has it set', async () => {
      mockSuccess('ok');
      const original = process.env.NX_WORKSPACE_ROOT_PATH;
      process.env.NX_WORKSPACE_ROOT_PATH = 'D:\\blueprint-platform';
      try {
        await runGenerator('/p', '@blueprint-platform/foundation:layout', ['--name=x']);
        const [, , opts] = mockExecFile.mock.calls[0];
        expect(opts.env.NX_WORKSPACE_ROOT_PATH).toBeUndefined();
      } finally {
        if (original === undefined) delete process.env.NX_WORKSPACE_ROOT_PATH;
        else process.env.NX_WORKSPACE_ROOT_PATH = original;
      }
    });

    it('rejects with a descriptive error on failure', async () => {
      mockFailure('boom', 'stderr detail');
      await expect(runGenerator('/p', 'x:y', [])).rejects.toThrow(/boom/);
    });
  });

  describe('npmView', () => {
    it('runs `npm view <spec> [args]` and trims the result', async () => {
      mockSuccess('0.1.36\n');
      const result = await npmView('@blueprint-platform/foundation', ['dist-tags.latest']);
      expect(result).toBe('0.1.36');
      const [cmd, args] = mockExecFile.mock.calls[0];
      expect(cmd).toBe('npm');
      expect(args).toEqual(['view', '@blueprint-platform/foundation', 'dist-tags.latest']);
    });
  });

  describe('flagsToArgs', () => {
    it('turns a flat object into --key=value argv entries', () => {
      expect(flagsToArgs({ authType: 'jwt', includeSignup: false })).toEqual([
        '--authType=jwt',
        '--includeSignup=false',
      ]);
    });

    it('skips undefined and null values', () => {
      expect(flagsToArgs({ a: 'x', b: undefined, c: null })).toEqual(['--a=x']);
    });
  });
});
