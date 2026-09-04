import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmSwitchImports } from '@blueprint-platform/ui/switch';
import { ThemeService } from '../../../core/theme/theme.service';

/**
 * Light/dark toggle, wrapping spartan's `hlm-switch` primitive. Pure and
 * reusable — it does not decide whether it should render (the call site gates
 * visibility via `BLUEPRINT_CONFIG.showThemeSwitcher`). Reads/writes the shared
 * `ThemeService`, which owns the `dark` class on `<html>` and its persistence.
 */
@Component({
  selector: 'app-theme-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmSwitchImports],
  template: `
    <div class="flex items-center gap-2 text-sm">
      <span>Dark mode</span>
      <hlm-switch
        class="ms-auto"
        [checked]="theme.dark()"
        (checkedChange)="theme.setDark($event)"
        aria-label="Toggle dark mode"
      />
    </div>
  `,
})
export class ThemeSwitcher {
  protected readonly theme = inject(ThemeService);
}
