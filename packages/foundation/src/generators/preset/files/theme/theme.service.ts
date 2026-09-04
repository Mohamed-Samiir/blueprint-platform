import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

const DARK_KEY = 'bp-theme-dark';
const BRAND_X_KEY = 'bp-theme-brand-x';

/**
 * Single source of truth for the two theme class toggles on `<html>`:
 * `dark` (light/dark palette) and `theme-brand-x` (brand override layer).
 *
 * Both the `layout-preview` toolbar and the in-app `<app-theme-switcher>` drive
 * this one service, so there is never a competing writer on the document class
 * list. State is read from `localStorage` (falling back to whatever class is
 * already on `<html>`, e.g. set by a previous session) and re-persisted on every
 * change.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _root = inject(DOCUMENT).documentElement;

  readonly dark = signal(this._readBool(DARK_KEY, this._root.classList.contains('dark')));
  readonly brandX = signal(
    this._readBool(BRAND_X_KEY, this._root.classList.contains('theme-brand-x')),
  );

  constructor() {
    // Apply persisted state synchronously so the first paint is correct when the
    // service is instantiated from an app initializer.
    this._apply();
    effect(() => {
      this.dark();
      this.brandX();
      this._apply();
    });
  }

  setDark(value: boolean): void {
    this.dark.set(value);
  }

  toggleDark(): void {
    this.dark.update((v) => !v);
  }

  setBrandX(value: boolean): void {
    this.brandX.set(value);
  }

  toggleBrandX(): void {
    this.brandX.update((v) => !v);
  }

  private _apply(): void {
    this._root.classList.toggle('dark', this.dark());
    this._root.classList.toggle('theme-brand-x', this.brandX());
    this._write(DARK_KEY, this.dark());
    this._write(BRAND_X_KEY, this.brandX());
  }

  private _readBool(key: string, fallback: boolean): boolean {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return raw === '1';
    } catch {
      /* storage unavailable — use fallback */
    }
    return fallback;
  }

  private _write(key: string, value: boolean): void {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      /* storage unavailable — no-op */
    }
  }
}
