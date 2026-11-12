/**
 * Two deliberately separate lookups — they answer different questions and
 * must not be merged.
 */

/** What text to show — keyed by OUR declarative config key (`minLength`, `minDate`, …). */
export const DEFAULT_VALIDATOR_MESSAGES: Record<string, (label: string, value?: unknown) => string> = {
  required: (label) => `${label} is required.`,
  minLength: (label, value) => `${label} must be at least ${value} characters.`,
  maxLength: (label, value) => `${label} must be at most ${value} characters.`,
  pattern: (label) => `${label} format is invalid.`,
  email: (label) => `${label} must be a valid email address.`,
  min: (label, value) => `${label} must be at least ${value}.`,
  max: (label, value) => `${label} must be at most ${value}.`,
  minDate: (label, value) => `${label} must be on or after ${value}.`,
  maxDate: (label, value) => `${label} must be on or before ${value}.`,
  minRangeDays: (label, value) => `${label} range must be at least ${value} day(s).`,
  maxRangeDays: (label, value) => `${label} range must be at most ${value} day(s).`,
  minSelected: (label, value) => `Select at least ${value} for ${label}.`,
  maxSelected: (label, value) => `Select at most ${value} for ${label}.`,
  requiredTrue: (label) => `${label} must be checked.`,
  maxFileSizeMb: (label, value) => `${label} file must be smaller than ${value} MB.`,
  allowedExtensions: (label, value) => `${label} allowed file types: ${(value as string[]).join(', ')}.`,
  maxFiles: (label, value) => `${label} allows at most ${value} file(s).`,
};

/**
 * What string `<hlm-field-error validator="…">` actually matches
 * (`validator in control.errors`) — Angular's built-ins don't emit keys
 * matching our camelCase config: `Validators.minLength` sets `minlength`
 * (all lowercase), and `Validators.requiredTrue` sets `required` (the same
 * key `Validators.required` uses — a real Angular quirk, not a typo). Getting
 * this wrong means the error silently never shows. Our own custom validators
 * (`custom-validators.ts.template`) return errors under their own key, so
 * those map to themselves 1:1.
 */
export const VALIDATOR_ERROR_KEY_MAP: Record<string, string> = {
  required: 'required',
  minLength: 'minlength',
  maxLength: 'maxlength',
  pattern: 'pattern',
  email: 'email',
  min: 'min',
  max: 'max',
  requiredTrue: 'required',
  minDate: 'minDate',
  maxDate: 'maxDate',
  minRangeDays: 'minRangeDays',
  maxRangeDays: 'maxRangeDays',
  minSelected: 'minSelected',
  maxSelected: 'maxSelected',
  maxFileSizeMb: 'maxFileSizeMb',
  allowedExtensions: 'allowedExtensions',
  maxFiles: 'maxFiles',
};

/** Validator keys backed by an Angular `Validators.*` built-in — everything else needs `custom-validators`. */
export const BUILT_IN_VALIDATOR_KEYS: ReadonlySet<string> = new Set([
  'required',
  'minLength',
  'maxLength',
  'pattern',
  'email',
  'min',
  'max',
  'requiredTrue',
]);
