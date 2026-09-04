export interface UiGeneratorSchema {
  /** Component name(s) — comma or space separated. Ignored when `all` is true. */
  components?: string;
  /** Add every available UI component not already in the project. */
  all?: boolean;
  /** Project root to add components into. */
  project?: string;
  /** Skip Prettier. */
  skipFormat?: boolean;
  /** Skip installing newly added npm dependencies. */
  skipInstall?: boolean;
}
