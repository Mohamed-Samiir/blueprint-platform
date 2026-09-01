import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Directionality } from '@angular/cdk/bidi';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeCheck,
  lucideBell,
  lucideBookOpen,
  lucideChartBar,
  lucideChartPie,
  lucideChevronDown,
  lucideChevronRight,
  lucideChevronsUpDown,
  lucideCreditCard,
  lucideEllipsis,
  lucideFolder,
  lucideFrame,
  lucideHouse,
  lucideInbox,
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideLogOut,
  lucideMap,
  lucidePlus,
  lucideSend,
  lucideSettings,
  lucideSquareTerminal,
} from '@ng-icons/lucide';
import { HlmSidebarImports } from '@blueprint-platform/ui/sidebar';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmAvatarImports } from '@blueprint-platform/ui/avatar';
import { HlmCollapsibleImports } from '@blueprint-platform/ui/collapsible';
import { SidebarItemFlyout } from '../sidebar-item-flyout';

interface NavItem {
  label: string;
  icon: string;
  active?: boolean;
  children?: { label: string }[];
}

/**
 * Layout shell for spartan sidebar `variant="sidebar"` (the default flush,
 * full-height sidebar). Deliberately a standalone copy — no shared base class
 * with the floating / inset shells, so a generated project can edit one freely.
 *
 * This shell also demonstrates `collapsible="icon"` (M4): collapsed, the menu
 * icons stay visible and hovering an item with children opens its content as a
 * dropdown flyout to the side (see `SidebarItemFlyout`).
 */
@Component({
  selector: 'app-sidebar-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NgIcon,
    HlmSidebarImports,
    HlmDropdownMenuImports,
    HlmAvatarImports,
    HlmCollapsibleImports,
    SidebarItemFlyout,
  ],
  providers: [
    provideIcons({
      lucideLayoutDashboard,
      lucideChartBar,
      lucideSettings,
      lucideFolder,
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
  templateUrl: './sidebar-shell.html',
  styleUrl: './sidebar-shell.scss',
})
export class SidebarShell {
  private readonly _dir = inject(Directionality);
  /** spartan's `side` is a physical anchor and does not auto-flip under RTL. */
  protected readonly direction = toSignal(this._dir.change, { initialValue: this._dir.value });
  protected readonly side = computed<'left' | 'right'>(() =>
    this.direction() === 'rtl' ? 'right' : 'left',
  );

  protected readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'lucideLayoutDashboard', active: true },
    {
      label: 'Projects',
      icon: 'lucideFolder',
      children: [
        { label: 'Design Engineering' },
        { label: 'Sales & Marketing' },
        { label: 'Travel' },
      ],
    },
    { label: 'Reports', icon: 'lucideChartBar' },
    { label: 'Settings', icon: 'lucideSettings' },
  ];

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
    console.info('sidebar-shell: sidebar group action clicked');
  }
}
