/**
 * Canonical language registry — the generator's compile-time source of truth for
 * which language codes are valid and what direction each one implies.
 *
 * `preset.ts` imports this to validate `--languages` and to render the generated
 * project's own `core/language/language-registry.ts` (identical shape). Direction
 * "follows the language" from here — never a per-language `if (code === 'ar')`
 * check anywhere. Add a code here and every consumer (service, switcher, future
 * languages) picks it up; anything not `'rtl'` is `'ltr'`.
 */
export interface LanguageDefinition {
  code: string;
  label: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGE_REGISTRY: Record<string, LanguageDefinition> = {
  en: { code: 'en', label: 'English', dir: 'ltr' },
  ar: { code: 'ar', label: 'العربية', dir: 'rtl' },
  fr: { code: 'fr', label: 'Français', dir: 'ltr' },
  es: { code: 'es', label: 'Español', dir: 'ltr' },
  de: { code: 'de', label: 'Deutsch', dir: 'ltr' },
  he: { code: 'he', label: 'עברית', dir: 'rtl' },
  fa: { code: 'fa', label: 'فارسی', dir: 'rtl' },
  ur: { code: 'ur', label: 'اردو', dir: 'rtl' },
};
