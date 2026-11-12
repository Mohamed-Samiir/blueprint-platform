import {
  attachment,
  button,
  checkbox,
  combobox,
  comboboxMultiple,
  datePicker,
  dateRangePicker,
  inputOtp,
  numberInput,
  radioGroup,
  select,
  selectMultiple,
  slider,
  switchToggle,
  textInput,
  timePicker,
} from './field-renderers';
import { buildControlValidators } from './build-control-validators';
import { buildFieldErrorHtml, escapeTemplateText } from './build-error-html';
import {
  ArrayFieldEntry,
  ButtonVariant,
  ControlFieldEntry,
  DEFAULT_CONTROL_VALUES,
  FieldModelEntry,
  FieldType,
  GroupFieldEntry,
  RESERVED_HANDLER_NAMES,
} from './field-model.types';

/** One path segment: a group/array key, or the template/class variable holding a row index. */
type PathSeg = string | { index: string };

/**
 * Where an entry sits in the form: `path` is the chain of keys from the root
 * (row indices as `{ index }` segments), `idxVars` the row-index variable
 * names in scope, outermost first. The root context is empty.
 */
export interface RenderContext {
  path: PathSeg[];
  idxVars: string[];
}

const ROOT: RenderContext = { path: [], idxVars: [] };

/** A `form.get(...)` argument for `segments` — a dotted string, or an array literal once a row index is involved. */
function pathExpression(segments: PathSeg[]): string {
  if (segments.every((seg) => typeof seg === 'string')) return `'${segments.join('.')}'`;
  return `[${segments.map((seg) => (typeof seg === 'string' ? `'${seg}'` : seg.index)).join(', ')}]`;
}

function isControl(entry: FieldModelEntry): entry is ControlFieldEntry {
  return entry.type !== 'button' && entry.type !== 'group' && entry.type !== 'array';
}

/** Same rule `field-renderers.ts`'s own (unexported) `gridSpanClass` applies — group/array wrappers must span like any field. */
function spanClass(c: { colSpan: number; colSpanSm: number; colSpanMd: number }): string {
  return [`col-span-${c.colSpan}`, c.colSpanSm ? `sm:col-span-${c.colSpanSm}` : '', c.colSpanMd ? `md:col-span-${c.colSpanMd}` : '']
    .filter(Boolean)
    .join(' ');
}

/** Model button variant → `hlmBtn` variant (`primary` is `default`) — same map `field-renderers.ts`'s button uses. */
const HLM_VARIANT: Record<ButtonVariant, string> = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
};

const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/**
 * Generated class-member names for an array entry. Derived from the whole
 * key path (row indices dropped) so two arrays named alike in different
 * groups/rows still get distinct names: top-level `phones` → `phonesArray` /
 * `addPhones` / `removePhones`; `phones[].tags` → `phonesTagsArray(i)` / …
 */
function arrayNames(entry: ArrayFieldEntry, ctx: RenderContext) {
  const keys = [...ctx.path.filter((seg): seg is string => typeof seg === 'string'), entry.formControlName];
  const camel = keys.map((k, i) => (i === 0 ? k : capitalize(k))).join('');
  const depth = ctx.idxVars.length;
  return {
    accessor: `${camel}Array`,
    add: `add${capitalize(camel)}`,
    remove: `remove${capitalize(camel)}`,
    /** This array's own row-index variable (`i`, then `i1`, `i2` … when nested). */
    indexVar: depth === 0 ? 'i' : `i${depth}`,
    rowVar: depth === 0 ? 'row' : `row${depth}`,
  };
}

function renderChildren(entries: FieldModelEntry[], ctx: RenderContext): string {
  return entries.map((child) => renderField(child, isControl(child) ? buildFieldErrorHtml(child) : '', ctx)).join('\n');
}

function renderGroup(entry: GroupFieldEntry, ctx: RenderContext): string {
  const inner = renderChildren(entry.fields, { ...ctx, path: [...ctx.path, entry.formControlName] });
  const heading = entry.label ? `\n<div class="col-span-full text-sm font-medium">${escapeTemplateText(entry.label)}</div>` : '';
  return `
<div formGroupName="${entry.formControlName}" class="${spanClass(entry)} grid grid-cols-12 gap-4">${heading}
${inner}
</div>`;
}

function renderArray(entry: ArrayFieldEntry, ctx: RenderContext): string {
  const n = arrayNames(entry, ctx);
  const rowCtx: RenderContext = {
    path: [...ctx.path, entry.formControlName, { index: n.indexVar }],
    idxVars: [...ctx.idxVars, n.indexVar],
  };
  const inner = renderChildren(entry.itemTemplate, rowCtx);

  const access = ctx.idxVars.length ? `${n.accessor}(${ctx.idxVars.join(', ')})` : n.accessor;
  const floor = entry.minItems ?? 1;
  const addArgs = ctx.idxVars.join(', ');
  const removeArgs = rowCtx.idxVars.join(', ');
  const heading = entry.label ? `\n  <div class="text-sm font-medium">${escapeTemplateText(entry.label)}</div>` : '';
  const addDisabled = entry.maxItems ? ` [disabled]="${access}.length >= ${entry.maxItems}"` : '';

  // The remove button's [disabled] binding and remove<Name>()'s own floor check
  // are two independent layers of one rule (UX vs. defensive) — deliberately
  // no FormArray-length validator on top of them.
  return `
<div formArrayName="${entry.formControlName}" class="${spanClass(entry)} flex flex-col gap-4">${heading}
  @for (${n.rowVar} of ${access}.controls; track ${n.rowVar}; let ${n.indexVar} = $index) {
    <div [formGroupName]="${n.indexVar}" class="grid grid-cols-12 gap-4 rounded-lg border p-4">
${inner}
      <div class="col-span-full flex justify-end">
        <button hlmBtn type="button" variant="${HLM_VARIANT[entry.removeButtonVariant ?? 'ghost']}" [disabled]="${access}.length <= ${floor}" (click)="${n.remove}(${removeArgs})">${escapeTemplateText(entry.removeButtonLabel ?? 'Remove')}</button>
      </div>
    </div>
  }
  <div>
    <button hlmBtn type="button" variant="${HLM_VARIANT[entry.addButtonVariant ?? 'outline']}"${addDisabled} (click)="${n.add}(${addArgs})">${escapeTemplateText(entry.addButtonLabel ?? 'Add')}</button>
  </div>
</div>`;
}

/**
 * Dispatches one entry to its render function. A `switch` with an exhaustive
 * `never` default — not a homogeneous `Record<FieldType, Fn>` — because
 * `button`'s config and call convention (`ButtonFieldEntry`, no `errorHtml`)
 * genuinely differ from the 15 control renderers (`PilotFieldConfig` +
 * `errorHtml`), and `group`/`array` don't call a `field-renderers.ts`
 * function at all — they recurse into this same dispatch for their children.
 * Adding a 19th `FieldType` without a matching `case` is a compile error
 * right here.
 */
export function renderField(entry: FieldModelEntry, errorHtml: string, ctx: RenderContext = ROOT): string {
  switch (entry.type) {
    case 'textInput':
      return textInput(entry, errorHtml);
    case 'numberInput':
      return numberInput(entry, errorHtml);
    case 'timePicker':
      return timePicker(entry, errorHtml);
    case 'select':
      return select(entry, errorHtml);
    case 'selectMultiple':
      return selectMultiple(entry, errorHtml);
    case 'combobox':
      return combobox(entry, errorHtml);
    case 'comboboxMultiple':
      return comboboxMultiple(entry, errorHtml);
    case 'datePicker':
      return datePicker(entry, errorHtml);
    case 'dateRangePicker':
      return dateRangePicker(entry, errorHtml);
    case 'inputOtp':
      return inputOtp(entry, errorHtml);
    case 'attachment':
      return attachment(entry, errorHtml);
    case 'radioGroup':
      return radioGroup(entry, errorHtml);
    case 'slider': {
      const html = slider(entry, errorHtml);
      if (ctx.path.length === 0) return html;
      // The slider's label reads `form.controls.<name>.value[0]` — that only
      // resolves for a top-level control; inside a group/row it must go
      // through the real path.
      const original = `form.controls.${entry.formControlName}.value[0]`;
      if (!html.includes(original)) {
        throw new Error('modules:form: slider renderer no longer reads form.controls.<name>.value[0] — update renderField\'s nested-path rewrite.');
      }
      return html.replace(original, () => `form.get(${pathExpression([...ctx.path, entry.formControlName])})?.value?.[0]`);
    }
    case 'switchToggle':
      return switchToggle(entry, errorHtml);
    case 'checkbox':
      return checkbox(entry, errorHtml);
    case 'button':
      return button(entry);
    case 'group':
      return renderGroup(entry, ctx);
    case 'array':
      return renderArray(entry, ctx);
    default: {
      const _exhaustive: never = entry;
      throw new Error(`Unhandled field type: ${(_exhaustive as FieldModelEntry).type}`);
    }
  }
}

interface ImportSpec {
  specifier: string;
  names: string[];
}

/**
 * `HlmFieldImports` (`@blueprint-platform/ui/field`) backs every control
 * renderer — `hlm-field` wraps all of them, and `radioGroup` uses the same
 * module's `fieldset[hlmFieldSet]` — so it's unconditional for any model with
 * a control. A buttons-only model doesn't need it.
 */
const FIELD_IMPORT: ImportSpec = { specifier: '@blueprint-platform/ui/field', names: ['HlmFieldImports'] };

/**
 * Per-`FieldType` extra imports, confirmed against each render function's
 * actual emitted markup — not assumed from the type name. `inputOtp` is the
 * one case needing a *brain* import alongside its `Hlm*` one: its markup
 * instantiates `<brn-input-otp>` directly (an attribute-directive wrapper,
 * `HlmInputOtp`, not a `hlm-input-otp` element component the way
 * `select`/`combobox`/`date-picker`/`slider`/`radio-group` all are).
 */
const TYPE_IMPORTS: Record<FieldType, ImportSpec[]> = {
  textInput: [{ specifier: '@blueprint-platform/ui/input', names: ['HlmInput'] }],
  numberInput: [{ specifier: '@blueprint-platform/ui/input', names: ['HlmInput'] }],
  timePicker: [{ specifier: '@blueprint-platform/ui/input', names: ['HlmInput'] }],
  select: [{ specifier: '@blueprint-platform/ui/select', names: ['HlmSelectImports'] }],
  selectMultiple: [{ specifier: '@blueprint-platform/ui/select', names: ['HlmSelectImports'] }],
  combobox: [{ specifier: '@blueprint-platform/ui/combobox', names: ['HlmComboboxImports'] }],
  comboboxMultiple: [{ specifier: '@blueprint-platform/ui/combobox', names: ['HlmComboboxImports'] }],
  datePicker: [{ specifier: '@blueprint-platform/ui/date-picker', names: ['HlmDatePickerImports'] }],
  dateRangePicker: [{ specifier: '@blueprint-platform/ui/date-picker', names: ['HlmDatePickerImports'] }],
  inputOtp: [
    { specifier: '@blueprint-platform/ui/input-otp', names: ['HlmInputOtpImports'] },
    { specifier: '@spartan-ng/brain/input-otp', names: ['BrnInputOtpImports'] },
  ],
  attachment: [{ specifier: '@blueprint-platform/ui/attachment', names: ['HlmAttachmentImports'] }],
  radioGroup: [
    { specifier: '@blueprint-platform/ui/radio-group', names: ['HlmRadioGroupImports'] },
    { specifier: '@blueprint-platform/ui/label', names: ['HlmLabelImports'] },
  ],
  slider: [{ specifier: '@blueprint-platform/ui/slider', names: ['HlmSliderImports'] }],
  switchToggle: [{ specifier: '@blueprint-platform/ui/switch', names: ['HlmSwitchImports'] }],
  checkbox: [{ specifier: '@blueprint-platform/ui/checkbox', names: ['HlmCheckboxImports'] }],
  button: [{ specifier: '@blueprint-platform/ui/button', names: ['HlmButtonImports'] }],
  group: [],
  // The generated add/remove buttons.
  array: [{ specifier: '@blueprint-platform/ui/button', names: ['HlmButtonImports'] }],
};

/**
 * Lucide icons a field type's own markup references (only `attachment` does).
 * Not globally registered anywhere in a generated project — the generated
 * component registers what it needs itself. Validator error markup adds
 * `lucideCircleAlert` separately (see `ERROR_ICON`).
 */
const TYPE_ICONS: Partial<Record<FieldType, string[]>> = {
  attachment: ['lucideFileText', 'lucideX', 'lucidePaperclip'],
};

const ERROR_ICON = 'lucideCircleAlert';

const SAFE_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Initial-value source text for one control, as it appears in the generated
 * `[default, validators?]` tuple. Types are cast where a bare literal would
 * infer too narrowly under `nonNullable` (`null` → `Date | null`, `[]` →
 * `string[]`) so the control stays assignable later.
 */
function formatDefaultValue(entry: ControlFieldEntry): string {
  const value = entry.defaultValue !== undefined ? entry.defaultValue : DEFAULT_CONTROL_VALUES[entry.type];

  switch (entry.type) {
    case 'slider':
      return `${JSON.stringify(Array.isArray(value) ? value : [value])} as number[]`;
    case 'selectMultiple':
    case 'comboboxMultiple':
      return `${JSON.stringify(value)} as string[]`;
    case 'datePicker':
      return 'null as Date | null';
    case 'dateRangePicker':
      return 'null as [Date, Date] | null';
    case 'attachment':
      return 'null as File[] | null';
    case 'timePicker':
      return value === null ? 'null as string | null' : JSON.stringify(value);
    default:
      return JSON.stringify(value);
  }
}

export interface BuiltForm {
  /** The joined, rendered HTML for every field, in model order. */
  fieldsHtml: string;
  /** Deduplicated import list, `@blueprint-platform/ui/field` first when any control is present. */
  imports: ImportSpec[];
  /** Deduplicated, sorted lucide icon names to register — empty when none are needed. */
  iconNames: string[];
  /** Whether `NgIcon`/`provideIcons` are needed (`iconNames.length > 0`). */
  needsIcons: boolean;
  /** Pre-joined `this.fb.nonNullable.group({…})` entries, one per control, in model order. */
  formControlsCode: string;
  /** Whether the model has any control at all (a buttons-only model needs no form group content). */
  hasControls: boolean;
  /** Whether any control uses an Angular built-in validator — `Validators` is imported only then. */
  usesBuiltInValidators: boolean;
  /** Distinct `custom-validators` factories the model's controls call — imported only when non-empty. */
  customValidatorFns: string[];
  /** Whether any field is `attachment` — the class needs `removeAttachment`/`onAttachmentsSelected` stubs only then. */
  needsAttachmentHandlers: boolean;
  /** Whether any `array` entry exists — `FormArray` is imported from `@angular/forms` only then. */
  needsFormArray: boolean;
  /** Pre-indented class members for every array (accessor + add + remove), or `''`. */
  arrayMembersCode: string;
  /** One entry per unique button `handler` (two buttons may deliberately share one) — each becomes one stub method. */
  handlerNames: string[];
}

interface CollectState {
  importMap: Map<string, Set<string>>;
  iconSet: Set<string>;
  handlerNames: Set<string>;
  customFns: Set<string>;
  /** Class-member names generated for arrays — checked against button handlers. */
  memberNames: Set<string>;
  members: string[];
  usesBuiltIn: boolean;
  needsAttachmentHandlers: boolean;
  hasControls: boolean;
  needsFormArray: boolean;
}

function addImport(state: CollectState, { specifier, names }: ImportSpec): void {
  const existing = state.importMap.get(specifier) ?? new Set<string>();
  for (const name of names) existing.add(name);
  state.importMap.set(specifier, existing);
}

const controlKey = (name: string) => (SAFE_IDENTIFIER.test(name) ? name : JSON.stringify(name));

/**
 * Walks one sibling list, in model order, gathering everything the
 * `.ts.template` needs (imports, icons, handler stubs, validators, array
 * members) and returning the `this.fb.nonNullable.group({…})` entry lines for
 * these siblings. Groups and array rows recurse through here, so the same
 * logic builds nested groups and new-row groups at any depth.
 */
function collect(entries: FieldModelEntry[], ctx: RenderContext, state: CollectState): string[] {
  const lines: string[] = [];

  for (const entry of entries) {
    for (const spec of TYPE_IMPORTS[entry.type]) addImport(state, spec);
    for (const icon of TYPE_ICONS[entry.type] ?? []) state.iconSet.add(icon);

    if (entry.type === 'button') {
      state.handlerNames.add(entry.handler);
      continue;
    }

    if (entry.type === 'group') {
      const inner = collect(entry.fields, { ...ctx, path: [...ctx.path, entry.formControlName] }, state);
      lines.push(`    ${controlKey(entry.formControlName)}: this.fb.nonNullable.group({\n${inner.join('\n')}\n    }),`);
      continue;
    }

    if (entry.type === 'array') {
      state.needsFormArray = true;
      const n = arrayNames(entry, ctx);
      const rowCtx: RenderContext = {
        path: [...ctx.path, entry.formControlName, { index: n.indexVar }],
        idxVars: [...ctx.idxVars, n.indexVar],
      };
      const inner = collect(entry.itemTemplate, rowCtx, state);
      const row = `this.fb.nonNullable.group({\n${inner.join('\n')}\n    })`;
      const initial = Math.max(1, entry.minItems ?? 1);
      lines.push(
        `    ${controlKey(entry.formControlName)}: this.fb.array(${
          initial === 1 ? `[${row}]` : `Array.from({ length: ${initial} }, () => ${row})`
        }),`,
      );
      addArrayMembers(entry, n, ctx, row, state);
      continue;
    }

    state.hasControls = true;
    if (entry.type === 'attachment') state.needsAttachmentHandlers = true;

    const errorHtml = buildFieldErrorHtml(entry);
    if (errorHtml) state.iconSet.add(ERROR_ICON);

    const validators = buildControlValidators(entry);
    if (validators.usesBuiltIn) state.usesBuiltIn = true;
    validators.customFns.forEach((fn) => state.customFns.add(fn));

    lines.push(
      `    ${controlKey(entry.formControlName)}: [${formatDefaultValue(entry)}${validators.expression ? `, ${validators.expression}` : ''}],`,
    );
  }

  return lines;
}

/**
 * The fully-implemented (not stubbed) accessor + `add<Name>` + `remove<Name>`
 * for one array. A top-level-scope array gets a getter; one nested inside
 * another array's rows can only be reached per row, so it gets a method taking
 * the enclosing row indices. `add` builds a new row with the same builder
 * expression as the initial rows.
 */
function addArrayMembers(
  entry: ArrayFieldEntry,
  n: ReturnType<typeof arrayNames>,
  ctx: RenderContext,
  rowCode: string,
  state: CollectState,
): void {
  for (const name of [n.accessor, n.add, n.remove]) {
    if (state.memberNames.has(name) || RESERVED_HANDLER_NAMES.includes(name)) {
      throw new Error(
        `modules:form: array "${entry.formControlName}" would generate a class member named "${name}", which collides with another generated member — rename one of the colliding group/array keys.`,
      );
    }
    state.memberNames.add(name);
  }

  const params = ctx.idxVars.map((v) => `${v}: number`);
  const pathCode = pathExpression([...ctx.path, entry.formControlName]);
  const access = ctx.idxVars.length ? `this.${n.accessor}(${ctx.idxVars.join(', ')})` : `this.${n.accessor}`;
  const floor = entry.minItems ?? 1;

  const accessor = ctx.idxVars.length
    ? `  ${n.accessor}(${params.join(', ')}): FormArray {\n    return this.form.get(${pathCode}) as FormArray;\n  }`
    : `  get ${n.accessor}(): FormArray {\n    return this.form.get(${pathCode}) as FormArray;\n  }`;

  const maxGuard = entry.maxItems ? `    if (rows.length >= ${entry.maxItems}) return;\n` : '';
  const add = `  ${n.add}(${params.join(', ')}): void {\n    const rows = ${access};\n${maxGuard}    rows.push(${rowCode});\n  }`;

  const removeParams = [...params, `${n.indexVar}: number`];
  const remove = `  ${n.remove}(${removeParams.join(', ')}): void {\n    const rows = ${access};\n    if (rows.length <= ${floor}) return;\n    rows.removeAt(${n.indexVar});\n  }`;

  state.members.push(accessor, add, remove);
}

/** Renders every field in `entries` and computes everything the `.ts.template` needs to only import/register what this specific model actually uses. */
export function buildForm(entries: FieldModelEntry[]): BuiltForm {
  const state: CollectState = {
    importMap: new Map(),
    iconSet: new Set(),
    handlerNames: new Set(),
    customFns: new Set(),
    memberNames: new Set(),
    members: [],
    usesBuiltIn: false,
    needsAttachmentHandlers: false,
    hasControls: false,
    needsFormArray: false,
  };

  const controlLines = collect(entries, ROOT, state);
  const fieldsHtml = renderChildren(entries, ROOT);

  for (const handler of state.handlerNames) {
    if (state.memberNames.has(handler)) {
      throw new Error(
        `modules:form: button handler "${handler}" collides with a generated array member of the same name — rename the handler.`,
      );
    }
  }

  if (state.hasControls) addImport(state, FIELD_IMPORT);

  // Field module first, then in first-use order — stable, readable output.
  const ordered = [...state.importMap.entries()].sort(([a], [b]) =>
    a === FIELD_IMPORT.specifier ? -1 : b === FIELD_IMPORT.specifier ? 1 : 0,
  );

  return {
    fieldsHtml,
    imports: ordered.map(([specifier, names]) => ({ specifier, names: [...names].sort() })),
    iconNames: [...state.iconSet].sort(),
    needsIcons: state.iconSet.size > 0,
    formControlsCode: controlLines.join('\n'),
    hasControls: state.hasControls,
    usesBuiltInValidators: state.usesBuiltIn,
    customValidatorFns: [...state.customFns].sort(),
    needsAttachmentHandlers: state.needsAttachmentHandlers,
    needsFormArray: state.needsFormArray,
    arrayMembersCode: state.members.join('\n\n'),
    handlerNames: [...state.handlerNames],
  };
}
