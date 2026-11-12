export interface FormGeneratorSchema {
  /** The form's name — drives `<name>.html`/`<name>.ts`/`<name>.scss` and the component class/selector (`selector: app-<name>`). */
  name: string;
  /** Path to the `bp.models/<model-name>.ts` file, relative to the generated project's root. */
  model: string;
  /**
   * Destination directory for the generated component, relative to
   * `src/app/` — NOT a filename; the component's own `<name>/` subfolder is
   * appended automatically. Default: `features/forms`.
   */
  directory?: string;
}
