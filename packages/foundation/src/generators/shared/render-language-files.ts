import { LANGUAGE_REGISTRY } from '../preset/lib/language-registry';

/**
 * The generated project's `core/language/language-registry.ts` — rendered from
 * the generator's canonical {@link LANGUAGE_REGISTRY} so the two never drift.
 * Ships the full registry (all known codes); `available-languages.ts` holds the
 * per-project subset. Shared by `preset.ts` (real `languages` option) and
 * `layout.ts` (no such option — falls back to the schema default).
 */
export function renderLanguageRegistryModule(): string {
  const entries = Object.values(LANGUAGE_REGISTRY)
    .map(
      (d) => `  ${d.code}: { code: '${d.code}', label: '${d.label}', dir: '${d.dir}' },`,
    )
    .join('\n');
  return `export interface LanguageDefinition {
  code: string;
  label: string;
  dir: 'ltr' | 'rtl';
}

/**
 * Known language codes -> metadata. Direction follows the language: add an entry
 * here rather than a per-language conditional elsewhere, and every consumer
 * (LanguageService, language-switcher) picks it up. Anything not 'rtl' is 'ltr'.
 */
export const LANGUAGE_REGISTRY: Record<string, LanguageDefinition> = {
${entries}
};
`;
}

/** The generated project's `core/language/available-languages.ts`. */
export function renderAvailableLanguagesModule(codes: string[]): string {
  const literal = codes.map((c) => `'${c}'`).join(', ');
  return `import { LANGUAGE_REGISTRY, type LanguageDefinition } from './language-registry';

/** Languages this project was generated with (the \`languages\` preset option). */
export const AVAILABLE_LANGUAGE_CODES = [${literal}] as const;

export const AVAILABLE_LANGUAGES: LanguageDefinition[] =
  AVAILABLE_LANGUAGE_CODES.map((code) => LANGUAGE_REGISTRY[code]);

/** First requested language — the initial choice and the ngx-translate fallback. */
export const DEFAULT_LANGUAGE: string = AVAILABLE_LANGUAGE_CODES[0];
`;
}
