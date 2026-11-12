import { ControlFieldEntry } from './field-model.types';
import { normalizeValidators } from './normalize-validator';
import { DEFAULT_VALIDATOR_MESSAGES, VALIDATOR_ERROR_KEY_MAP } from './validator-messages';

/** Escapes text destined for an Angular template: `{{ }}` would otherwise interpolate, `<` would open a tag. */
export function escapeTemplateText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

/**
 * The whole `errorHtml` for one control field: one `<hlm-field-error>` per
 * *active* validator, in authored order — a `textInput` with only `required`
 * gets exactly one, not five. `''` when the field has no validators, so a
 * validator-free field carries no leftover markup at all.
 *
 * `hlm-field-error` reads its control ambiently (`BrnField` from the
 * enclosing `hlm-field`) and manages its own show/hide, so this deliberately
 * emits no `@if`/`.hasError()` — it only says which validator each element is
 * for. The `validator` attribute is the **runtime** error key
 * (`VALIDATOR_ERROR_KEY_MAP`), not our config key: `minLength` → `minlength`.
 */
export function buildFieldErrorHtml(entry: ControlFieldEntry): string {
  return normalizeValidators(entry.validators)
    .map(({ key, value, message }) => {
      const text = escapeTemplateText(message ?? DEFAULT_VALIDATOR_MESSAGES[key](entry.label, value));
      return `<hlm-field-error validator="${VALIDATOR_ERROR_KEY_MAP[key]}">
  <ng-icon name="lucideCircleAlert" class="me-1 inline size-3.5 align-text-bottom" />
  ${text}
</hlm-field-error>`;
    })
    .join('\n');
}
