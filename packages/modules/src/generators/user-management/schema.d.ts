export interface UserManagementGeneratorSchema {
  /** Print a one-line self-description and exit without writing anything. */
  list?: boolean;
  /**
   * Where the users list mounts: '<routePrefix>' (the list itself),
   * '<routePrefix>/new', '<routePrefix>/:id/edit'. Default 'admin/users'.
   */
  routePrefix?: string;
}
