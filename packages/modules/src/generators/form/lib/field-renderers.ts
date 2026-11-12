import type { ButtonFieldEntry } from './field-model.types';

/*
 * GENERATOR-DRIVEN EDITS to a user-authored file (both deliberate; nothing else changed):
 *
 * 1. The 15 control renderers take a second `errorHtml: string = ''` parameter
 *    and splice it in right after their control, inside their own wrapper, so
 *    validator error text sits with its field. The renderers still contain NO
 *    validator logic and compose NO error text — they only splice in the string
 *    they're handed (`build-error-html.ts` builds it). With `errorHtml` empty
 *    the output is unchanged, EXCEPT `checkbox`: its original hard-coded
 *    "must be checked" error block was demo validator markup and is replaced by
 *    `${errorHtml}`. `radioGroup` additionally wraps its control + errors in
 *    an inner `<hlm-field>` when errors exist (a fieldset provides no `BrnField`).
 * 2. `button` changed from a every-variant-and-state showcase to one real,
 *    wired-up button (`button(config: ButtonFieldEntry)`), because 'button' is
 *    now a real, developer-placed field type.
 */

export interface PilotFieldConfig {
  /** Matches the `formControlName` on the generated reactive form control. */
  formControlName: string;
  /** Visible label text (and the basis for generated error copy). */
  label: string;
  /** Base `col-span-*` (no breakpoint prefix). */
  colSpan: number;
  /** `sm:col-span-*` */
  colSpanSm: number;
  /** `md:col-span-*` */
  colSpanMd: number;
}

function gridSpanClass(config: Pick<PilotFieldConfig, 'colSpan' | 'colSpanSm' | 'colSpanMd'>): string {
  return `col-span-${config.colSpan} ${config.colSpanSm ? 'sm:col-span-' + config.colSpanSm : ''} ${config.colSpanMd ? 'md:col-span-' + config.colSpanMd : ''}`;
}

/** Input text — `hlmInput`. */
export function textInput(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <input hlmInput id="${config.formControlName}" formControlName="${config.formControlName}" placeholder="${config.label}" />${errorHtml}
</hlm-field>`;
}

/** Input number — `hlmInput type="number"`. */
export function numberInput(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <input hlmInput id="${config.formControlName}" type="number" min="1" formControlName="${config.formControlName}" />${errorHtml}
</hlm-field>`;
}

/**
 * Time picker — no dedicated spartan component (confirmed against
 * https://spartan.ng/components), so this is a native `<input type="time">`
 * styled with `hlmInput`.
 */
export function timePicker(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <input hlmInput id="${config.formControlName}" type="time" formControlName="${config.formControlName}" />${errorHtml}
</hlm-field>`;
}

/** Dropdown / single select — `hlm-select`, scrollable content. */
export function select(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-select formControlName="${config.formControlName}">
    <hlm-select-trigger id="${config.formControlName}" class="w-full">
      <hlm-select-value placeholder="${config.label}" />
    </hlm-select-trigger>
    <hlm-select-content *hlmSelectPortal [showScroll]="true">
      <hlm-select-group>
        <hlm-select-label>${config.label}</hlm-select-label>
        <hlm-select-item value="option-1">Option 1</hlm-select-item>
        <hlm-select-item value="option-2">Option 2</hlm-select-item>
        <hlm-select-item value="option-3">Option 3</hlm-select-item>
      </hlm-select-group>
    </hlm-select-content>
  </hlm-select>${errorHtml}
</hlm-field>`;
}

/** Dropdown multi / multi-select — `hlm-select-multiple`, scrollable content. */
export function selectMultiple(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-select-multiple formControlName="${config.formControlName}">
    <hlm-select-trigger id="${config.formControlName}" class="w-full">
      <hlm-select-placeholder>${config.label}</hlm-select-placeholder>
      <ng-template hlmSelectValues let-values>
        <hlm-select-values-content>
          {{ values[0] }}
          @if (values.length > 1) {
            (+{{ values.length - 1 }} more)
          }
        </hlm-select-values-content>
      </ng-template>
    </hlm-select-trigger>
    <hlm-select-content *hlmSelectPortal [showScroll]="true">
      <hlm-select-group>
        <hlm-select-label>${config.label}</hlm-select-label>
        <hlm-select-item value="option-1">Option 1</hlm-select-item>
        <hlm-select-item value="option-2">Option 2</hlm-select-item>
        <hlm-select-item value="option-3">Option 3</hlm-select-item>
      </hlm-select-group>
    </hlm-select-content>
  </hlm-select-multiple>${errorHtml}
</hlm-field>`;
}

/** Searchable combobox (single select) — `hlm-combobox`. */
export function combobox(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-combobox formControlName="${config.formControlName}">
    <hlm-combobox-input id="${config.formControlName}" placeholder="${config.label}" showClear />
    <hlm-combobox-content *hlmComboboxPortal>
      <hlm-combobox-empty>No results found.</hlm-combobox-empty>
      <div hlmComboboxList>
        <hlm-combobox-item value="option-1">Option 1</hlm-combobox-item>
        <hlm-combobox-item value="option-2">Option 2</hlm-combobox-item>
        <hlm-combobox-item value="option-3">Option 3</hlm-combobox-item>
      </div>
    </hlm-combobox-content>
  </hlm-combobox>${errorHtml}
</hlm-field>`;
}

/** Searchable combobox (multi-select, chips) — `hlm-combobox-multiple`. */
export function comboboxMultiple(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-combobox-multiple formControlName="${config.formControlName}">
    <hlm-combobox-chips>
      <hlm-combobox-chip value="option-1">Option 1</hlm-combobox-chip>
      <hlm-combobox-chip value="option-2">Option 2</hlm-combobox-chip>
      <hlm-combobox-chip value="option-3">Option 3</hlm-combobox-chip>
      <input hlmComboboxChipInput id="${config.formControlName}" placeholder="${config.label}" />
    </hlm-combobox-chips>
    <hlm-combobox-content *hlmComboboxPortal>
      <hlm-combobox-empty>No results found.</hlm-combobox-empty>
      <div hlmComboboxList>
        <hlm-combobox-item value="option-1">Option 1</hlm-combobox-item>
        <hlm-combobox-item value="option-2">Option 2</hlm-combobox-item>
        <hlm-combobox-item value="option-3">Option 3</hlm-combobox-item>
      </div>
    </hlm-combobox-content>
  </hlm-combobox-multiple>${errorHtml}
</hlm-field>`;
}

/** Date picker — `hlm-date-picker`. */
export function datePicker(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-date-picker formControlName="${config.formControlName}">
    <hlm-date-picker-trigger id="${config.formControlName}" class="w-full">
      ${config.label}
    </hlm-date-picker-trigger>
  </hlm-date-picker>${errorHtml}
</hlm-field>`;
}

/** Date range picker — `hlm-date-range-picker`. */
export function dateRangePicker(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-date-range-picker formControlName="${config.formControlName}">
    <hlm-date-picker-trigger id="${config.formControlName}" class="w-full">
      ${config.label}
    </hlm-date-picker-trigger>
  </hlm-date-range-picker>${errorHtml}
</hlm-field>`;
}

/** Input OTP — `brn-input-otp` + `hlm-input-otp-*` (fixed 6 slots, 3+3 grouped). */
export function inputOtp(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}-0">${config.label}</label>
  <brn-input-otp hlmInputOtp length="6" formControlName="${config.formControlName}">
    <hlm-input-otp-group>
      <hlm-input-otp-slot index="0" id="${config.formControlName}-0" />
      <hlm-input-otp-slot index="1" />
      <hlm-input-otp-slot index="2" />
    </hlm-input-otp-group>
    <hlm-input-otp-separator />
    <hlm-input-otp-group>
      <hlm-input-otp-slot index="3" />
      <hlm-input-otp-slot index="4" />
      <hlm-input-otp-slot index="5" />
    </hlm-input-otp-group>
  </brn-input-otp>${errorHtml}
</hlm-field>`;
}

/**
 * Attachment — `hlm-attachment` file upload. The 3 uploaded-file cards
 * (originally `@for (file of attachments(); track file)`) are static
 * placeholders here; the "Add file" idle tile and hidden native
 * `<input type="file">` trigger are unconditional, so they're left as-is.
 */
export function attachment(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel>${config.label}</label>
  <div hlmAttachmentGroup>
    <div hlmAttachment size="sm">
      <div hlmAttachmentMedia>
        <ng-icon name="lucideFileText" />
      </div>
      <div hlmAttachmentContent>
        <span hlmAttachmentTitle>file-1.pdf</span>
        <span hlmAttachmentDescription>1.2 MB</span>
      </div>
      <div hlmAttachmentActions>
        <button hlmAttachmentAction type="button" aria-label="Remove file" (click)="removeAttachment('file-1.pdf')">
          <ng-icon name="lucideX" />
        </button>
      </div>
    </div>
    <div hlmAttachment size="sm">
      <div hlmAttachmentMedia>
        <ng-icon name="lucideFileText" />
      </div>
      <div hlmAttachmentContent>
        <span hlmAttachmentTitle>file-2.png</span>
        <span hlmAttachmentDescription>842 KB</span>
      </div>
      <div hlmAttachmentActions>
        <button hlmAttachmentAction type="button" aria-label="Remove file" (click)="removeAttachment('file-2.png')">
          <ng-icon name="lucideX" />
        </button>
      </div>
    </div>
    <div hlmAttachment size="sm">
      <div hlmAttachmentMedia>
        <ng-icon name="lucideFileText" />
      </div>
      <div hlmAttachmentContent>
        <span hlmAttachmentTitle>file-3.docx</span>
        <span hlmAttachmentDescription>318 KB</span>
      </div>
      <div hlmAttachmentActions>
        <button hlmAttachmentAction type="button" aria-label="Remove file" (click)="removeAttachment('file-3.docx')">
          <ng-icon name="lucideX" />
        </button>
      </div>
    </div>
    <div hlmAttachment state="idle" size="sm">
      <div hlmAttachmentMedia>
        <ng-icon name="lucidePaperclip" />
      </div>
      <div hlmAttachmentContent>
        <span hlmAttachmentTitle>Add file</span>
        <span hlmAttachmentDescription>Click to browse</span>
      </div>
      <button hlmAttachmentTrigger type="button" aria-label="Add attachment" (click)="attachmentInput.click()"></button>
    </div>
  </div>
  <input #attachmentInput type="file" multiple class="hidden" (change)="onAttachmentsSelected($event)" />${errorHtml}
</hlm-field>`;
}

/**
 * Radio group — `hlm-radio-group`, wrapped in `fieldset[hlmFieldSet]` + `legend[hlmFieldLegend]`.
 *
 * `fieldset[hlmFieldSet]` does NOT provide `BrnField` (only `hlm-field`/
 * `[hlmField]` does), and `hlm-field-error` with no parent field is
 * *always displayed* — so when `errorHtml` is non-empty, the group and its
 * errors are wrapped in an inner `<hlm-field>` that gives the errors a field
 * to read the control from. With no errors the output is unchanged.
 */
export function radioGroup(config: PilotFieldConfig, errorHtml: string = ''): string {
  const group = `
  <hlm-radio-group formControlName="${config.formControlName}" class="gap-2">
    <div class="flex items-center gap-3">
      <hlm-radio value="option-1" inputId="${config.formControlName}-option-1">
        <hlm-radio-indicator indicator />
      </hlm-radio>
      <label hlmLabel for="${config.formControlName}-option-1">Option 1</label>
    </div>
    <div class="flex items-center gap-3">
      <hlm-radio value="option-2" inputId="${config.formControlName}-option-2">
        <hlm-radio-indicator indicator />
      </hlm-radio>
      <label hlmLabel for="${config.formControlName}-option-2">Option 2</label>
    </div>
    <div class="flex items-center gap-3">
      <hlm-radio value="option-3" inputId="${config.formControlName}-option-3">
        <hlm-radio-indicator indicator />
      </hlm-radio>
      <label hlmLabel for="${config.formControlName}-option-3">Option 3</label>
    </div>
  </hlm-radio-group>`;
  const body = errorHtml ? `
  <hlm-field>${group}${errorHtml}
  </hlm-field>` : group;
  return `
<fieldset hlmFieldSet class="${gridSpanClass(config)}">
  <legend hlmFieldLegend variant="label">${config.label}</legend>${body}
</fieldset>`;
}

/** Slider — `hlm-slider`. */
export function slider(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label} — {{ form.controls.${config.formControlName}.value[0] }}%</label>
  <hlm-slider id="${config.formControlName}" formControlName="${config.formControlName}" [min]="0" [max]="100" [step]="1" />${errorHtml}
</hlm-field>`;
}

/** Switch — `hlm-switch`, horizontal field orientation (label beside the control). */
export function switchToggle(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field orientation="horizontal" class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-switch id="${config.formControlName}" formControlName="${config.formControlName}" />${errorHtml}
</hlm-field>`;
}

/** Checkbox — `hlm-checkbox`, horizontal field orientation (label beside the control). */
export function checkbox(config: PilotFieldConfig, errorHtml: string = ''): string {
  return `
<hlm-field orientation="horizontal" class="${gridSpanClass(config)}">
  <label hlmFieldLabel for="${config.formControlName}">${config.label}</label>
  <hlm-checkbox inputId="${config.formControlName}" formControlName="${config.formControlName}" />${errorHtml}
</hlm-field>`;
}

/** Model-facing button variant → `HlmButton`'s own `variant` input (`primary` has no 1:1 name — it's `default`). */
const BUTTON_VARIANT_MAP: Record<NonNullable<ButtonFieldEntry['variant']>, string> = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
};

/**
 * One real, wired-up button (rewritten from the original every-variant
 * showcase — see the note at the top of this file). Placed in the same grid
 * as the field renderers via `gridSpanClass`; `type="button"` so it never
 * submits a surrounding form by accident; `flex items-end` so it aligns with
 * the control row of neighbouring labelled fields rather than their labels.
 */
export function button(config: ButtonFieldEntry): string {
  const variant = BUTTON_VARIANT_MAP[config.variant ?? 'primary'];
  return `
<div class="${gridSpanClass(config)} flex items-end">
  <button hlmBtn type="button" variant="${variant}" (click)="${config.handler}()">${config.label}</button>
</div>`;
}
