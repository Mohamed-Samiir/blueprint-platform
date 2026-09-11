import {
  DOCUMENT,
  EventEmitter,
  Injectable,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import type { Direction, Directionality } from '@angular/cdk/bidi';
import { TranslateService } from '@ngx-translate/core';
import { LANGUAGE_REGISTRY } from './language-registry';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from './available-languages';

const LANG_KEY = 'bp-language';

/**
 * Multi-language runtime state, generalized for N languages.
 *
 * - `available` is the set this project was generated with (`languages` option).
 * - `current` is the active code; `direction` is looked up from
 *   {@link LANGUAGE_REGISTRY} on every change — never a hardcoded "is it Arabic"
 *   check, so any future registry language gets correct `dir` for free.
 * - drives `ngx-translate` (`translate.use`) and the `<html>` `lang` / `dir`
 *   attributes together, and persists the choice to `localStorage`.
 *
 * Also stands in as the app's CDK {@link Directionality} (wired in
 * `app.config.ts` via `{ provide: Directionality, useExisting: LanguageService }`)
 * — CDK's own `Directionality` samples document direction once at construction
 * and never updates, so without this every overlay opened after a language
 * switch would be stamped with a stale `dir`.
 *
 * This is the translate-augmented variant — written over the base
 * `language.service.ts` only when `showLanguageSwitcher` is true (see
 * `preset.ts`). The base variant behaves identically minus the `ngx-translate`
 * wiring, since layout shells need `LanguageService` for direction regardless
 * of whether translation is enabled.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService
  implements Pick<Directionality, 'value' | 'change'>
{
  private readonly _root = inject(DOCUMENT).documentElement;
  private readonly _translate = inject(TranslateService);

  /** Languages this project was generated with. */
  readonly available = AVAILABLE_LANGUAGES;

  private readonly _code = signal<string>(this._initialCode());
  /** Active language code. */
  readonly current = this._code.asReadonly();
  /** Active text direction — from the registry, for whatever the current code is. */
  readonly dir = computed<Direction>(
    () => (LANGUAGE_REGISTRY[this._code()] ?? LANGUAGE_REGISTRY[DEFAULT_LANGUAGE]).dir,
  );

  /** CDK `Directionality` contract. */
  get value(): Direction {
    return this.dir();
  }
  readonly change = new EventEmitter<Direction>();
  private _lastDir: Direction | null = null;

  constructor() {
    this._translate.addLangs(this.available.map((l) => l.code));
    this._translate.setFallbackLang(DEFAULT_LANGUAGE);

    effect(() => {
      const def =
        LANGUAGE_REGISTRY[this._code()] ?? LANGUAGE_REGISTRY[DEFAULT_LANGUAGE];
      this._root.setAttribute('lang', def.code);
      this._root.setAttribute('dir', def.dir);
      this._translate.use(def.code);
      if (def.dir !== this._lastDir) {
        this._lastDir = def.dir;
        this.change.emit(def.dir);
      }
    });
  }

  setLanguage(code: string): void {
    if (!(code in LANGUAGE_REGISTRY)) return;
    this._code.set(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* storage unavailable — no-op */
    }
  }

  private _initialCode(): string {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && this.available.some((l) => l.code === saved)) return saved;
    } catch {
      /* storage unavailable — fall through */
    }
    return DEFAULT_LANGUAGE;
  }
}
