import { ControlFieldEntry } from './field-model.types';
import { NormalizedValidator, normalizeValidators } from './normalize-validator';
import { BUILT_IN_VALIDATOR_KEYS } from './validator-messages';

/** Custom-validator factory each non-built-in key maps to (exported by `custom-validators.ts.template`). */
const CUSTOM_VALIDATOR_FN: Record<string, string> = {
  minDate: 'minDateValidator',
  maxDate: 'maxDateValidator',
  minRangeDays: 'minRangeDaysValidator',
  maxRangeDays: 'maxRangeDaysValidator',
  minSelected: 'minSelectedValidator',
  maxSelected: 'maxSelectedValidator',
  maxFileSizeMb: 'maxFileSizeValidator',
  allowedExtensions: 'allowedExtensionsValidator',
  maxFiles: 'maxFilesValidator',
};

/** The generated-source text of one validator call. */
function buildSingleValidatorExpression({ key, value }: NormalizedValidator): string {
  switch (key) {
    case 'required':
      return 'Validators.required';
    case 'requiredTrue':
      return 'Validators.requiredTrue';
    case 'email':
      return 'Validators.email';
    case 'minLength':
    case 'maxLength':
    case 'min':
    case 'max':
      return `Validators.${key}(${JSON.stringify(value)})`;
    case 'pattern':
      return `Validators.pattern(${JSON.stringify(value)})`;
    default:
      return `${CUSTOM_VALIDATOR_FN[key]}(${JSON.stringify(value)})`;
  }
}

export interface ControlValidators {
  /**
   * Source text for the control's validators tuple element: a **bare** call
   * for exactly one validator, an array for more, `null` for none (so the
   * control is a one-element `[default]` tuple — never a trailing `[]`).
   */
  expression: string | null;
  usesBuiltIn: boolean;
  /** Distinct `custom-validators` factory names this control calls. */
  customFns: string[];
}

export function buildControlValidators(entry: ControlFieldEntry): ControlValidators {
  const validators = normalizeValidators(entry.validators);
  if (validators.length === 0) return { expression: null, usesBuiltIn: false, customFns: [] };

  const expressions = validators.map(buildSingleValidatorExpression);
  return {
    expression: expressions.length === 1 ? expressions[0] : `[${expressions.join(', ')}]`,
    usesBuiltIn: validators.some((v) => BUILT_IN_VALIDATOR_KEYS.has(v.key)),
    customFns: [...new Set(validators.filter((v) => !BUILT_IN_VALIDATOR_KEYS.has(v.key)).map((v) => CUSTOM_VALIDATOR_FN[v.key]))],
  };
}
