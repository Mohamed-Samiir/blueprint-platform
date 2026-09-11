import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmCardImports } from '@blueprint-platform/ui/card';

/**
 * Two-pane auth layout: a full-height brand panel beside the form area. The form
 * is a child route rendered into `<router-outlet />` — the layout never knows
 * which form it is showing.
 *
 * Responsive across the whole range — the panes are `flex`, the brand panel is
 * `hidden md:flex` (so below `md` the form pane is the whole viewport) and grows
 * `md:w-1/2 lg:w-3/5`; the form pane is `min-w-0` and scrolls vertically when
 * the viewport is short. Tailwind breakpoints only, tokens only.
 */
@Component({
  selector: 'app-auth-split',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HlmCardImports],
  templateUrl: './auth-split.html',
  styleUrl: './auth-split.scss',
})
export class AuthSplit {
  protected readonly brand = 'Blueprint';
  protected readonly tagline = 'Build once. Ship everywhere.';
  protected readonly subtitle = 'The reference platform for internal tools.';
  protected readonly year = new Date().getFullYear();
}
