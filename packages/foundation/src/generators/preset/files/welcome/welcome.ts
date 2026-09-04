import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Generator-only starter screen — replaces the stock `@nx/angular` welcome
 * component. With `layout: 'none'` it is rendered directly by `app.ts`; with a
 * layout it is the index route inside the shell's main content.
 *
 * Styling uses only Tailwind utilities mapped to the spartan CSS variables in
 * `src/styles/tailwind-theme.css`, so it stays on-theme (and dark-mode ready)
 * with zero edits. Safe to delete once you add your own landing page.
 */
@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div
        class="w-full max-w-xl rounded-xl border border-border bg-card p-8 text-card-foreground shadow-sm"
      >
        <div
          class="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          <span class="size-1.5 rounded-full bg-primary"></span>
          Built with Blueprint
        </div>

        <h1 class="text-2xl font-semibold tracking-tight">Welcome to <%= name %></h1>

        <p class="mt-3 text-sm leading-relaxed text-muted-foreground">
          This project was scaffolded with
          <strong class="font-medium text-foreground">Blueprint</strong> — a zoneless,
          signal-driven Angular starter with a headless-first component system, an SCSS +
          Tailwind token theme, and a copy-based UI kit you own outright.
        </p>

        <div class="mt-6 flex flex-wrap gap-2 text-xs">
          @for (tag of tags; track tag) {
            <span class="rounded-md border border-border px-2 py-1 text-muted-foreground">{{
              tag
            }}</span>
          }
        </div>

        <p class="mt-6 text-xs text-muted-foreground">
          Add a UI component any time:
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground"
            >nx g &#64;blueprint-platform/components:ui &lt;name&gt;</code
          >
        </p>
      </div>
    </div>
  `,
})
export class Welcome {
  protected readonly tags = ['Zoneless', 'Signals', 'Standalone', 'spartan/ui + CDK', 'Tailwind v4'];
}
