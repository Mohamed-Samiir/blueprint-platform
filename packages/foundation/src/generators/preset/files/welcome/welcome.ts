import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBoxes, lucideLayers, lucidePuzzle } from '@ng-icons/lucide';
import { HlmCardImports } from '@blueprint-platform/ui/card';

interface Pillar {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

/**
 * Generator-only starter screen — replaces the stock `@nx/angular` welcome
 * component. With `layout: 'none'` it is rendered directly by `app.ts`; with a
 * layout it is the index route inside the shell's main content.
 *
 * Synced from `blueprint-reference`'s `src/app/welcome/` (logo + exactly
 * three pillar cards — Foundation / Components / Modules; `templates` was
 * dropped as a pillar and `generator-kit` is internal-only, so neither gets a
 * card). The headline is the one platform-only deviation from the reference
 * copy — EJS `<%= name %>` personalizes it to the generated project's own
 * name, since a real generated app isn't itself called "Blueprint".
 */
@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, HlmCardImports],
  providers: [provideIcons({ lucideLayers, lucidePuzzle, lucideBoxes })],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome {
  protected readonly pillars: readonly Pillar[] = [
    {
      icon: 'lucideLayers',
      title: 'Foundation',
      description: 'Base architecture, theming, layouts, and zoneless signals.',
    },
    {
      icon: 'lucidePuzzle',
      title: 'Components',
      description: 'Advanced, on-demand UI components ready to compose.',
    },
    {
      icon: 'lucideBoxes',
      title: 'Modules',
      description: 'Ready-made business features: auth, RBAC, user management.',
    },
  ];
}
