export interface UserManagementGeneratorSchema {
  /**
   * Where the users list mounts: '<routePrefix>' (the list itself),
   * '<routePrefix>/new', '<routePrefix>/:id/edit'. Default 'admin/users'.
   */
  routePrefix?: string;
}
