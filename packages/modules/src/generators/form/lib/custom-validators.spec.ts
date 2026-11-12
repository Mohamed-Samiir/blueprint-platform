import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';

/**
 * `custom-validators.ts.template` is generator payload (shipped into the
 * generated project, never compiled by `modules` itself — it'd need
 * `@angular/forms`). To test its REAL behavior rather than just its text, this
 * transpiles the template and evaluates it. Its only import is `import type`
 * (erased), so it needs no `@angular/forms` at runtime — validators are plain
 * functions over `{ value }`-shaped controls.
 */
function loadValidators(): Record<string, (arg: any) => (c: { value: unknown }) => Record<string, unknown> | null> {
  const source = readFileSync(join(__dirname, '../files/shared/custom-validators.ts.template'), 'utf-8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } })
    .outputText;
  const exports: Record<string, any> = {};
  new Function('exports', 'require', js)(exports, require);
  return exports;
}

const v = loadValidators();
const ctl = (value: unknown) => ({ value });
const file = (name: string, size: number) => ({ name, size }) as unknown as File;

describe('custom-validators', () => {
  describe('minDate / maxDate', () => {
    it('flags dates outside the bound, under the validator\'s own error key', () => {
      expect(v['minDateValidator']('2024-01-10')(ctl(new Date('2024-01-05')))).toHaveProperty('minDate');
      expect(v['minDateValidator']('2024-01-10')(ctl(new Date('2024-01-15')))).toBeNull();
      expect(v['maxDateValidator']('2024-01-10')(ctl(new Date('2024-01-15')))).toHaveProperty('maxDate');
      expect(v['maxDateValidator']('2024-01-10')(ctl(new Date('2024-01-05')))).toBeNull();
    });

    it("compares 'HH:mm' time strings (timePicker) numerically, not as dates", () => {
      expect(v['minDateValidator']('09:00')(ctl('08:30'))).toHaveProperty('minDate');
      expect(v['minDateValidator']('09:00')(ctl('09:30'))).toBeNull();
      expect(v['maxDateValidator']('17:00')(ctl('17:01'))).toHaveProperty('maxDate');
    });

    it('treats an empty value as valid (pair with required to forbid it)', () => {
      for (const empty of [null, '', undefined]) {
        expect(v['minDateValidator']('2024-01-10')(ctl(empty))).toBeNull();
      }
    });
  });

  describe('date range days', () => {
    const range = (a: string, b: string) => ctl([new Date(a), new Date(b)]);
    it('counts an inclusive day span', () => {
      expect(v['minRangeDaysValidator'](3)(range('2024-01-01', '2024-01-02'))).toHaveProperty('minRangeDays');
      expect(v['minRangeDaysValidator'](3)(range('2024-01-01', '2024-01-03'))).toBeNull();
      expect(v['maxRangeDaysValidator'](3)(range('2024-01-01', '2024-01-05'))).toHaveProperty('maxRangeDays');
      expect(v['maxRangeDaysValidator'](3)(range('2024-01-01', '2024-01-03'))).toBeNull();
    });
    it('ignores a null / incomplete range', () => {
      expect(v['minRangeDaysValidator'](3)(ctl(null))).toBeNull();
      expect(v['maxRangeDaysValidator'](3)(ctl([new Date('2024-01-01'), null]))).toBeNull();
    });
  });

  describe('selection counts', () => {
    it('minSelected flags a non-empty selection that is too small, ignores empty', () => {
      expect(v['minSelectedValidator'](2)(ctl(['a']))).toHaveProperty('minSelected');
      expect(v['minSelectedValidator'](2)(ctl(['a', 'b']))).toBeNull();
      expect(v['minSelectedValidator'](2)(ctl([]))).toBeNull();
    });
    it('maxSelected flags too many', () => {
      expect(v['maxSelectedValidator'](2)(ctl(['a', 'b', 'c']))).toHaveProperty('maxSelected');
      expect(v['maxSelectedValidator'](2)(ctl(['a']))).toBeNull();
    });
  });

  describe('attachment', () => {
    it('maxFileSizeMb flags an oversize file', () => {
      expect(v['maxFileSizeValidator'](1)(ctl([file('big.pdf', 2 * 1024 * 1024)]))).toHaveProperty('maxFileSizeMb');
      expect(v['maxFileSizeValidator'](1)(ctl([file('ok.pdf', 100)]))).toBeNull();
      expect(v['maxFileSizeValidator'](1)(ctl(null))).toBeNull();
    });
    it('allowedExtensions is case-insensitive and tolerates a leading dot', () => {
      const validate = v['allowedExtensionsValidator'](['.PDF', 'png']);
      expect(validate(ctl([file('a.pdf', 1), file('b.PNG', 1)]))).toBeNull();
      expect(validate(ctl([file('a.exe', 1)]))).toHaveProperty('allowedExtensions');
      expect(validate(ctl([file('noext', 1)]))).toHaveProperty('allowedExtensions');
    });
    it('maxFiles flags too many files', () => {
      expect(v['maxFilesValidator'](1)(ctl([file('a', 1), file('b', 1)]))).toHaveProperty('maxFiles');
      expect(v['maxFilesValidator'](1)(ctl([file('a', 1)]))).toBeNull();
    });
  });
});
