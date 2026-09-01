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
}
