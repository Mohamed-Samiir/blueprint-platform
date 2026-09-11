import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmCardImports } from '@blueprint-platform/ui/card';

/**
 * Single centered card. The form is a child route rendered into
 * `<router-outlet />`.
 *
 * Uses the same backgrounds as the split layout — page `bg-background`, the card
 * container (`hlmCard` → `bg-card`), and the fields (spartan `hlmInput` /
 * `hlm-input-group`) all match. Responsive at every width: `px-4 sm:px-6` keeps
 * the card off the edges, the page scrolls vertically when short, the card is
 * `w-full max-w-sm`.
 */
@Component({
  selector: 'app-auth-centered',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, HlmCardImports],
  templateUrl: './auth-centered.html',
  styleUrl: './auth-centered.scss',
})
export class AuthCentered {
  protected readonly brand = 'Blueprint';
  protected readonly year = new Date().getFullYear();
}
