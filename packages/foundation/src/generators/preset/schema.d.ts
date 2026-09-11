export interface PresetGeneratorSchema {
  name: string;
  palette?: string;
  rtl?: boolean;
  labelPosition?: 'floating' | 'inline' | 'top';
  layout?:
    | 'sidebar-shell'
    | 'floating-shell'
    | 'inset-shell'
    | 'topbar-shell'
    | 'none';
  showThemeSwitcher?: boolean;
  showLanguageSwitcher?: boolean;
  /** Language codes to scaffold i18n for (must exist in LANGUAGE_REGISTRY); first is the default. */
  languages?: string[];
  /** API origin only (scheme + host + port, no path). */
  apiUrl?: string;
  appVersion?: string;
}
