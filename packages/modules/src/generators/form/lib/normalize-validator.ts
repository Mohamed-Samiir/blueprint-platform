/** Keys whose bare value is a flag/custom-message (`true`, `false`, or `'message text'`), not a bound. */
const FLAG_KEYS: ReadonlySet<string> = new Set(['required', 'requiredTrue', 'email']);

export interface NormalizedValidator {
  key: string;
  value: unknown;
  /** A developer-supplied message; `undefined` means "use the default". */
  message?: string;
}

/**
 * Turns one raw `validators` entry into a uniform shape, or `null` when it's
 * disabled (`required: false`). Three accepted shapes:
 * - flag keys (`required`, `requiredTrue`, `email`): `true`, `false`, or a
 *   string that is the custom message;
 * - value keys (`min`, `minLength`, `pattern`, …): a bare value;
 * - value keys with a message: `{ value, message? }`.
 */
export function normalizeValidator(key: string, config: unknown): NormalizedValidator | null {
  if (FLAG_KEYS.has(key)) {
    if (config === false) return null;
    if (typeof config === 'string') return { key, value: true, message: config };
    return { key, value: true };
  }
  if (typeof config === 'object' && config !== null && !Array.isArray(config) && 'value' in config) {
    const { value, message } = config as { value: unknown; message?: string };
    return { key, value, message };
  }
  return { key, value: config };
}

/** Every enabled validator for an entry's `validators` object, in authored order. */
export function normalizeValidators(validators: object | undefined): NormalizedValidator[] {
  if (!validators) return [];
  return Object.entries(validators)
    .map(([key, config]) => normalizeValidator(key, config))
    .filter((v): v is NormalizedValidator => v !== null);
}
