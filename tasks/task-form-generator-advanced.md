# Task List: `modules:form` Generator — Nested Groups & Arrays

**Status: not yet implemented.** This builds on
`task-form-generator-core.md`, which is fully implemented and tested:
`{name, model, directory}` schema, 15 leaf control field types plus
`button`, declarative validators wired into real `Validators`/custom
validator calls, inline `<hlm-field-error>` error markup, and the
`NonNullableFormBuilder` `FormGroup` construction shape. Read that file
first — this one assumes every task in it is done and its files exist as
described.

The **only** thing this file adds is two new field types: `'group'` (a
nested `FormGroup`) and `'array'` (a repeatable `FormArray`), both able to
contain any other field — including further nested groups/arrays, with no
depth limit.

**Numbering note:** task numbers below are amendments to the core file's
own Task 1 / Task 2 / Task 3, plus one new feature-anchor task and a
`CLAUDE.md` amendment. Do the tasks in order (1, 2, 3, 4, 5).

---

## Task 1 — Extend `field-model.types.ts`

Amends the core file's `FieldType` and `FieldModelEntry`.

### 1.1 — `FieldType` grows to 18

```ts
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
```

### 1.2 — `GroupFieldEntry`, `ArrayFieldEntry`

Neither is form-control-backed the way the 15 leaf control types are (no
value-bearing leaf control) — though both still use `formControlName` as
their key in the parent, just not as a leaf value:

```ts
export interface GroupFieldEntry extends BaseEntryLayout {
  type: 'group';
  formControlName: string;
  fields: FieldModelEntry[]; // recursive — may itself contain groups/arrays
}

export interface ArrayFieldEntry extends BaseEntryLayout {
  type: 'array';
  formControlName: string;
  itemTemplate: FieldModelEntry[]; // shape of one item, rendered once, reused
  /** Default 1. Also the initial row count, except when explicitly 0. */
  minItems?: number;
  maxItems?: number;
  /** Cosmetic only — reuses ButtonVariant, no new styling vocabulary. */
  addButtonLabel?: string;    // default 'Add'
  removeButtonLabel?: string; // default 'Remove'
  addButtonVariant?: ButtonVariant;
  removeButtonVariant?: ButtonVariant;
}
```

`formControlName` is reused (not a new term like `name`) for both — one
consistent vocabulary across every node type in the model for "the key
this entry occupies in its parent." Recursion depth (a group inside an
array's `itemTemplate`, itself containing another array, etc.) is
unlimited by design — the generator doesn't police how deeply a form is
nested; that decomposition/UI judgment call is explicitly the
developer's, not something this generator enforces (this generator is a
shortcut/scaffold tool, not a low-code platform).

Neither type has a validators concept — `FieldValidatorsMap` and
`VALID_VALIDATOR_KEYS` (core file, Task 1.3/1.6) are unaffected and stay
scoped to `ControlFieldType`, which still deliberately excludes
`'group'`/`'array'` (along with `'button'`) as an explicit literal union
rather than an `Exclude<FieldType, ...>` expression — this is exactly why
that choice was made in the core file: adding these two members here
doesn't silently widen `ControlFieldType`.

### 1.3 — Extend the discriminated union

```ts
export type FieldModelEntry =
  | {
      [K in ControlFieldType]: BaseControlEntry & {
        type: K;
        validators?: FieldValidatorsMap[K];
      };
    }[ControlFieldType]
  | ButtonFieldEntry
  | GroupFieldEntry
  | ArrayFieldEntry;
```

`type: 'group'`/`type: 'array'` narrow to their own shapes the same way
`'button'` already does — TypeScript rejects `validators` on either, and
rejects `itemTemplate` on a group or `fields` on an array.

### 1.4 — Developer-facing docs

- Write clear TSDoc comments on `GroupFieldEntry`/`ArrayFieldEntry`.
- Extend the usage example in the file's comment to include one
  `'group'` and one `'array'` entry alongside the existing control/button
  examples.

---

## Task 2 — Extend `parseFieldModel`

Amends `parse-model.ts`. Two new branches alongside the existing
`'button'`/leaf-control branches:

1. Validate `type` against the (now 18-value) `FieldType` union.
2. **`type: 'group'`**: read `formControlName` and colSpans as literals;
   recurse into `fields` using this same element-processing logic on its
   array literal. Throw a clear error naming the group if `fields` is
   missing, empty, or not an array literal.
3. **`type: 'array'`**: read `formControlName`, `minItems`, `maxItems`,
   `addButtonLabel`, `removeButtonLabel`, `addButtonVariant`,
   `removeButtonVariant`, and colSpans as literals (validate the two
   variant fields against `ButtonVariant` the same way button entries
   validate `variant`); recurse into `itemTemplate` the same way. Throw a
   clear error if `itemTemplate` is missing or empty, or if
   `minItems`/`maxItems` are both given and `minItems > maxItems`.

This is the same literal-only, no-execution parsing the core file
established — extended with two more branches and made recursive for
`fields`/`itemTemplate`. No new safety model is needed.

**Extend the hand-run test list** (in addition to the core file's Task 2
tests):

- A `'group'` entry with 3+ nested control fields → correct nested
  structure back.
- An `'array'` entry whose `itemTemplate` has 2+ fields, one with
  `validators` → correct structure back, validators preserved.
- A group with an empty/missing `fields` → clear thrown error.
- An array with `minItems: 3, maxItems: 1` → clear thrown error.
- A group nested inside an array's `itemTemplate`, itself containing
  another array → correct structure back (confirms recursion isn't
  artificially depth-limited).

Do not proceed to Task 3 until all of these behave as expected.

---

## Task 3 — Extend rendering and `FormGroup` construction

Amends `form.ts`. `'group'`/`'array'` don't call a `field-renderers.ts`
function at all — they recurse into the same rendering and construction
logic already used for the 16 other field types.

### 3.1 — Rendering dispatch

```ts
function renderField(entry: FieldModelEntry, errorHtml: string): string {
  switch (entry.type) {
    // ...existing 15 leaf-control cases, and 'button' (core file)...
    case 'group': {
      const childFieldsHtml = entry.fields
        .map((child) => renderField(child, child.type === 'button' ? '' : buildFieldErrorHtml(child)))
        .join('\n');
      return `<div formGroupName="${entry.formControlName}" class="col-span-full grid grid-cols-12 gap-4">${childFieldsHtml}</div>`;
      // confirm the grid-wrapper classes against gridSpanClass()'s own convention
    }
    case 'array': {
      const itemFieldsHtml = entry.itemTemplate
        .map((child) => renderField(child, child.type === 'button' ? '' : buildFieldErrorHtml(child)))
        .join('\n');
      // emit the @for/formArrayName wrapper with add/remove buttons —
      // see below for the full markup shape
      return buildArrayFieldHtml(entry, itemFieldsHtml);
    }
    default: {
      const _exhaustive: never = entry;
      throw new Error(`Unhandled field type: ${(_exhaustive as FieldModelEntry).type}`);
    }
  }
}
```

The `never`-typed `default` branch is the compile-time safety net: adding
a 19th `FieldType` later without a matching `case` becomes a compile
error here.

**Group** is fully static — no new Angular control-flow. Its
`fieldsHtml` is built once (recursively) and wrapped in a `formGroupName`
div. `field-renderers.ts`'s functions need no changes for this — the
wrapper is generator-owned scaffolding around a `fieldsHtml` fragment,
the same composition pattern already used for the whole form.

**Array** needs real runtime repetition, since row count can change
after the form is built. The per-row markup (`itemFieldsHtml`) is
rendered once and reused via `@for`:

```html
<div formArrayName="${formControlName}" class="col-span-full flex flex-col gap-4">
  @for (item of ${formControlName}Array.controls; track item; let i = $index) {
    <div [formGroupName]="i" class="grid grid-cols-12 gap-4 border rounded-lg p-4">
      ${itemFieldsHtml}
      <button hlmBtn variant="${removeButtonVariant ?? 'ghost'}" type="button"
              [disabled]="${formControlName}Array.length <= ${minItems ?? 1}"
              (click)="remove${Capitalized}(i)">${removeButtonLabel ?? 'Remove'}</button>
    </div>
  }
  <button hlmBtn variant="${addButtonVariant ?? 'outline'}" type="button"
          ${maxItems ? `[disabled]="${formControlName}Array.length >= ${maxItems}"` : ''}
          (click)="add${Capitalized}()">${addButtonLabel ?? 'Add'}</button>
</div>
```

(`${Capitalized}` = `formControlName` with its first letter upper-cased,
for method names `addPhones`/`removePhones` — confirm against whatever
casing convention the generated component already uses.) The remove
button's `[disabled]` binding and the `removeX(i)` method's own internal
floor check (Task 3.3 below) are two independent layers of the same
rule — the binding is UX, the method's check is defensive. Deliberately
**no separate `FormArray`-length validator/error message** — the UI and
methods together already make `minItems`/`maxItems` unreachable through
normal use.

**Import trimming**: extend the only-if-used rule to `FormArray`
(type-only, for the generated getter — Task 3.3), needed only when the
model contains at least one `'array'` entry.

### 3.2 — Object-literal building, extended for group/array

Per the core file's Task 3.6.3 (per-control tuple), add:

- **Group** → `formControlName: this.fb.group({ ...recursively built
  entries from `fields`... })` — same logic applied one level down.
  `NonNullableFormBuilder` composes through nested `.group()` calls
  without extra ceremony; confirm this compiles cleanly with the exact
  Angular version in use before assuming it.
- **Array** → `formControlName: this.fb.array([ ...initial rows... ])`,
  where the initial row count is `minItems` when `minItems >= 1`, else
  `1` when `minItems` is exactly `0` (there's always a starting row, but
  it's removable when `minItems` is `0`), and each initial row is
  `this.fb.nonNullable.group({ ...itemTemplate entries, same recursive
  logic... })`.

### 3.3 — Generated `FormArray` getter and add/remove methods

Per array entry:

```ts
get ${formControlName}Array(): FormArray {
  return this.form.get('${formControlName}') as FormArray;
}

add${Capitalized}(): void {
  if (${maxItems != null} && this.${formControlName}Array.length >= ${maxItems}) return;
  this.${formControlName}Array.push(this.fb.nonNullable.group({ /* itemTemplate, same builder */ }));
}

remove${Capitalized}(i: number): void {
  if (this.${formControlName}Array.length <= ${minItems ?? 1}) return;
  this.${formControlName}Array.removeAt(i);
}
```

(`${Capitalized}` = `formControlName` with its first letter upper-cased —
confirm against whatever casing convention the rest of the generated
component already uses for method names.) These are **fully generated,
not stubs** — unlike a button's `handler`, there's no arbitrary developer
logic involved; the shape of a new row is already fully known from
`itemTemplate` at generation time. Each control's `defaultValue`
(core file, Task 1.2/3.6.3) is used the same way inside a new row as it
is for the initial rows.

### 3.4 — Handler-stub generation, extended

Task 3.5.3 in the core file collects button `handler` names across the
parsed model — extend that collection to recurse into any `'group'`'s
`fields` and any `'array'`'s `itemTemplate`, so a button nested inside a
group or array still gets its stub generated.

### 3.5 — Testing addition (extends the core file's Task 6)

Build-time check: confirm `renderField`'s exhaustiveness check actually
fails the build when the `'group'` or `'array'` case is removed
(temporarily remove one, confirm a build error, then restore it).

---

## Task 4 — Feature summary and design decisions

**Design decisions (confirmed with the user):**

- Recursion depth is unlimited — a group inside an array's
  `itemTemplate`, itself containing another array, is valid. The
  generator doesn't police how deeply a form is nested; splitting a form
  into sub-components for readability is the developer's call, not a
  low-code-platform concern this generator takes on.
- Array add/remove is always generator-owned, never authored via `type:
  'button'` inside `itemTemplate` — a per-row remove handler needs the
  row index, which doesn't fit the plain-handler-name model buttons use.
- `minItems` defaults to `1`; the initial row count is `minItems` when
  it's `≥ 1`, or `1` when it's explicitly `0` (a form always starts with
  one visible row, but that row is removable when `minItems` is `0`).
  The remove button (and the `removeX(i)` method) is disabled/no-ops once
  the array's length reaches `minItems`.
- No separate `FormArray`-length validator/error message exists — the
  generated buttons and methods already make the floor/ceiling
  unreachable through normal use; adding a validator on top would only
  ever fire from code bypassing the generated methods entirely.
- Cross-field validation spanning a group's controls is out of scope,
  same reasoning as custom validator functions (core file, Further
  Recommendations) — not safely expressible as a parseable literal.

### 4.1 — Testing addition (extends the core file's Task 6)

- Extend the sample model with one `'group'` entry (e.g. an address with
  3 fields) and one `'array'` entry (e.g. phone numbers with 2 fields,
  one of them carrying a validator).
- Confirm in the running reference app / generated output:
  - The group renders as a nested block; `form.get('address.street')`
    resolves to the right control (confirms `formGroupName`/relative
    `formControlName` nesting works exactly as Angular's own dot-path
    `get()` expects, with no changes needed to `field-renderers.ts`).
  - The array renders with exactly one row on load when `minItems`
    defaults to `1`; its remove button is disabled at exactly one row.
  - Setting `minItems: 0` on a test array still starts with one row, but
    that row's remove button is enabled and removing it goes to zero
    rows.
  - `maxItems` correctly disables the add button once reached, and
    `addPhones()`/`removePhones(i)` called directly (not just via the
    buttons) respect the same floor/ceiling.
  - A validator on an `itemTemplate` field still produces its
    `<hlm-field-error>` correctly inside each generated row, confirming
    the core file's error rendering composes through the recursion
    without changes.
  - A button nested inside a group or an array's `itemTemplate` still
    gets exactly one stub method generated (Task 3.4).
  - A group nested inside an array's `itemTemplate` (the deep-recursion
    case from Task 2's test list) generates and renders correctly,
    confirming no artificial depth limit is silently baked into the
    rendering or construction logic.

---

## Task 5 — Update `CLAUDE.md`

Add an entry (alongside the core file's entries) documenting:

- That `'group'` and `'array'` are real field types, letting a
  `bp.models` entry be a nested `FormGroup` or a repeatable `FormArray`.
  Recursion is unlimited by design. Array add/remove is always
  generator-owned and, unlike button handlers, the generated
  `addX()`/`removeX(i)` methods are fully implemented, not stubs.
  `minItems` defaults to `1` (the last row is non-removable); `minItems:
  0` still starts with one row but allows removing it. No separate
  `FormArray`-length validator exists.

---

## Further Recommendations (outside the task list proper)

1. **A `--list` flag** (or equivalent) that prints the (now 18) supported
   `FieldType` values and exits — extends the core file's own
   recommendation to the grown type list.
</content>
