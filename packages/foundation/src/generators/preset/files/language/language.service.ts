import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type AppLanguage = 'en' | 'ar';

const LANG_KEY = 'bp-language';

/**
 * Direction + current-language signal. **Scope: direction only** — this is not a
 * translation/i18n content system. Selecting `ar` sets `dir="rtl"` (and `lang`)
 * on `<html>`; it does not translate any UI text yet. A future i18n layer reads
 * `language()` from here.
 *
 * A signal-backed root service (not component-local state) so the switcher and
 * any later consumer share one value. Persisted to `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _root = inject(DOCUMENT).documentElement;

  readonly language = signal<AppLanguage>(this._read());
  readonly dir = computed<'ltr' | 'rtl'>(() => (this.language() === 'ar' ? 'rtl' : 'ltr'));

  constructor() {
    this._apply();
    effect(() => {
      this.language();
      this._apply();
    });
  }

  set(language: AppLanguage): void {
    this.language.set(language);
  }

  toggle(): void {
    this.language.update((l) => (l === 'en' ? 'ar' : 'en'));
  }

  private _apply(): void {
    const language = this.language();
    this._root.setAttribute('lang', language);
    this._root.setAttribute('dir', this.dir());
    try {
      localStorage.setItem(LANG_KEY, language);
    } catch {
      /* storage unavailable — no-op */
    }
  }

  private _read(): AppLanguage {
    try {
      const raw = localStorage.getItem(LANG_KEY);
      if (raw === 'ar' || raw === 'en') return raw;
    } catch {
      /* storage unavailable — fall through */
    }
    return this._root.getAttribute('dir') === 'rtl' ? 'ar' : 'en';
  }
}
