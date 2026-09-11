import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { LanguageService } from '../../../core/language/language.service';

/**
 * Language picker — one item per language this project was generated with
 * (`LanguageService.available`). Selecting one switches `ngx-translate` and,
 * via the language registry, the document direction. Visibility is gated by the
 * call site (`BLUEPRINT_CONFIG.showLanguageSwitcher`), not here.
 */
@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, HlmDropdownMenuImports],
  template: `
    <div class="flex items-center gap-2 text-sm">
      <span>Language</span>
      <button
        hlmBtn
        variant="outline"
        size="sm"
        type="button"
        class="ms-auto"
        [hlmDropdownMenuTrigger]="menu"
      >
        {{ currentLabel() }}
      </button>
      <ng-template #menu>
        <hlm-dropdown-menu class="w-44">
          @for (lang of languageService.available; track lang.code) {
            <button
              hlmDropdownMenuItem
              (click)="languageService.setLanguage(lang.code)"
            >
              {{ lang.label }}
            </button>
          }
        </hlm-dropdown-menu>
      </ng-template>
    </div>
  `,
})
export class LanguageSwitcher {
  protected readonly languageService = inject(LanguageService);
  protected readonly currentLabel = computed(
    () =>
      this.languageService.available.find(
        (l) => l.code === this.languageService.current(),
      )?.label ?? '',
  );
}
