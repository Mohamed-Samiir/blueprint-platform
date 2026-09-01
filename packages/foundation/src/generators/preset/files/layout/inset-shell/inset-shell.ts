import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Directionality } from '@angular/cdk/bidi';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeCheck,
  lucideBell,
  lucideBookOpen,
  lucideChevronDown,
  lucideChevronRight,
  lucideChevronsUpDown,
  lucideChartPie,
  lucideCreditCard,
  lucideEllipsis,
  lucideFrame,
  lucideHouse,
  lucideInbox,
  lucideLifeBuoy,
  lucideLogOut,
  lucideMap,
  lucidePlus,
  lucideSend,
  lucideSquareTerminal,
} from '@ng-icons/lucide';
import { HlmSidebarImports } from '@blueprint-platform/ui/sidebar';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmAvatarImports } from '@blueprint-platform/ui/avatar';
import { HlmCollapsibleImports } from '@blueprint-platform/ui/collapsible';

/**
 * Layout shell for spartan sidebar `variant="inset"` (the content pane is inset
 * as a rounded, shadowed card floating on the `--sidebar` coloured gutter).
 * Deliberately a standalone copy — no shared base class with the sidebar /
 * floating shells.
 */
@Component({
  selector: 'app-inset-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NgIcon,
    HlmSidebarImports,
    HlmDropdownMenuImports,
    HlmAvatarImports,
    HlmCollapsibleImports,
  ],
  providers: [
    provideIcons({
      lucideHouse,
      lucideInbox,
      lucideSend,
      lucideFrame,
      lucideChartPie,
      lucideMap,
      lucideLifeBuoy,
      lucideEllipsis,
      lucidePlus,
      lucideBookOpen,
      lucideSquareTerminal,
      lucideChevronDown,
      lucideChevronRight,
      lucideChevronsUpDown,
      lucideBadgeCheck,
      lucideCreditCard,
      lucideBell,
      lucideLogOut,
    }),
  ],
  templateUrl: './inset-shell.html',
  styleUrl: './inset-shell.scss',
})
export class InsetShell {
  private readonly _dir = inject(Directionality);
  /** spartan's `side` is a physical anchor and does not auto-flip under RTL. */
  protected readonly direction = toSignal(this._dir.change, { initialValue: this._dir.value });
  protected readonly side = computed<'left' | 'right'>(() =>
    this.direction() === 'rtl' ? 'right' : 'left',
  );

  protected readonly user = { name: 'Dev User', email: 'dev@local', initials: 'DU' };

  protected readonly projects = [
    { name: 'Design Engineering', icon: 'lucideFrame', info: 24 },
    { name: 'Sales & Marketing', icon: 'lucideChartPie', info: 12 },
    { name: 'Travel', icon: 'lucideMap', info: 3 },
  ];

  protected readonly docs = [
    { title: 'Getting Started', open: true, items: ['Installation', 'Project Structure'] },
    {
      title: 'Building Your Application',
      open: false,
      items: ['Routing', 'Data Fetching', 'Rendering', 'Caching'],
    },
    { title: 'API Reference', open: false, items: ['Components', 'File Conventions', 'Functions'] },
  ];

  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  protected onGroupAction(): void {
    console.info('inset-shell: sidebar group action clicked');
  }
}
