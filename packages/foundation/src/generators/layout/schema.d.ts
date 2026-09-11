export interface LayoutGeneratorSchema {
  /** Layout folder name under files/layout/ (e.g. "sidebar-shell"). */
  name: string;
  /**
   * Sweep the project's existing top-level routes under this shell
   * (`wrapRoutesUnderLayout`) and wire the welcome screen as its index route.
   * Default `true` — the four main app shells. Set `false` for a content-only
   * shell that must not become the app's root wrapper (e.g. `modules:auth`'s
   * `auth-split`/`auth-centered`, which wire their own routes separately via
   * `addLayoutBranch`).
   */
  wireRoutes?: boolean;
  /**
   * Add the user-menu/theme-switcher (+ language-switcher) account-menu family.
   * Default `true` — the four main app shells. Set `false` for a shell with no
   * signed-in user yet (e.g. an auth shell).
   */
  withAccountMenu?: boolean;
}
