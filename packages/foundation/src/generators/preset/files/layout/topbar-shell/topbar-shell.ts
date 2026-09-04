import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen,
  lucideChartBar,
  lucideChartPie,
  lucideChevronDown,
  lucideChevronRight,
  lucideEllipsis,
  lucideFolder,
  lucideFrame,
  lucideHouse,
  lucideInbox,
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideMap,
  lucidePlus,
  lucideSend,
  lucideSettings,
  lucideSquareTerminal,
} from '@ng-icons/lucide';
import { HlmSidebarImports, HlmSidebarService } from '@blueprint-platform/ui/sidebar';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmCollapsibleImports } from '@blueprint-platform/ui/collapsible';
import { SidebarItemFlyout } from '../sidebar-item-flyout';
import { UserMenu } from '../../shared/ui/user-menu/user-menu';
import { LanguageService } from '../../core/language/language.service';

interface NavItem {
  label: string;
  icon: string;
  active?: boolean;
  children?: { label: string }[];
}

/**
 * Fourth layout shell: spartan sidebar `variant="sidebar"` (icon-collapsible,
 * like `sidebar-shell`) plus a **top bar** inside the content pane.
 *
 * The top bar hosts the sidebar collapse trigger and the shared `<app-user-menu>`
 * (which carries the theme + language switchers). Direction and palette are
 * global (`<html>`, via `ThemeService` / `LanguageService`) — this shell no
 * longer owns that state itself. Deliberately a standalone copy — no shared base
 * class with the other shells.
 */
@Component({
  selector: 'app-topbar-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NgIcon,
    HlmSidebarImports,
    HlmDropdownMenuImports,
    HlmCollapsibleImports,
    SidebarItemFlyout,
    UserMenu,
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
    }),
  ],
  templateUrl: './topbar-shell.html',
  styleUrl: './topbar-shell.scss',
})
export class TopbarShell {
  private readonly _lang = inject(LanguageService);
  /** spartan's `side` is a physical anchor and does not auto-flip under RTL. */
  protected readonly side = computed<'left' | 'right'>(() =>
    this._lang.dir() === 'rtl' ? 'right' : 'left',
  );

  /** Read by the template to switch flyout vs. inline rendering (Task 7). */
  protected readonly sidebar = inject(HlmSidebarService);
  protected readonly collapsed = computed(
    () => this.sidebar.state() === 'collapsed' && !this.sidebar.isMobile(),
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
    console.info('topbar-shell: sidebar group action clicked');
  }
}
