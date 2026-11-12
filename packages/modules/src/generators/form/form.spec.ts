jest.mock('./lib/parse-model', () => ({
  parseFieldModel: jest.fn(),
}));

import { Tree, readJson, writeJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import formGenerator from './form';
import { parseFieldModel } from './lib/parse-model';
import { FieldModelEntry } from './lib/field-model.types';

const mockParseFieldModel = parseFieldModel as unknown as jest.Mock;

const L = { colSpan: 12, colSpanSm: 6, colSpanMd: 6 };
const c = (type: string, name: string, extra: object = {}) =>
  ({ type, formControlName: name, label: name, ...L, ...extra }) as unknown as FieldModelEntry;
const btn = (label: string, handler: string, extra: object = {}) =>
  ({ type: 'button', label, handler, ...L, ...extra }) as unknown as FieldModelEntry;

function makeTree(): Tree {
  const tree = createTreeWithEmptyWorkspace();
  writeJson(tree, '.blueprint/manifest.json', { components: [], modules: [], layouts: [], forms: [] });
  return tree;
}

const FIVE_FAMILY_MODEL = [
  c('textInput', 'fullName'),
  c('select', 'role'),
  c('datePicker', 'startDate'),
  c('switchToggle', 'active'),
  c('comboboxMultiple', 'tags'),
];

describe('modules:form generator', () => {
  let tree: Tree;

  // `.ts` output is compared quote-agnostic (prettier's quote style differs between this
  // bare jest tree and a real project's .prettierrc); `.html` keeps its double quotes.
  const read = (name: string, dir = 'features/forms', ext = 'ts') => {
    const out = tree.read(`src/app/${dir}/${name}/${name}.${ext}`, 'utf-8') ?? '';
    return ext === 'ts' ? out.replace(/"/g, "'") : out;
  };

  beforeEach(() => {
    tree = makeTree();
    mockParseFieldModel.mockReset();
  });

  describe('placement', () => {
    it('writes the three component files at directory/name/name.{ts,html,scss}', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'sample-form', model: 'x.ts', directory: 'features/sample-module' });

      for (const ext of ['ts', 'html', 'scss']) {
        expect(tree.exists(`src/app/features/sample-module/sample-form/sample-form.${ext}`)).toBe(true);
      }
    });

    it('falls back to features/forms when directory is omitted', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'sample-form', model: 'x.ts' });
      expect(tree.exists('src/app/features/forms/sample-form/sample-form.ts')).toBe(true);
    });

    it('normalizes a leading slash and a redundant src/app/ prefix on directory', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'sample-form', model: 'x.ts', directory: '/src/app/features/orders/' });
      expect(tree.exists('src/app/features/orders/sample-form/sample-form.ts')).toBe(true);
    });

    it('derives a valid class name and selector from a kebab-case name', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'order-intake-form', model: 'x.ts' });
      const out = read('order-intake-form');
      expect(out).toContain('export class OrderIntakeForm');
      expect(out).toContain(`selector: 'app-order-intake-form'`);
    });
  });

  describe('imports and icons only for what the model uses', () => {
    it('imports only the UI modules the present field types need', async () => {
      mockParseFieldModel.mockReturnValue([c('textInput', 'name')]);
      await formGenerator(tree, { name: 'text-only', model: 'x.ts' });
      const out = read('text-only');
      expect(out).toContain('@blueprint-platform/ui/field');
      expect(out).toContain('@blueprint-platform/ui/input');
      for (const absent of ['select', 'combobox', 'date-picker', 'attachment', 'slider', 'button']) {
        expect(out).not.toContain(`@blueprint-platform/ui/${absent}`);
      }
      expect(out).not.toContain('provideIcons');
      expect(out).not.toContain(', Validators }'); // (the bare word also appears in the doc comment)
      expect(out).not.toContain('Validators.');
      expect(out).not.toContain('custom-validators');
    });

    it('registers attachment icons and the stub handlers only when an attachment is present', async () => {
      mockParseFieldModel.mockReturnValue([c('attachment', 'files')]);
      await formGenerator(tree, { name: 'upload', model: 'x.ts' });
      const out = read('upload');
      for (const icon of ['lucideFileText', 'lucideX', 'lucidePaperclip']) expect(out).toContain(icon);
      expect(out).toContain('removeAttachment');
      expect(out).toContain('onAttachmentsSelected');

      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'other', model: 'x.ts' });
      expect(read('other')).not.toContain('removeAttachment');
    });

    it('registers the alert icon only when some field actually has validators (error markup uses it)', async () => {
      mockParseFieldModel.mockReturnValue([c('textInput', 'a', { validators: { required: true } })]);
      await formGenerator(tree, { name: 'with', model: 'x.ts' });
      expect(read('with')).toContain('lucideCircleAlert');
      expect(read('with')).toContain('provideIcons({ lucideCircleAlert })');

      mockParseFieldModel.mockReturnValue([c('checkbox', 'a')]);
      await formGenerator(tree, { name: 'without', model: 'x.ts' });
      expect(read('without')).not.toContain('lucideCircleAlert');
    });
  });

  describe('FormGroup shape (Task 10)', () => {
    it('is built via inject(FormBuilder) + this.fb.nonNullable.group, not new FormGroup / a nullable builder', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      const out = read('f');
      expect(out).toContain('private readonly fb = inject(FormBuilder);');
      expect(out).toContain('this.fb.nonNullable.group({');
      expect(out).not.toContain('new FormGroup');
      expect(out).not.toContain('NonNullableFormBuilder');
    });

    it('a control with exactly ONE validator gets a BARE validator, not a one-element array', async () => {
      mockParseFieldModel.mockReturnValue([c('textInput', 'name', { validators: { required: true } })]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(read('f')).toContain("name: ['', Validators.required],");
      expect(read('f')).not.toContain('[Validators.required]');
    });

    it('a control with several validators gets an ARRAY, in authored order', async () => {
      mockParseFieldModel.mockReturnValue([
        c('numberInput', 'age', { validators: { required: true, min: 18 } }),
      ]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(read('f')).toContain('age: [0, [Validators.required, Validators.min(18)]],');
    });

    it('a control with NO validators is a one-element tuple — no trailing undefined/[]', async () => {
      mockParseFieldModel.mockReturnValue([c('switchToggle', 'isActive', { defaultValue: true })]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(read('f')).toContain('isActive: [true],');
    });

    it("uses the per-type fallback default when defaultValue is omitted, and the model's value when given", async () => {
      mockParseFieldModel.mockReturnValue([
        c('textInput', 't'),
        c('numberInput', 'n'),
        c('numberInput', 'n2', { defaultValue: 42 }),
        c('checkbox', 'cb'),
        c('selectMultiple', 'sm'),
        c('slider', 'sl'),
        c('datePicker', 'dp'),
        c('dateRangePicker', 'dr'),
        c('attachment', 'at'),
      ]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      const out = read('f');
      expect(out).toContain("t: [''],");
      expect(out).toContain('n: [0],');
      expect(out).toContain('n2: [42],');
      expect(out).toContain('cb: [false],');
      expect(out).toContain('sm: [[] as string[]],');
      expect(out).toContain('sl: [[0] as number[]],'); // slider markup reads value[0]
      expect(out).toContain('dp: [null as Date | null],');
      expect(out).toContain('dr: [null as [Date, Date] | null],');
      expect(out).toContain('at: [null as File[] | null],'); // attachment IS a control now (validators need one)
    });

    it("imports Validators only when a built-in validator is used, and custom-validators only when a custom one is", async () => {
      mockParseFieldModel.mockReturnValue([c('textInput', 'a', { validators: { required: true } })]);
      await formGenerator(tree, { name: 'builtin', model: 'x.ts' });
      expect(read('builtin')).toContain("import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';");
      expect(read('builtin')).not.toContain('custom-validators');
      expect(tree.exists('src/app/shared/forms/custom-validators.ts')).toBe(false);

      mockParseFieldModel.mockReturnValue([
        c('datePicker', 'd', { validators: { minDate: '2020-01-01' } }),
        c('selectMultiple', 'm', { validators: { maxSelected: 3 } }),
      ]);
      await formGenerator(tree, { name: 'custom', model: 'x.ts', directory: 'features/deep/er' });
      const out = read('custom', 'features/deep/er');
      expect(out).toContain("import { FormBuilder, ReactiveFormsModule } from '@angular/forms';"); // no Validators
      // src/app/features/deep/er/custom/ → src/app/ is FOUR levels up.
      expect(out).toContain("import { maxSelectedValidator, minDateValidator } from '../../../../shared/forms/custom-validators';");
      expect(out).toContain("d: [null as Date | null, minDateValidator('2020-01-01')],");
      expect(tree.exists('src/app/shared/forms/custom-validators.ts')).toBe(true);
    });

    it('does not overwrite an existing custom-validators file (the developer owns it)', async () => {
      tree.write('src/app/shared/forms/custom-validators.ts', '// mine');
      mockParseFieldModel.mockReturnValue([c('datePicker', 'd', { validators: { minDate: '2020-01-01' } })]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(tree.read('src/app/shared/forms/custom-validators.ts', 'utf-8')).toBe('// mine');
    });
  });

  describe('inline error markup (Task 8)', () => {
    it("renders each field's errors INSIDE that field's own hlm-field, with the runtime error key", async () => {
      mockParseFieldModel.mockReturnValue([
        c('textInput', 'a', { validators: { minLength: 3 } }),
        c('textInput', 'b'),
      ]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      const html = read('f', 'features/forms', 'html');
      const aBlock = html.slice(html.indexOf('for="a"'), html.indexOf('for="b"'));
      expect(aBlock).toContain('<hlm-field-error validator="minlength">');
      expect(aBlock.indexOf('hlm-field-error')).toBeGreaterThan(aBlock.indexOf('formControlName="a"'));
      // "b" has no validators — no error markup at all.
      expect(html.slice(html.indexOf('for="b"'))).not.toContain('hlm-field-error');
      expect((html.match(/<hlm-field-error/g) ?? []).length).toBe(1);
    });

    it('wraps a radioGroup with errors in an inner hlm-field (a fieldset provides no BrnField)', async () => {
      mockParseFieldModel.mockReturnValue([c('radioGroup', 'plan', { validators: { required: true } })]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      const html = read('f', 'features/forms', 'html');
      expect(html).toContain('<hlm-field>');
      expect(html.indexOf('<hlm-field>')).toBeLessThan(html.indexOf('<hlm-radio-group'));
      expect(html.indexOf('hlm-field-error')).toBeGreaterThan(html.indexOf('</hlm-radio-group>'));
      expect(html.indexOf('hlm-field-error')).toBeLessThan(html.lastIndexOf('</hlm-field>'));
    });

    it('does NOT wrap a radioGroup without errors', async () => {
      mockParseFieldModel.mockReturnValue([c('radioGroup', 'plan')]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(read('f', 'features/forms', 'html')).not.toContain('<hlm-field>');
    });
  });

  describe('buttons (Task 9)', () => {
    it('renders real buttons in array position, with the mapped variant and the click handler', async () => {
      mockParseFieldModel.mockReturnValue([
        c('textInput', 'a'),
        btn('Save', 'onSave', { variant: 'primary' }),
        btn('Discard', 'onDiscard', { variant: 'outline' }),
        c('textInput', 'b'),
      ]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      const html = read('f', 'features/forms', 'html');
      expect(html).toContain('variant="default" (click)="onSave()">Save</button>'); // primary → default
      expect(html).toContain('variant="outline" (click)="onDiscard()">Discard</button>');
      // A button in the MIDDLE renders in that position — not pooled into an actions row.
      expect(html.indexOf('for="a"')).toBeLessThan(html.indexOf('onSave()'));
      expect(html.indexOf('onSave()')).toBeLessThan(html.indexOf('for="b"'));
      expect(html).toContain('type="button"');
    });

    it("defaults to 'primary' → HlmButton's 'default' variant when none is given", async () => {
      mockParseFieldModel.mockReturnValue([btn('Go', 'go')]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(read('f', 'features/forms', 'html')).toContain('variant="default"');
    });

    it('generates exactly ONE stub per unique handler name, even when two buttons share it', async () => {
      mockParseFieldModel.mockReturnValue([
        btn('Cancel', 'onCancel'),
        c('textInput', 'a'),
        btn('Cancel', 'onCancel'),
        btn('Save', 'onSave'),
      ]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      const out = read('f');
      expect(out.match(/onCancel\(\): void/g)).toHaveLength(1);
      expect(out.match(/onSave\(\): void/g)).toHaveLength(1);
      expect(out).toContain('// TODO: implement onCancel');
    });

    it('imports the button module only when a button is present', async () => {
      mockParseFieldModel.mockReturnValue([btn('Go', 'go'), c('textInput', 'a')]);
      await formGenerator(tree, { name: 'with', model: 'x.ts' });
      expect(read('with')).toContain("import { HlmButtonImports } from '@blueprint-platform/ui/button';");
      expect(read('with')).toContain('HlmButtonImports,');

      mockParseFieldModel.mockReturnValue([c('textInput', 'a')]);
      await formGenerator(tree, { name: 'without', model: 'x.ts' });
      expect(read('without')).not.toContain('HlmButtonImports');
    });

    it('supports a buttons-only model (no control, no field-module import)', async () => {
      mockParseFieldModel.mockReturnValue([btn('Go', 'go')]);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(read('f')).not.toContain('HlmFieldImports');
    });
  });

  describe('scope guarantees', () => {
    it('adds no routes and no nav entry', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      tree.write('src/app/app.routes.ts', `import { Routes } from '@angular/router';\n\nexport const routes: Routes = [];\n`);
      const before = tree.read('src/app/app.routes.ts', 'utf-8');
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      expect(tree.read('src/app/app.routes.ts', 'utf-8')).toBe(before);
    });

    it('wraps fields in a 12-column grid form bound to the reactive group', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'f', model: 'x.ts' });
      const html = read('f', 'features/forms', 'html');
      expect(html).toContain('[formGroup]="form"');
      expect(html).toContain('grid-cols-12');
    });

    it('records the form name in the manifest forms array', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'sample-form', model: 'x.ts' });
      expect(readJson(tree, '.blueprint/manifest.json').forms).toEqual(['sample-form']);
    });

    it('lets a parseFieldModel error propagate with its original message, unmodified', async () => {
      mockParseFieldModel.mockImplementation(() => {
        throw new Error('modules:form: model file not found at "bp.models/missing.ts".');
      });
      await expect(formGenerator(tree, { name: 'f', model: 'missing.ts' })).rejects.toThrow(
        'modules:form: model file not found at "bp.models/missing.ts".',
      );
    });
  });

  describe('group and array', () => {
    const model = [
      c('textInput', 'title'),
      { type: 'group', formControlName: 'address', label: 'Address', ...L, fields: [c('textInput', 'street'), btn('Lookup', 'onLookup')] },
      { type: 'array', formControlName: 'phones', label: 'Phones', ...L, maxItems: 3, itemTemplate: [c('textInput', 'number', { validators: { required: true } })] },
    ] as unknown as FieldModelEntry[];

    it('emits FormArray import, nested groups, real add/remove members and a single stub for a nested button', async () => {
      mockParseFieldModel.mockReturnValue(model);
      await formGenerator(tree, { name: 'nested-form', model: 'x.ts' });
      const ts = read('nested-form');
      expect(ts).toContain('FormArray, FormBuilder, ReactiveFormsModule, Validators');
      expect(ts).toContain('address: this.fb.nonNullable.group({');
      expect(ts).toContain('phones: this.fb.array([');
      expect(ts).toContain('get phonesArray(): FormArray');
      expect(ts).toContain('addPhones(): void');
      expect(ts).toContain('removePhones(i: number): void');
      expect(ts.split("onLookup(): void")).toHaveLength(2);
      const html = read('nested-form', 'features/forms', 'html');
      expect(html).toContain('formGroupName="address"');
      expect(html).toContain('formArrayName="phones"');
    });

    it('does not import FormArray when the model has no array', async () => {
      mockParseFieldModel.mockReturnValue(FIVE_FAMILY_MODEL);
      await formGenerator(tree, { name: 'flat-form', model: 'x.ts' });
      expect(read('flat-form')).not.toContain('FormArray');
    });
  });
});
