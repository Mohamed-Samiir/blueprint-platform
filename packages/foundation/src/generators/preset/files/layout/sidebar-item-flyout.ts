import { Directive, OnDestroy, inject } from '@angular/core';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { HlmSidebarService } from '@blueprint-platform/ui/sidebar';

/**
 * App-side hover bridge for a collapsed sidebar item's dropdown flyout (M4).
 *
 * Composition only — it drives the `CdkMenuTrigger` that already sits behind
 * spartan's `hlmDropdownMenuTrigger` (via that directive's `hostDirectives`) and
 * never touches `src/app/ui/**`. Put it on the same element as
 * `hlmDropdownMenuTrigger`.
 *
 * It is a no-op unless the sidebar is collapsed to icons on desktop; in every
 * other state the dropdown keeps its stock click-to-open behaviour.
 */
@Directive({
  selector: '[appSidebarItemFlyout]',
  host: {
    '(mouseenter)': 'onEnter()',
    '(mouseleave)': 'onLeave()',
  },
})
export class SidebarItemFlyout implements OnDestroy {
  private readonly _trigger = inject(CdkMenuTrigger);
  private readonly _sidebar = inject(HlmSidebarService);

  private _closeTimer: ReturnType<typeof setTimeout> | null = null;
  private _menuEl: HTMLElement | null = null;
  private readonly _cancelClose = () => this._clearTimer();
  private readonly _scheduleClose = () => this._deferClose();

  private get _collapsed(): boolean {
    return this._sidebar.state() === 'collapsed' && !this._sidebar.isMobile();
  }

  protected onEnter(): void {
    if (!this._collapsed) return;
    this._clearTimer();
    if (this._trigger.isOpen()) return;
    this._trigger.open();
    // The overlay panel renders next tick; bridge hover onto it so moving the
    // pointer from the icon into the panel does not trigger a close.
    setTimeout(() => {
      this._menuEl = this._trigger.getMenu()?.nativeElement ?? null;
      this._menuEl?.addEventListener('mouseenter', this._cancelClose);
      this._menuEl?.addEventListener('mouseleave', this._scheduleClose);
    });
  }

  protected onLeave(): void {
    if (!this._collapsed) return;
    this._deferClose();
  }

  private _deferClose(): void {
    this._clearTimer();
    this._closeTimer = setTimeout(() => {
      if (this._trigger.isOpen()) this._trigger.close();
      this._detachMenu();
    }, 150);
  }

  private _clearTimer(): void {
    if (this._closeTimer !== null) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
  }

  private _detachMenu(): void {
    this._menuEl?.removeEventListener('mouseenter', this._cancelClose);
    this._menuEl?.removeEventListener('mouseleave', this._scheduleClose);
    this._menuEl = null;
  }

  ngOnDestroy(): void {
    this._clearTimer();
    this._detachMenu();
  }
}
