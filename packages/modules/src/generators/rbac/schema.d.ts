export interface RbacGeneratorSchema {
  /** Print a one-line self-description and exit without writing anything. */
  list?: boolean;
  /**
   * Where the admin pages mount: '<routePrefix>/permissions',
   * '<routePrefix>/roles'. Default 'admin'. 'forbidden' is always mounted at
   * the fixed top-level '/forbidden' regardless of this value.
   */
  routePrefix?: string;
}
