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
import { LANGUAGE_REGISTRY } from './language-registry';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from './available-languages';

const LANG_KEY = 'bp-language';

/**
 * Direction-tracking runtime state, generalized for N languages. This is the
 * BASE variant — generated whenever a layout is selected, same tier as
 * `ThemeService`, with no `ngx-translate` dependency, because the layout
 * shells inject `LanguageService` unconditionally for their own RTL/LTR side
 * computation. When `showLanguageSwitcher` is also true, `preset.ts` writes
 * the translate-augmented variant (`language.service.translate.ts`) over this
 * file instead — same public shape, plus `ngx-translate` wiring.
 *
 * - `current` is the active code; `dir` is looked up from
 *   {@link LANGUAGE_REGISTRY} on every change — never a hardcoded "is it Arabic"
 *   check, so any future registry language gets correct direction for free.
 * - drives the `<html>` `lang` / `dir` attributes and persists the choice to
 *   `localStorage`.
 *
 * Also stands in as the app's CDK {@link Directionality} (wired in
 * `app.config.ts` via `{ provide: Directionality, useExisting: LanguageService }`
 * whenever this file exists) — CDK's own `Directionality` samples document
 * direction once at construction and never updates, so without this every
 * overlay opened after a direction switch would be stamped with a stale `dir`.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService
  implements Pick<Directionality, 'value' | 'change'>
{
  private readonly _root = inject(DOCUMENT).documentElement;

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
    effect(() => {
      const def =
        LANGUAGE_REGISTRY[this._code()] ?? LANGUAGE_REGISTRY[DEFAULT_LANGUAGE];
      this._root.setAttribute('lang', def.code);
      this._root.setAttribute('dir', def.dir);
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
