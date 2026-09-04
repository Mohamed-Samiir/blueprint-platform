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
 * Layout shell for spartan sidebar `variant="sidebar"` (the default flush,
 * full-height sidebar). Deliberately a standalone copy — no shared base class
 * with the floating / inset shells, so a generated project can edit one freely.
 *
 * Demonstrates `collapsible="icon"`: collapsed, the menu icons stay visible and
 * an item with children opens its content as a dropdown flyout on hover
 * (`SidebarItemFlyout`); expanded, the same item is an inline expandable list.
 */
@Component({
  selector: 'app-sidebar-shell',
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
  templateUrl: './sidebar-shell.html',
  styleUrl: './sidebar-shell.scss',
})
export class SidebarShell {
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
    console.info('sidebar-shell: sidebar group action clicked');
  }
}
