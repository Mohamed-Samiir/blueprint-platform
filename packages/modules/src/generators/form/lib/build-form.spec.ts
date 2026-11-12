import { buildForm } from './build-form';
import { FieldModelEntry } from './field-model.types';

const L = { colSpan: 12, colSpanSm: 6, colSpanMd: 6 };
const c = (type: string, name: string, extra: object = {}) =>
  ({ type, formControlName: name, label: name, ...L, ...extra }) as unknown as FieldModelEntry;
const group = (name: string, fields: FieldModelEntry[]) =>
  ({ type: 'group', formControlName: name, label: name, ...L, fields }) as FieldModelEntry;
const array = (name: string, itemTemplate: FieldModelEntry[], extra: object = {}) =>
  ({ type: 'array', formControlName: name, label: name, ...L, itemTemplate, ...extra }) as FieldModelEntry;
const btn = (handler: string) => ({ type: 'button', label: handler, handler, ...L }) as FieldModelEntry;

describe('buildForm — group', () => {
  const built = buildForm([group('address', [c('textInput', 'street', { validators: { required: true } }), c('select', 'country')])]);

  it('wraps children in a formGroupName block honouring the entry colSpans', () => {
    expect(built.fieldsHtml).toContain('<div formGroupName="address" class="col-span-12 sm:col-span-6 md:col-span-6 grid grid-cols-12 gap-4">');
    expect(built.fieldsHtml).toContain('formControlName="street"');
  });

  it('builds a nested nonNullable group, with children keeping their own tuple shape', () => {
    expect(built.formControlsCode).toMatch(/address: this\.fb\.nonNullable\.group\(\{/);
    expect(built.formControlsCode.replace(/"/g, "'")).toContain("street: ['', Validators.required]");
    expect(built.formControlsCode.replace(/"/g, "'")).toContain("country: ['']");
  });

  it('propagates imports/flags from nested children, and needs no FormArray', () => {
    expect(built.usesBuiltInValidators).toBe(true);
    expect(built.imports.map((i) => i.specifier)).toEqual(
      expect.arrayContaining(['@blueprint-platform/ui/field', '@blueprint-platform/ui/select', '@blueprint-platform/ui/input']),
    );
    expect(built.needsFormArray).toBe(false);
    expect(built.arrayMembersCode).toBe('');
  });

  it('rewrites a nested slider so its label reads through the real path, not form.controls', () => {
    const b = buildForm([group('audio', [c('slider', 'volume')])]);
    expect(b.fieldsHtml).not.toContain('form.controls.volume');
    expect(b.fieldsHtml).toContain("form.get('audio.volume')?.value?.[0]");
  });

  it('leaves a top-level slider byte-for-byte on form.controls', () => {
    expect(buildForm([c('slider', 'volume')]).fieldsHtml).toContain('form.controls.volume.value[0]');
  });
});

describe('buildForm — array', () => {
  const phones = array('phones', [c('textInput', 'number', { validators: { required: true } })], { maxItems: 3 });
  const built = buildForm([phones]);

  it('starts with exactly one row by default and imports FormArray + the button module', () => {
    expect(built.formControlsCode).toMatch(/phones: this\.fb\.array\(\[this\.fb\.nonNullable\.group\(/);
    expect(built.needsFormArray).toBe(true);
    expect(built.imports.find((i) => i.specifier.endsWith('/button'))).toBeDefined();
  });

  it('renders the @for/formArrayName wrapper with disabled-bound add/remove buttons', () => {
    expect(built.fieldsHtml).toContain('formArrayName="phones"');
    expect(built.fieldsHtml).toContain('@for (row of phonesArray.controls; track row; let i = $index)');
    expect(built.fieldsHtml).toContain('[formGroupName]="i"');
    expect(built.fieldsHtml).toContain('[disabled]="phonesArray.length <= 1" (click)="removePhones(i)"');
    expect(built.fieldsHtml).toContain('[disabled]="phonesArray.length >= 3" (click)="addPhones()"');
    expect(built.fieldsHtml).toContain('>Add</button>');
    expect(built.fieldsHtml).toContain('>Remove</button>');
  });

  it('renders error markup inside each row (validators compose through recursion)', () => {
    expect(built.fieldsHtml).toContain('<hlm-field-error validator="required">');
  });

  it('generates real (non-stub) accessor/add/remove members bounded by min/max', () => {
    expect(built.arrayMembersCode).toContain('get phonesArray(): FormArray');
    expect(built.arrayMembersCode).toContain("this.form.get('phones') as FormArray");
    expect(built.arrayMembersCode).toContain('if (rows.length >= 3) return;');
    expect(built.arrayMembersCode).toContain('rows.push(this.fb.nonNullable.group(');
    expect(built.arrayMembersCode).toContain('if (rows.length <= 1) return;');
    expect(built.arrayMembersCode).toContain('rows.removeAt(i);');
    expect(built.arrayMembersCode).not.toContain('TODO');
  });

  it('omits the add-button [disabled] and add guard when maxItems is unset', () => {
    const b = buildForm([array('tags', [c('textInput', 't')])]);
    expect(b.fieldsHtml).not.toMatch(/addTags\(\)"[^>]*\[disabled\]|\[disabled\]="tagsArray\.length >=/);
    expect(b.arrayMembersCode).not.toContain('>= ');
  });

  it('minItems: 0 still starts with one row, but the remove floor is 0', () => {
    const b = buildForm([array('tags', [c('textInput', 't')], { minItems: 0 })]);
    expect(b.formControlsCode.match(/nonNullable\.group\(/g)).toHaveLength(1); // the one initial row (the outer form group is added by the template)
    expect(b.fieldsHtml).toContain('[disabled]="tagsArray.length <= 0"');
    expect(b.arrayMembersCode).toContain('if (rows.length <= 0) return;');
  });

  it('minItems > 1 seeds that many initial rows', () => {
    const b = buildForm([array('tags', [c('textInput', 't')], { minItems: 3 })]);
    expect(b.formControlsCode).toContain('Array.from({ length: 3 }');
  });

  it('honours custom labels and variants', () => {
    const b = buildForm([array('tags', [c('textInput', 't')], { addButtonLabel: 'More', removeButtonLabel: 'Drop', addButtonVariant: 'primary', removeButtonVariant: 'secondary' })]);
    expect(b.fieldsHtml).toContain('variant="default" (click)="addTags()">More</button>');
    expect(b.fieldsHtml).toContain('variant="secondary" [disabled]="tagsArray.length <= 1" (click)="removeTags(i)">Drop</button>');
  });
});

describe('buildForm — deep nesting', () => {
  // people[] -> contact{} -> tags[] -> tag
  const model = [
    array('people', [
      group('contact', [
        c('textInput', 'email'),
        c('slider', 'rating'),
        array('tags', [c('textInput', 'tag')], { maxItems: 2 }),
      ]),
    ]),
  ];
  const built = buildForm(model);

  it('scopes an array-in-array to per-row accessor/add/remove methods taking the enclosing indices', () => {
    expect(built.arrayMembersCode).toContain("peopleContactTagsArray(i: number): FormArray {");
    expect(built.arrayMembersCode).toContain("this.form.get(['people', i, 'contact', 'tags']) as FormArray");
    expect(built.arrayMembersCode).toContain('addPeopleContactTags(i: number): void');
    expect(built.arrayMembersCode).toContain('removePeopleContactTags(i: number, i1: number): void');
    expect(built.arrayMembersCode).toContain('const rows = this.peopleContactTagsArray(i);');
    expect(built.arrayMembersCode).toContain('rows.removeAt(i1);');
  });

  it('uses distinct row/index variable names per nesting level in the template', () => {
    expect(built.fieldsHtml).toContain('@for (row of peopleArray.controls; track row; let i = $index)');
    expect(built.fieldsHtml).toContain('@for (row1 of peopleContactTagsArray(i).controls; track row1; let i1 = $index)');
    expect(built.fieldsHtml).toContain('[formGroupName]="i1"');
    expect(built.fieldsHtml).toContain('(click)="removePeopleContactTags(i, i1)"');
    expect(built.fieldsHtml).toContain('(click)="addPeopleContactTags(i)"');
  });

  it('routes a slider inside a row through an index-aware path', () => {
    expect(built.fieldsHtml).toContain("form.get(['people', i, 'contact', 'rating'])?.value?.[0]");
  });

  it('builds the nested array inside the parent row group, so new rows carry it too', () => {
    const add = built.arrayMembersCode.split('addPeople(')[1];
    expect(add).toContain('tags: this.fb.array(');
  });
});

describe('buildForm — handlers and collisions', () => {
  it('collects button handlers nested in a group and an array row, one stub per unique name', () => {
    const b = buildForm([
      group('g', [btn('onA')]),
      array('a', [c('textInput', 'x'), btn('onB')]),
      btn('onA'),
    ]);
    expect(b.handlerNames.sort()).toEqual(['onA', 'onB']);
  });

  it('rejects a button handler that collides with a generated array member', () => {
    expect(() => buildForm([array('phones', [c('textInput', 'n')]), btn('addPhones')])).toThrow(/collides with a generated array member/);
  });

  it('rejects two arrays that would generate the same member names', () => {
    expect(() => buildForm([group('aB', [array('c', [c('textInput', 'x')])]), group('a', [array('bC', [c('textInput', 'x')])])])).toThrow(
      /collides with another generated member/,
    );
  });

  it('a group containing only a button still counts no controls', () => {
    const b = buildForm([group('g', [btn('onX')])]);
    expect(b.hasControls).toBe(false);
  });
});
