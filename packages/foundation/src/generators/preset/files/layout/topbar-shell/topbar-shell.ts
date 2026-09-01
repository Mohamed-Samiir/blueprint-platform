import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeCheck,
  lucideBell,
  lucideBookOpen,
  lucideChartBar,
  lucideChartPie,
  lucideCheck,
  lucideChevronDown,
  lucideChevronRight,
  lucideChevronsUpDown,
  lucideCreditCard,
  lucideEllipsis,
  lucideFolder,
  lucideFrame,
  lucideHouse,
  lucideInbox,
  lucideLanguages,
  lucideLayoutDashboard,
  lucideLifeBuoy,
  lucideLogOut,
  lucideMap,
  lucidePalette,
  lucidePlus,
  lucideSend,
  lucideSettings,
  lucideSquareTerminal,
  lucideSun,
} from '@ng-icons/lucide';
import { HlmSidebarImports } from '@blueprint-platform/ui/sidebar';
import { HlmDropdownMenuImports } from '@blueprint-platform/ui/dropdown-menu';
import { HlmAvatarImports } from '@blueprint-platform/ui/avatar';
import { HlmCollapsibleImports } from '@blueprint-platform/ui/collapsible';
import { HlmButtonImports } from '@blueprint-platform/ui/button';
import { SidebarItemFlyout } from '../sidebar-item-flyout';

interface NavItem {
  label: string;
  icon: string;
  active?: boolean;
  children?: { label: string }[];
}

type Lang = 'en' | 'ar';

/**
 * Fourth layout shell: spartan sidebar `variant="sidebar"` (icon-collapsible,
 * like `sidebar-shell`) plus a **top bar** inside the content pane.
 *
 * The top bar owns sidebar collapse (`hlmSidebarTrigger`), palette switching and
 * language/direction switching. This shell is self-contained: `dir` and the
 * `theme-brand-x` class are its own signals applied to its own
 * `hlm-sidebar-wrapper`, so it does not depend on the `layout-preview` toolbar
 * (on `/layout-preview/topbar` the top bar is authoritative — the toolbar's
 * RTL/palette toggles are redundant there). No real i18n: switching language
 * only flips `dir` and the button label.
 *
 * Deliberately a standalone copy — no shared base class with the other shells.
 */
@Component({
  selector: 'app-topbar-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NgIcon,
    HlmSidebarImports,
    HlmDropdownMenuImports,
    HlmAvatarImports,
    HlmCollapsibleImports,
    HlmButtonImports,
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
      lucideLanguages,
      lucidePalette,
      lucideSun,
      lucideCheck,
    }),
  ],
  templateUrl: './topbar-shell.html',
  styleUrl: './topbar-shell.scss',
})
export class TopbarShell {
  /** Shell-owned direction — the top bar's language switch drives this. */
  protected readonly lang = signal<Lang>('en');
  protected readonly dir = computed<'ltr' | 'rtl'>(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  /** spartan's `side` is a physical anchor and does not auto-flip under RTL. */
  protected readonly side = computed<'left' | 'right'>(() =>
    this.dir() === 'rtl' ? 'right' : 'left',
  );

  /** Shell-owned palette — the top bar's theme switch toggles the class. */
  protected readonly brandX = signal(false);

  protected setLang(lang: Lang): void {
    this.lang.set(lang);
  }

  protected toggleTheme(): void {
    this.brandX.update((v) => !v);
  }

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
    console.info('topbar-shell: sidebar group action clicked');
  }
}
