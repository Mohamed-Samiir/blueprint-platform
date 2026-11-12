import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseFieldModel } from './parse-model';

const LAYOUT = 'colSpan: 12, colSpanSm: 6, colSpanMd: 6';

describe('parseFieldModel', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bp-form-model-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(fileName: string, content: string): string {
    const path = join(dir, fileName);
    writeFileSync(path, content);
    return path;
  }

  function model(...entries: string[]): string {
    return write('m.ts', `export const fields = [\n${entries.map((e) => `  ${e},`).join('\n')}\n];`);
  }

  describe('structure and control fields', () => {
    it('parses a valid file with 5+ different field types into the correct array', () => {
      const result = parseFieldModel(
        model(
          `{ type: 'textInput', formControlName: 'fullName', label: 'Full name', ${LAYOUT} }`,
          `{ type: 'select', formControlName: 'role', label: 'Role', ${LAYOUT} }`,
          `{ type: 'datePicker', formControlName: 'startDate', label: 'Start', ${LAYOUT} }`,
          `{ type: 'switchToggle', formControlName: 'active', label: 'Active', ${LAYOUT} }`,
          `{ type: 'comboboxMultiple', formControlName: 'tags', label: 'Tags', ${LAYOUT} }`,
          `{ type: 'checkbox', formControlName: 'terms', label: 'Terms', ${LAYOUT} }`,
        ),
      );

      expect(result.map((f) => f.type)).toEqual([
        'textInput',
        'select',
        'datePicker',
        'switchToggle',
        'comboboxMultiple',
        'checkbox',
      ]);
      expect(result[0]).toEqual({
        type: 'textInput',
        formControlName: 'fullName',
        label: 'Full name',
        colSpan: 12,
        colSpanSm: 6,
        colSpanMd: 6,
      });
    });

    it('throws a clear error on an unknown type value', () => {
      expect(() =>
        parseFieldModel(model(`{ type: 'notARealType', formControlName: 'x', label: 'X', ${LAYOUT} }`)),
      ).toThrow(/unknown field type "notARealType"/);
    });

    it('throws a clear error when there is no exported array', () => {
      expect(() => parseFieldModel(write('a.ts', `export const notAnArray = { foo: 'bar' };`))).toThrow(
        /no exported array-literal variable found/,
      );
    });

    it('throws when more than one array is exported', () => {
      expect(() => parseFieldModel(write('two.ts', `export const a = []; export const b = [];`))).toThrow(
        /exports 2 array-literal variables/,
      );
    });

    it('throws a clear, distinct error for a nonexistent file path', () => {
      expect(() => parseFieldModel(join(dir, 'does-not-exist.ts'))).toThrow(/model file not found/);
    });

    it('throws naming the unsupported construct for a spread element', () => {
      const path = write(
        'spread.ts',
        `const base = { type: 'textInput', formControlName: 'x', label: 'X', ${LAYOUT} };
         export const fields = [{ ...base }];`,
      );
      expect(() => parseFieldModel(path)).toThrow(/unsupported object-literal construct/);
    });

    it('throws naming the unsupported construct for a function-call value', () => {
      const path = write(
        'call.ts',
        `function label() { return 'X'; }
         export const fields = [{ type: 'textInput', formControlName: 'x', label: label(), ${LAYOUT} }];`,
      );
      expect(() => parseFieldModel(path)).toThrow(/unsupported value/);
    });

    it('rejects duplicate formControlNames and non-identifier formControlNames', () => {
      expect(() =>
        parseFieldModel(
          model(
            `{ type: 'textInput', formControlName: 'a', label: 'A', ${LAYOUT} }`,
            `{ type: 'textInput', formControlName: 'a', label: 'A2', ${LAYOUT} }`,
          ),
        ),
      ).toThrow(/duplicate formControlName "a"/);
      expect(() =>
        parseFieldModel(model(`{ type: 'textInput', formControlName: 'first-name', label: 'A', ${LAYOUT} }`)),
      ).toThrow(/isn't a valid identifier/);
    });
  });

  describe('validators', () => {
    it('throws naming the field, the bad key, and the valid keys for an invalid validator key (pattern on a checkbox)', () => {
      expect(() =>
        parseFieldModel(
          model(
            `{ type: 'checkbox', formControlName: 'terms', label: 'T', ${LAYOUT}, validators: { pattern: 'x' } }`,
          ),
        ),
      ).toThrow(/"terms" \(checkbox\): validator "pattern" isn't valid for a checkbox field\. Valid validators for checkbox: requiredTrue/);
    });

    it('throws for min on a textInput', () => {
      expect(() =>
        parseFieldModel(
          model(`{ type: 'textInput', formControlName: 'n', label: 'N', ${LAYOUT}, validators: { min: 3 } }`),
        ),
      ).toThrow(/validator "min" isn't valid for a textInput field/);
    });

    it('accepts every validator kind used correctly across one field per family, populating validators', () => {
      const result = parseFieldModel(
        model(
          `{ type: 'textInput', formControlName: 't', label: 'T', ${LAYOUT}, validators: { required: true, minLength: 2, maxLength: { value: 9, message: 'Too long' }, pattern: '^[a-z]+$', email: 'Bad email' } }`,
          `{ type: 'numberInput', formControlName: 'n', label: 'N', ${LAYOUT}, validators: { required: true, min: 1, max: -5 } }`,
          `{ type: 'datePicker', formControlName: 'd', label: 'D', ${LAYOUT}, validators: { minDate: '2020-01-01', maxDate: { value: '2030-01-01', message: 'Too late' } } }`,
          `{ type: 'dateRangePicker', formControlName: 'r', label: 'R', ${LAYOUT}, validators: { minRangeDays: 2, maxRangeDays: 14, minDate: '2020-01-01' } }`,
          `{ type: 'select', formControlName: 's', label: 'S', ${LAYOUT}, validators: { required: 'Pick one' } }`,
          `{ type: 'selectMultiple', formControlName: 'm', label: 'M', ${LAYOUT}, validators: { minSelected: 1, maxSelected: 3 } }`,
          `{ type: 'checkbox', formControlName: 'c', label: 'C', ${LAYOUT}, validators: { requiredTrue: true } }`,
          `{ type: 'attachment', formControlName: 'a', label: 'A', ${LAYOUT}, validators: { maxFileSizeMb: 5, allowedExtensions: ['pdf', 'png'], maxFiles: { value: 3, message: 'Max 3' } } }`,
        ),
      );

      expect(result).toHaveLength(8);
      expect((result[0] as any).validators).toEqual({
        required: true,
        minLength: 2,
        maxLength: { value: 9, message: 'Too long' },
        pattern: '^[a-z]+$',
        email: 'Bad email',
      });
      expect((result[1] as any).validators.max).toBe(-5);
      expect((result[7] as any).validators.allowedExtensions).toEqual(['pdf', 'png']);
    });

    it('rejects bad validator value shapes and invalid patterns', () => {
      const one = (validators: string) =>
        parseFieldModel(model(`{ type: 'textInput', formControlName: 'n', label: 'N', ${LAYOUT}, validators: ${validators} }`));
      expect(() => one(`{ minLength: 'five' }`)).toThrow(/"minLength" needs a number/);
      expect(() => one(`{ maxLength: { value: 3, oops: 1 } }`)).toThrow(/unknown property "oops"/);
      expect(() => one(`{ pattern: '[' }`)).toThrow(/isn't a valid regular expression/);
      expect(() => one(`{ required: 5 }`)).toThrow(/"required" must be `true`, `false`, or a custom message/);
    });
  });

  describe('defaultValue', () => {
    it('accepts a defaultValue that fits its field family', () => {
      const r = parseFieldModel(
        model(
          `{ type: 'numberInput', formControlName: 'age', label: 'Age', ${LAYOUT}, defaultValue: 18 }`,
          `{ type: 'switchToggle', formControlName: 'on', label: 'On', ${LAYOUT}, defaultValue: true }`,
          `{ type: 'selectMultiple', formControlName: 'm', label: 'M', ${LAYOUT}, defaultValue: ['a', 'b'] }`,
        ),
      );
      expect((r[0] as any).defaultValue).toBe(18);
      expect((r[2] as any).defaultValue).toEqual(['a', 'b']);
    });

    it('throws for a defaultValue of the wrong shape (string on a numberInput)', () => {
      expect(() =>
        parseFieldModel(model(`{ type: 'numberInput', formControlName: 'age', label: 'Age', ${LAYOUT}, defaultValue: '18' }`)),
      ).toThrow(/"age" \(numberInput\): defaultValue "18" doesn't fit a numberInput field — expected a number/);
    });

    it('throws for a non-array defaultValue on a multi-select', () => {
      expect(() =>
        parseFieldModel(model(`{ type: 'selectMultiple', formControlName: 'm', label: 'M', ${LAYOUT}, defaultValue: 'a' }`)),
      ).toThrow(/expected a string array/);
    });
  });

  describe('buttons', () => {
    it('reads a button mixed in among control fields — no validators key at all, handler/variant read correctly', () => {
      const r = parseFieldModel(
        model(
          `{ type: 'textInput', formControlName: 'a', label: 'A', ${LAYOUT} }`,
          `{ type: 'button', label: 'Save', handler: 'onSave', variant: 'outline', ${LAYOUT} }`,
          `{ type: 'textInput', formControlName: 'b', label: 'B', ${LAYOUT} }`,
        ),
      );

      expect(r.map((e) => e.type)).toEqual(['textInput', 'button', 'textInput']);
      const btn = r[1];
      expect(btn).toEqual({
        type: 'button',
        label: 'Save',
        handler: 'onSave',
        variant: 'outline',
        colSpan: 12,
        colSpanSm: 6,
        colSpanMd: 6,
      });
      expect('validators' in btn).toBe(false);
      expect('formControlName' in btn).toBe(false);
    });

    it("omits variant when the model doesn't set it (the renderer defaults to 'primary')", () => {
      const [btn] = parseFieldModel(model(`{ type: 'button', label: 'Go', handler: 'go', ${LAYOUT} }`));
      expect('variant' in btn).toBe(false);
    });

    it('throws when a button sets formControlName, validators, or defaultValue', () => {
      for (const extra of [`formControlName: 'x'`, `validators: { required: true }`, `defaultValue: 1`]) {
        expect(() =>
          parseFieldModel(model(`{ type: 'button', label: 'Go', handler: 'go', ${LAYOUT}, ${extra} }`)),
        ).toThrow(/a 'button' entry can't have/);
      }
    });

    it('throws for a handler that is not a safe identifier', () => {
      for (const bad of ['on save', 'save()', 'a.b', '1abc']) {
        expect(() =>
          parseFieldModel(model(`{ type: 'button', label: 'Go', handler: '${bad}', ${LAYOUT} }`)),
        ).toThrow(/isn't a safe identifier/);
      }
    });

    it('throws for a handler colliding with a member the generated component defines', () => {
      expect(() => parseFieldModel(model(`{ type: 'button', label: 'Go', handler: 'form', ${LAYOUT} }`))).toThrow(
        /collides with a member the generated component already defines/,
      );
    });

    it('throws for an unknown variant and for a missing handler', () => {
      expect(() =>
        parseFieldModel(model(`{ type: 'button', label: 'Go', handler: 'go', variant: 'danger', ${LAYOUT} }`)),
      ).toThrow(/unknown button variant "danger"/);
      expect(() => parseFieldModel(model(`{ type: 'button', label: 'Go', ${LAYOUT} }`))).toThrow(
        /needs a non-empty string "handler"/,
      );
    });

    it('lets two buttons share one handler name (not an error)', () => {
      const r = parseFieldModel(
        model(
          `{ type: 'button', label: 'Cancel', handler: 'onCancel', ${LAYOUT} }`,
          `{ type: 'button', label: 'Cancel', handler: 'onCancel', ${LAYOUT} }`,
        ),
      );
      expect(r).toHaveLength(2);
    });

    it('rejects handler/variant on a control field', () => {
      expect(() =>
        parseFieldModel(model(`{ type: 'textInput', formControlName: 'a', label: 'A', ${LAYOUT}, handler: 'x' }`)),
      ).toThrow(/only apply to `type: 'button'`/);
    });
  });

  describe('group and array', () => {
    const txt = (name: string) => `{ type: 'textInput', formControlName: '${name}', label: '${name}', ${LAYOUT} }`;

    it('parses a group with 3+ nested control fields into a nested structure', () => {
      const [g] = parseFieldModel(
        model(
          `{ type: 'group', formControlName: 'address', label: 'Address', ${LAYOUT}, fields: [${txt('street')}, ${txt('city')}, ${txt('zip')}] }`,
        ),
      );
      expect(g.type).toBe('group');
      if (g.type !== 'group') throw new Error('unreachable');
      expect(g.fields.map((f) => f.type === 'group' || f.type === 'array' || f.type === 'button' ? f.type : f.formControlName)).toEqual([
        'street',
        'city',
        'zip',
      ]);
    });

    it('parses an array whose itemTemplate has 2+ fields, preserving validators', () => {
      const [a] = parseFieldModel(
        model(
          `{ type: 'array', formControlName: 'phones', label: 'Phones', ${LAYOUT}, minItems: 2, maxItems: 4, addButtonLabel: 'Add phone', removeButtonVariant: 'outline', itemTemplate: [
            { type: 'textInput', formControlName: 'number', label: 'Number', ${LAYOUT}, validators: { required: true, minLength: 7 } },
            { type: 'select', formControlName: 'kind', label: 'Kind', ${LAYOUT} },
          ] }`,
        ),
      );
      if (a.type !== 'array') throw new Error('unreachable');
      expect(a).toMatchObject({ minItems: 2, maxItems: 4, addButtonLabel: 'Add phone', removeButtonVariant: 'outline' });
      expect(a.itemTemplate).toHaveLength(2);
      expect(a.itemTemplate[0]).toMatchObject({ validators: { required: true, minLength: 7 } });
    });

    it('parses a group nested in an array item that itself contains another array (no depth limit)', () => {
      const [a] = parseFieldModel(
        model(
          `{ type: 'array', formControlName: 'people', label: 'People', ${LAYOUT}, itemTemplate: [
            { type: 'group', formControlName: 'contact', label: 'Contact', ${LAYOUT}, fields: [
              ${txt('email')},
              { type: 'array', formControlName: 'tags', label: 'Tags', ${LAYOUT}, itemTemplate: [${txt('tag')}] },
            ] },
          ] }`,
        ),
      );
      if (a.type !== 'array') throw new Error('unreachable');
      const group = a.itemTemplate[0];
      if (group.type !== 'group') throw new Error('unreachable');
      const inner = group.fields[1];
      expect(inner.type).toBe('array');
    });

    it('allows the same formControlName in different groups (scoped per sibling list)', () => {
      expect(() =>
        parseFieldModel(
          model(
            `{ type: 'group', formControlName: 'home', label: 'Home', ${LAYOUT}, fields: [${txt('street')}] }`,
            `{ type: 'group', formControlName: 'work', label: 'Work', ${LAYOUT}, fields: [${txt('street')}] }`,
          ),
        ),
      ).not.toThrow();
    });

    it('still rejects a duplicate formControlName inside one group, naming where', () => {
      expect(() =>
        parseFieldModel(
          model(
            `{ type: 'group', formControlName: 'home', label: 'Home', ${LAYOUT}, fields: [${txt('street')}, ${txt('street')}] }`,
          ),
        ),
      ).toThrow(/field index 0, "home"\.fields > \[1\]: duplicate formControlName "street"/);
    });

    it('throws a clear error for a group with empty or missing fields', () => {
      expect(() =>
        parseFieldModel(model(`{ type: 'group', formControlName: 'g', label: 'G', ${LAYOUT}, fields: [] }`)),
      ).toThrow(/"g": "fields" is empty/);
      expect(() => parseFieldModel(model(`{ type: 'group', formControlName: 'g', label: 'G', ${LAYOUT} }`))).toThrow(
        /"g" is missing "fields"/,
      );
    });

    it('throws for an array with empty/missing itemTemplate, or minItems > maxItems', () => {
      expect(() =>
        parseFieldModel(model(`{ type: 'array', formControlName: 'a', label: 'A', ${LAYOUT}, itemTemplate: [] }`)),
      ).toThrow(/"itemTemplate" is empty/);
      expect(() => parseFieldModel(model(`{ type: 'array', formControlName: 'a', label: 'A', ${LAYOUT} }`))).toThrow(
        /missing "itemTemplate"/,
      );
      expect(() =>
        parseFieldModel(
          model(`{ type: 'array', formControlName: 'a', label: 'A', ${LAYOUT}, minItems: 3, maxItems: 1, itemTemplate: [${txt('x')}] }`),
        ),
      ).toThrow(/minItems \(3\) is greater than maxItems \(1\)/);
    });

    it('rejects validators on a group/array, and fields/itemTemplate on the wrong type', () => {
      expect(() =>
        parseFieldModel(
          model(`{ type: 'group', formControlName: 'g', label: 'G', ${LAYOUT}, validators: { required: true }, fields: [${txt('x')}] }`),
        ),
      ).toThrow(/can't have "validators"/);
      expect(() =>
        parseFieldModel(model(`{ type: 'group', formControlName: 'g', label: 'G', ${LAYOUT}, itemTemplate: [${txt('x')}] }`)),
      ).toThrow(/"itemTemplate" only applies to/);
      expect(() =>
        parseFieldModel(model(`{ type: 'textInput', formControlName: 'g', label: 'G', ${LAYOUT}, fields: [${txt('x')}] }`)),
      ).toThrow(/"fields" only applies to/);
    });

    it('rejects a bad array option (unknown variant / non-integer minItems / maxItems 0)', () => {
      const arr = (extra: string) =>
        model(`{ type: 'array', formControlName: 'a', label: 'A', ${LAYOUT}, ${extra}, itemTemplate: [${txt('x')}] }`);
      expect(() => parseFieldModel(arr("addButtonVariant: 'huge'"))).toThrow(/unknown addButtonVariant/);
      expect(() => parseFieldModel(arr('minItems: 1.5'))).toThrow(/non-negative integer/);
      expect(() => parseFieldModel(arr('maxItems: 0'))).toThrow(/at least 1/);
    });

    it('reports nested errors with a breadcrumb to the offending entry', () => {
      expect(() =>
        parseFieldModel(
          model(
            `{ type: 'array', formControlName: 'a', label: 'A', ${LAYOUT}, itemTemplate: [{ type: 'nope', formControlName: 'x', label: 'x', ${LAYOUT} }] }`,
          ),
        ),
      ).toThrow(/field index 0, "a"\.itemTemplate > \[0\]: unknown field type "nope"/);
    });
  });
});
