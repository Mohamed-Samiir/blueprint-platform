/**
 * Every field shape `packages/modules/src/generators/form/lib/field-renderers.ts`
 * knows how to render — one entry per exported render function in that file.
 * Fifteen are leaf form controls (`ControlFieldType`); `'button'` is a real,
 * developer-placed entry too, but is *not* control-backed (no validators) —
 * see `ButtonFieldEntry`. `'group'` (a nested `FormGroup`) and `'array'` (a
 * repeatable `FormArray`) are containers of other entries — see
 * `GroupFieldEntry` / `ArrayFieldEntry`.
 */
export type FieldType =
  | 'textInput'
  | 'numberInput'
  | 'timePicker'
  | 'select'
  | 'selectMultiple'
  | 'combobox'
  | 'comboboxMultiple'
  | 'datePicker'
  | 'dateRangePicker'
  | 'inputOtp'
  | 'attachment'
  | 'radioGroup'
  | 'slider'
  | 'switchToggle'
  | 'checkbox'
  | 'button'
  | 'group'
  | 'array';

/**
 * The 15 leaf control-backed field types. An explicit literal union on
 * purpose (not `Exclude<FieldType, ...>`): adding a `FieldType` must not
 * silently widen this — `'group'`/`'array'`/`'button'` carry no validators.
 */
export type ControlFieldType =
  | 'textInput'
  | 'numberInput'
  | 'timePicker'
  | 'select'
  | 'selectMultiple'
  | 'combobox'
  | 'comboboxMultiple'
  | 'datePicker'
  | 'dateRangePicker'
  | 'inputOtp'
  | 'attachment'
  | 'radioGroup'
  | 'slider'
  | 'switchToggle'
  | 'checkbox';

/** A validator value: a bare value, or `{ value, message }` to override the default error message. */
export type ValidatorValue<T> = T | { value: T; message?: string };

/** Shared by every control type except the toggles. `required: 'text'` is a custom message. */
export interface BaseValidators {
  required?: boolean | string;
}

/** `textInput`, `inputOtp`. */
export interface TextValidators extends BaseValidators {
  minLength?: ValidatorValue<number>;
  maxLength?: ValidatorValue<number>;
  pattern?: ValidatorValue<string>;
  email?: boolean | string;
}

/** `numberInput`, `slider`. */
export interface NumericValidators extends BaseValidators {
  min?: ValidatorValue<number>;
  max?: ValidatorValue<number>;
}

/** `datePicker`, `timePicker` (a time bound is `'HH:mm'`, a date bound is an ISO date string). */
export interface DateValidators extends BaseValidators {
  minDate?: ValidatorValue<string>;
  maxDate?: ValidatorValue<string>;
}

/** `dateRangePicker`. */
export interface DateRangeValidators extends BaseValidators {
  minDate?: ValidatorValue<string>;
  maxDate?: ValidatorValue<string>;
  minRangeDays?: ValidatorValue<number>;
  maxRangeDays?: ValidatorValue<number>;
}

/** `select`, `combobox`, `radioGroup`. */
export type SingleSelectionValidators = BaseValidators;

/** `selectMultiple`, `comboboxMultiple`. */
export interface MultiSelectionValidators extends BaseValidators {
  minSelected?: ValidatorValue<number>;
  maxSelected?: ValidatorValue<number>;
}

/**
 * `switchToggle`, `checkbox`. Deliberately does NOT extend `BaseValidators`:
 * `required` is meaningless for a boolean control — the real constraint is
 * "must be true".
 */
export interface ToggleValidators {
  requiredTrue?: boolean | string;
}

/** `attachment`. */
export interface AttachmentValidators extends BaseValidators {
  maxFileSizeMb?: ValidatorValue<number>;
  allowedExtensions?: ValidatorValue<string[]>;
  maxFiles?: ValidatorValue<number>;
}

/** Which validators interface each control type accepts. */
export interface FieldValidatorsMap {
  textInput: TextValidators;
  inputOtp: TextValidators;
  numberInput: NumericValidators;
  slider: NumericValidators;
  datePicker: DateValidators;
  timePicker: DateValidators;
  dateRangePicker: DateRangeValidators;
  select: SingleSelectionValidators;
  combobox: SingleSelectionValidators;
  radioGroup: SingleSelectionValidators;
  selectMultiple: MultiSelectionValidators;
  comboboxMultiple: MultiSelectionValidators;
  switchToggle: ToggleValidators;
  checkbox: ToggleValidators;
  attachment: AttachmentValidators;
}

/**
 * Runtime companion to `FieldValidatorsMap` — `ts-morph` reads the AST, not
 * compiled types, so a hand-written or type-check-bypassing model file can
 * still carry an invalid combination; `parseFieldModel` checks against this.
 *
 * **`FieldValidatorsMap` (and the interfaces above) and this table must be
 * updated together** — TypeScript cannot check that a hand-maintained
 * `Record` of string literals stays in sync with a hand-maintained set of
 * interfaces. That sync is a manual discipline point.
 *
 * Key names are deliberately disjoint in meaning across families (`min`/`max`
 * always numeric bounds, `minDate`/`maxDate` always date bounds,
 * `minSelected`/`maxSelected` always selection-count bounds), so the default
 * message and runtime-error-key lookups stay single flat tables.
 */
export const VALID_VALIDATOR_KEYS: Record<ControlFieldType, readonly string[]> = {
  textInput: ['required', 'minLength', 'maxLength', 'pattern', 'email'],
  inputOtp: ['required', 'minLength', 'maxLength', 'pattern', 'email'],
  numberInput: ['required', 'min', 'max'],
  slider: ['required', 'min', 'max'],
  datePicker: ['required', 'minDate', 'maxDate'],
  timePicker: ['required', 'minDate', 'maxDate'],
  dateRangePicker: ['required', 'minDate', 'maxDate', 'minRangeDays', 'maxRangeDays'],
  select: ['required'],
  combobox: ['required'],
  radioGroup: ['required'],
  selectMultiple: ['required', 'minSelected', 'maxSelected'],
  comboboxMultiple: ['required', 'minSelected', 'maxSelected'],
  switchToggle: ['requiredTrue'],
  checkbox: ['requiredTrue'],
  attachment: ['required', 'maxFileSizeMb', 'allowedExtensions', 'maxFiles'],
};

/** Fallback initial control value per control type, when `defaultValue` is omitted (Task 10.2). */
export const DEFAULT_CONTROL_VALUES: Record<ControlFieldType, string | number | boolean | string[] | number[] | null> = {
  textInput: '',
  inputOtp: '',
  select: '',
  combobox: '',
  radioGroup: '',
  numberInput: 0,
  // Slider's own markup reads `value[0]` and `hlm-slider` is multi-thumb-capable
  // (array-valued) — a bare `0` would make `value[0]` silently `undefined`.
  slider: [0],
  switchToggle: false,
  checkbox: false,
  datePicker: null,
  timePicker: null,
  dateRangePicker: null,
  selectMultiple: [],
  comboboxMultiple: [],
  attachment: null,
};

/** Method names the generated component class already defines — a button `handler` may not reuse them. */
export const RESERVED_HANDLER_NAMES: readonly string[] = [
  'form',
  'fb',
  'constructor',
  'ngOnInit',
  'ngOnDestroy',
  'removeAttachment',
  'onAttachmentsSelected',
];

/** Layout props shared by every entry, button included. `label` is a button's text. */
export interface BaseEntryLayout {
  label: string;
  /** Base `col-span-*` inside the generated form's 12-column grid. Pass `0` for none at a breakpoint, not `undefined`. */
  colSpan: number;
  /** `sm:col-span-*` — `0` means no override. */
  colSpanSm: number;
  /** `md:col-span-*` — `0` means no override. */
  colSpanMd: number;
}

/** Layout props plus the control-backed props — matches `PilotFieldConfig` in `field-renderers.ts`. */
export interface BaseControlEntry extends BaseEntryLayout {
  /** Matches the `formControlName` on the generated reactive control. */
  formControlName: string;
  /** Initial control value. Omit for the per-type fallback (see `DEFAULT_CONTROL_VALUES`). */
  defaultValue?: string | number | boolean | string[] | null;
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

/**
 * A button, placed in the same array as ordinary fields, wherever the
 * developer wants it. Not control-backed: no `formControlName`, no
 * `validators`.
 */
export interface ButtonFieldEntry extends BaseEntryLayout {
  type: 'button';
  /**
   * Name of the click-handler method the generator stubs out on the generated
   * component class. A name, not code — never executed by the generator.
   * Two buttons may share a name; one stub is generated.
   */
  handler: string;
  /** Defaults to `'primary'`. */
  variant?: ButtonVariant;
}

/** One control entry of a given type — `validators` narrows to that type's interface. */
export type ControlFieldEntry<K extends ControlFieldType = ControlFieldType> = {
  [T in K]: BaseControlEntry & { type: T; validators?: FieldValidatorsMap[T] };
}[K];

/**
 * One field in a developer-authored `bp.models/<name>.ts` file — the input
 * `nx g @blueprint-platform/modules:form` reads. **You author that file;
 * it is never generated for you.** A discriminated union keyed by `type`, so
 * `validators` narrows per field type (a `checkbox` rejects `pattern`) and a
 * `'button'` rejects `formControlName`/`validators` at compile time.
 *
 * ```ts
 * // bp.models/user.ts
 * import type { FieldModelEntry } from '@blueprint-platform/modules';
 *
 * export const fields: FieldModelEntry[] = [
 *   {
 *     type: 'textInput', formControlName: 'email', label: 'Email',
 *     colSpan: 12, colSpanSm: 6, colSpanMd: 6,
 *     validators: { required: true, email: 'Enter a valid email' },
 *   },
 *   { type: 'checkbox', formControlName: 'terms', label: 'Accept terms',
 *     colSpan: 12, colSpanSm: 12, colSpanMd: 12, validators: { requiredTrue: true } },
 *   { type: 'button', label: 'Save', handler: 'onSave', variant: 'primary',
 *     colSpan: 12, colSpanSm: 6, colSpanMd: 3 },
 *   // A nested FormGroup — `form.get('address.street')`:
 *   { type: 'group', formControlName: 'address', label: 'Address',
 *     colSpan: 12, colSpanSm: 12, colSpanMd: 12,
 *     fields: [
 *       { type: 'textInput', formControlName: 'street', label: 'Street',
 *         colSpan: 12, colSpanSm: 6, colSpanMd: 6, validators: { required: true } },
 *     ] },
 *   // A repeatable FormArray of rows shaped by `itemTemplate`:
 *   { type: 'array', formControlName: 'phones', label: 'Phones',
 *     colSpan: 12, colSpanSm: 12, colSpanMd: 12, minItems: 1, maxItems: 5,
 *     itemTemplate: [
 *       { type: 'textInput', formControlName: 'number', label: 'Number',
 *         colSpan: 12, colSpanSm: 6, colSpanMd: 6, validators: { required: true } },
 *     ] },
 * ];
 * ```
 *
 * The exported array's variable name doesn't matter — it's found by shape.
 */
export type FieldModelEntry = ControlFieldEntry | ButtonFieldEntry | GroupFieldEntry | ArrayFieldEntry;

/**
 * A nested `FormGroup`. Rendered as a `formGroupName` block; its `fields` are
 * ordinary entries (controls, buttons, further groups/arrays — no depth
 * limit). Names inside `fields` are scoped to the group, so two groups may
 * each have a `street`. No `validators`/`defaultValue` of its own —
 * cross-field validation isn't expressible as a parseable literal.
 */
export interface GroupFieldEntry extends BaseEntryLayout {
  type: 'group';
  /** The key this group occupies in its parent (`form.get('<name>')`). */
  formControlName: string;
  /** Recursive — may itself contain groups/arrays. Must be non-empty. */
  fields: FieldModelEntry[];
}

/**
 * A repeatable `FormArray` of rows. `itemTemplate` is the shape of ONE row
 * (rendered once, repeated per row at runtime; recursion is unlimited).
 * Add/remove is always generator-owned — the generated `add<Name>()` /
 * `remove<Name>(i)` methods are fully implemented, not stubs, and are
 * bounded by `minItems`/`maxItems`. Don't put a `type: 'button'` in
 * `itemTemplate` to add/remove rows: a per-row remove needs the row index.
 */
export interface ArrayFieldEntry extends BaseEntryLayout {
  type: 'array';
  /** The key this array occupies in its parent (`form.get('<name>')`). */
  formControlName: string;
  /** Shape of one row. Must be non-empty. */
  itemTemplate: FieldModelEntry[];
  /** Default 1. Also the initial row count, except when explicitly 0 (still starts with one row, but it's removable). */
  minItems?: number;
  maxItems?: number;
  /** Default 'Add'. */
  addButtonLabel?: string;
  /** Default 'Remove'. */
  removeButtonLabel?: string;
  /** Default 'outline'. */
  addButtonVariant?: ButtonVariant;
  /** Default 'ghost'. */
  removeButtonVariant?: ButtonVariant;
}
