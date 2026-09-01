import { Directive } from '@angular/core';
import { classes } from '@blueprint-platform/ui/utils';

@Directive({
  selector: '[hlmSidebarContent],hlm-sidebar-content',
  host: {
    'data-slot': 'sidebar-content',
    'data-sidebar': 'content',
  },
})
export class HlmSidebarContent {
  constructor() {
    classes(
      () =>
        'no-scrollbar gap-0 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto group-data-[collapsible=icon]:overflow-hidden',
    );
  }
}
