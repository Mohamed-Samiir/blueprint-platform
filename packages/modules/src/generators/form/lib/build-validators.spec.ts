import { buildControlValidators } from './build-control-validators';
import { buildFieldErrorHtml } from './build-error-html';
import { ControlFieldEntry } from './field-model.types';

const L = { colSpan: 12, colSpanSm: 6, colSpanMd: 6 };
const entry = (e: object): ControlFieldEntry => ({ formControlName: 'f', label: 'Field', ...L, ...e }) as ControlFieldEntry;

describe('buildFieldErrorHtml', () => {
  it("returns '' for a field with no validators, so a validator-free field carries no leftover markup", () => {
    expect(buildFieldErrorHtml(entry({ type: 'textInput' }))).toBe('');
    expect(buildFieldErrorHtml(entry({ type: 'textInput', validators: {} }))).toBe('');
  });

  it('emits exactly one hlm-field-error per ACTIVE validator, not one per possible validator', () => {
    const html = buildFieldErrorHtml(entry({ type: 'textInput', validators: { required: true } }));
    expect(html.match(/<hlm-field-error/g)).toHaveLength(1);
    expect(html).toContain('Field is required.');
  });

  it('skips a disabled (`required: false`) validator', () => {
    expect(buildFieldErrorHtml(entry({ type: 'textInput', validators: { required: false } }))).toBe('');
  });

  it("uses the RUNTIME error key in validator=, not our config key (minLength → minlength, requiredTrue → required)", () => {
    const text = buildFieldErrorHtml(entry({ type: 'textInput', validators: { minLength: 3, maxLength: 9 } }));
    expect(text).toContain('validator="minlength"');
    expect(text).toContain('validator="maxlength"');
    expect(text).not.toContain('validator="minLength"');

    const toggle = buildFieldErrorHtml(entry({ type: 'checkbox', validators: { requiredTrue: true } }));
    expect(toggle).toContain('validator="required"');
    expect(toggle).toContain('Field must be checked.');
  });

  it('custom-backed keys map to themselves', () => {
    const html = buildFieldErrorHtml(entry({ type: 'datePicker', validators: { minDate: '2020-01-01' } }));
    expect(html).toContain('validator="minDate"');
    expect(html).toContain('Field must be on or after 2020-01-01.');
  });

  it('a custom message overrides the default; an omitted message falls back to the default', () => {
    const html = buildFieldErrorHtml(
      entry({
        type: 'textInput',
        validators: { required: 'Please tell us', minLength: { value: 3, message: 'Too short!' }, maxLength: 9 },
      }),
    );
    expect(html).toContain('Please tell us');
    expect(html).toContain('Too short!');
    expect(html).toContain('Field must be at most 9 characters.');
    expect(html).not.toContain('Field is required.');
  });

  it('escapes template-significant characters in messages ({{ }} would interpolate, < would open a tag)', () => {
    const html = buildFieldErrorHtml(entry({ type: 'textInput', validators: { required: 'Needs {{ x }} & <b>' } }));
    expect(html).toContain('Needs &#123;&#123; x &#125;&#125; &amp; &lt;b&gt;');
    expect(html).not.toContain('{{');
  });

  it('includes the alert icon in each error', () => {
    expect(buildFieldErrorHtml(entry({ type: 'textInput', validators: { required: true } }))).toContain(
      'lucideCircleAlert',
    );
  });
});

describe('buildControlValidators', () => {
  it('returns null for no validators (so the control is a one-element tuple, never a trailing [])', () => {
    expect(buildControlValidators(entry({ type: 'textInput' })).expression).toBeNull();
    expect(buildControlValidators(entry({ type: 'textInput', validators: {} })).expression).toBeNull();
    expect(buildControlValidators(entry({ type: 'textInput', validators: { required: false } })).expression).toBeNull();
  });

  it('a BARE call for exactly one validator', () => {
    expect(buildControlValidators(entry({ type: 'textInput', validators: { required: true } })).expression).toBe(
      'Validators.required',
    );
    expect(buildControlValidators(entry({ type: 'numberInput', validators: { min: 18 } })).expression).toBe(
      'Validators.min(18)',
    );
  });

  it('an ARRAY for more than one, in authored order', () => {
    expect(
      buildControlValidators(entry({ type: 'textInput', validators: { required: true, email: true } })).expression,
    ).toBe('[Validators.required, Validators.email]');
    expect(
      buildControlValidators(entry({ type: 'numberInput', validators: { min: 1, required: true } })).expression,
    ).toBe('[Validators.min(1), Validators.required]');
  });

  it('unwraps { value, message } to the bare value, and quotes string values safely', () => {
    expect(
      buildControlValidators(entry({ type: 'textInput', validators: { maxLength: { value: 9, message: 'x' } } })).expression,
    ).toBe('Validators.maxLength(9)');
    expect(
      buildControlValidators(entry({ type: 'textInput', validators: { pattern: '^a"b$' } })).expression,
    ).toBe('Validators.pattern("^a\\"b$")');
  });

  it('tracks built-in vs custom usage separately, so a built-in-only model imports no custom-validators', () => {
    const builtIn = buildControlValidators(entry({ type: 'textInput', validators: { required: true } }));
    expect(builtIn.usesBuiltIn).toBe(true);
    expect(builtIn.customFns).toEqual([]);

    const custom = buildControlValidators(
      entry({ type: 'dateRangePicker', validators: { minDate: '2020-01-01', minRangeDays: 2 } }),
    );
    expect(custom.usesBuiltIn).toBe(false);
    expect(custom.customFns).toEqual(['minDateValidator', 'minRangeDaysValidator']);
    expect(custom.expression).toBe('[minDateValidator("2020-01-01"), minRangeDaysValidator(2)]');

    const mixed = buildControlValidators(entry({ type: 'selectMultiple', validators: { required: true, maxSelected: 3 } }));
    expect(mixed.usesBuiltIn).toBe(true);
    expect(mixed.customFns).toEqual(['maxSelectedValidator']);
  });
});
