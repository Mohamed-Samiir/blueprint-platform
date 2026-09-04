import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { LanguageService } from '../../../core/language/language.service';

/**
 * English / العربية toggle. Direction only — flips `dir` on `<html>` via
 * `LanguageService`; it does not translate UI text (that is a separate, larger
 * i18n concern). Pure and reusable — visibility is gated by the call site
 * (`BLUEPRINT_CONFIG.showLanguageSwitcher`), not here.
 */
@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports],
  template: `
    <div class="flex items-center gap-2 text-sm">
      <span>Language</span>
      <button
        hlmBtn
        variant="outline"
        size="sm"
        type="button"
        class="ms-auto"
        (click)="lang.toggle()"
        [attr.aria-label]="
          'Switch language, currently ' + (lang.language() === 'ar' ? 'Arabic' : 'English')
        "
      >
        {{ lang.language() === 'ar' ? 'العربية' : 'English' }}
      </button>
    </div>
  `,
})
export class LanguageSwitcher {
  protected readonly lang = inject(LanguageService);
}
